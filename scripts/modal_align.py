# Modal-воркер НАСТОЯЩЕГО forced alignment: берёт наши ИЗВЕСТНЫЕ слова песни
# и акустически находит, где каждое звучит в клипе (CTC, мультиязычная MMS-модель).
# Каждому слову — реальный якорь, без интерполяции и коллапсов. Романизирует и
# корейский, и английский (ад-либы, "LOVE DIVE") — оба размечаются.
# Аудио качается локально (резид. IP) и передаётся байтами.
#
# Запуск:  modal run scripts/modal_align.py --audio X.m4a --words words.json --lang kor
# Печатает: RESULT_JSON:{"words":[{"kr":"...","t":12.34,"end":12.9}, ...], "duration": ...}
import json
import modal

CACHE = "/cache"
vol = modal.Volume.from_name("stageone-whisper-cache", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "git")
    .pip_install("torch", "torchaudio", "transformers")
    .pip_install("demucs")
    .pip_install("git+https://github.com/MahmoudAshraf97/ctc-forced-aligner.git")
)

app = modal.App("stageone-align")


def isolate_vocals(path, device):
    """Demucs: отделить вокал от инструментала. Возвращает путь к vocals.wav.
    CTC должен слушать ТОЛЬКО голос — бит/инструментал забивают фонемы и мажут синхрон."""
    import os, glob, subprocess
    outdir = "/tmp/sep"
    subprocess.run(
        ["python", "-m", "demucs", "--two-stems=vocals", "-n", "htdemucs",
         "-d", device, "-o", outdir, path],
        check=True,
    )
    hits = glob.glob(os.path.join(outdir, "htdemucs", "*", "vocals.wav"))
    return hits[0] if hits else path


@app.function(image=image, gpu="T4", volumes={CACHE: vol}, timeout=1800)
def align(audio_bytes: bytes, words: list, lang: str = "kor") -> dict:
    import tempfile, os
    import torch
    from ctc_forced_aligner import (
        load_audio, load_alignment_model, generate_emissions,
        preprocess_text, get_alignments, get_spans, postprocess_results,
    )

    os.environ["HF_HOME"] = CACHE
    os.environ["TORCH_HOME"] = CACHE  # кэш demucs-модели в Volume
    with tempfile.NamedTemporaryFile(suffix=".m4a", delete=False) as f:
        f.write(audio_bytes)
        path = f.name

    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if device == "cuda" else torch.float32

    # 1) отделяем вокал → CTC слушает чистый голос, а не микс с битом
    vocals = isolate_vocals(path, device)

    model, tokenizer = load_alignment_model(device, dtype=dtype)
    audio_waveform = load_audio(vocals, model.dtype, model.device)
    dur = round(len(audio_waveform) / 16000, 2)
    emissions, stride = generate_emissions(model, audio_waveform, batch_size=8)

    text = " ".join(words)
    tokens_starred, text_starred = preprocess_text(text, romanize=True, language=lang)
    segments, scores, blank = get_alignments(emissions, tokens_starred, tokenizer)
    spans = get_spans(tokens_starred, segments, blank)
    ts = postprocess_results(text_starred, spans, stride, scores)

    out = [{"kr": w["text"], "t": round(float(w["start"]), 2), "end": round(float(w["end"]), 2)} for w in ts]
    vol.commit()
    os.unlink(path)
    return {"words": out, "duration": dur, "n_in": len(words), "n_out": len(out)}


@app.local_entrypoint()
def main(audio: str, words: str, lang: str = "kor"):
    with open(audio, "rb") as f:
        data = f.read()
    with open(words, "r", encoding="utf-8") as f:
        wl = json.load(f)
    out = align.remote(data, wl, lang)
    print("RESULT_JSON:" + json.dumps(out, ensure_ascii=False))
