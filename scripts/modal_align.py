# Modal-воркер пословного forced alignment под клип — ДВУХПРОХОДНАЯ схема.
# Проблема: CTC на всём треке разом дрейфует и цепляет чужие куски (интро/адлибы).
# Решение:
#  1) Demucs отделяет вокал (CTC слушает чистый голос).
#  2) Проход 1: грубая привязка всех слов → черновые границы строк.
#  3) Починка границ строк по СТРУКТУРЕ lrclib (точные относительные тайминги альбома)
#     + уверенности CTC: строки с плохой уверенностью не доверяем, интерполируем.
#  4) Проход 2: каждую строку привязываем в её КОРОТКОМ окне (3-5с) — CTC там почти
#     не ошибается и не может уехать в соседнюю строку.
#  5) Онсет-снеп: начало слова подтягиваем к реальному всплеску энергии голоса
#     (убирает систематическое запаздывание CTC).
#  6) Монотонность + мин.длительность: без обратных скачков и схлопываний.
#
# Вход: lines = [{"t": альбомная_сек, "w": ["слово", ...]}, ...]
# Выход: плоский список слов 1:1 по порядку: [{"kr","t","te","sc"}]
import json
import modal

CACHE = "/cache"
vol = modal.Volume.from_name("stageone-whisper-cache", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "git")
    .pip_install("torch", "torchaudio", "transformers")
    .pip_install("demucs", "librosa")
    .pip_install("faster-whisper==1.0.3", "requests")
    .pip_install("git+https://github.com/MahmoudAshraf97/ctc-forced-aligner.git")
)

app = modal.App("stageone-align")

SR = 16000


def isolate_vocals(path, device):
    import os, glob, subprocess
    outdir = "/tmp/sep"
    subprocess.run(["python", "-m", "demucs", "--two-stems=vocals", "-n", "htdemucs",
                    "-d", device, "-o", outdir, path], check=True)
    hits = glob.glob(os.path.join(outdir, "htdemucs", "*", "vocals.wav"))
    return hits[0] if hits else path


def _clean(s):
    import re
    return re.sub(r"[^가-힣a-z0-9]", "", (s or "").lower())


@app.function(image=image, gpu="T4", volumes={CACHE: vol}, timeout=1800)
def align(audio_bytes: bytes, lines: list, lang: str = "kor") -> dict:
    import tempfile, os
    import numpy as np
    import torch
    import librosa
    from ctc_forced_aligner import (
        load_audio, load_alignment_model, generate_emissions,
        preprocess_text, get_alignments, get_spans, postprocess_results,
    )

    os.environ["HF_HOME"] = CACHE
    os.environ["TORCH_HOME"] = CACHE
    with tempfile.NamedTemporaryFile(suffix=".m4a", delete=False) as f:
        f.write(audio_bytes)
        path = f.name

    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if device == "cuda" else torch.float32

    vocals = isolate_vocals(path, device)
    model, tokenizer = load_alignment_model(device, dtype=dtype)
    audio = load_audio(vocals, model.dtype, model.device)
    dur = round(len(audio) / SR, 2)
    emissions, stride = generate_emissions(model, audio, batch_size=8)
    n_frames = emissions.shape[0]

    wav_np = audio.detach().cpu().float().numpy()
    onsets = librosa.onset.onset_detect(y=wav_np, sr=SR, units="time", backtrack=True)
    onsets = np.asarray(onsets, dtype=float)

    def snap(t, tol=0.25):
        if onsets.size == 0:
            return t
        i = int(np.searchsorted(onsets, t))
        cand = []
        if i < onsets.size:
            cand.append(onsets[i])
        if i > 0:
            cand.append(onsets[i - 1])
        best = min(cand, key=lambda o: abs(o - t))
        return float(best) if abs(best - t) <= tol else t

    # Привязать список слов в окне кадров [f0,f1). Возвращает 1:1 с words:
    # [(start_abs, end_abs, score)], склеивая внутренние разбиения токенов.
    def align_words(words, f0, f1):
        f0 = max(0, int(f0)); f1 = min(n_frames, int(f1))
        if f1 - f0 < 2 or not words:
            return None
        emi = emissions[f0:f1]
        offset = f0 * stride
        text = " ".join(words)
        try:
            tks, txts = preprocess_text(text, romanize=True, language=lang)
            seg, sc, blank = get_alignments(emi, tks, tokenizer)
            spans = get_spans(tks, seg, blank)
            res = postprocess_results(txts, spans, stride, sc)
        except Exception:
            return None
        # склейка выходных токенов обратно к нашим словам (1:1)
        out = []
        j = 0
        for w in words:
            target = _clean(w)
            if not target:
                t0 = res[j]["start"] if j < len(res) else 0.0
                out.append((t0 + offset, t0 + offset + 0.1, 0.0)); continue
            acc, start, end, scr = "", None, None, []
            while j < len(res):
                if start is None:
                    start = res[j]["start"]
                end = res[j]["end"]; scr.append(res[j].get("score", 1.0))
                acc += _clean(res[j]["text"]); j += 1
                if len(acc) >= len(target):
                    break
            if start is None:
                out.append((None, None, 0.0))
            else:
                out.append((start + offset, end + offset, float(np.mean(scr)) if scr else 0.0))
        return out

    # плоский список слов + индексы строк
    flat = []
    line_span = []  # (i0,i1) в flat для каждой строки
    for ln in lines:
        i0 = len(flat)
        flat.extend(ln["w"])
        line_span.append((i0, len(flat)))
    N = len(flat)

    # ---- Проход 1: грубо, по всему треку ----
    p1 = align_words(flat, 0, n_frames) or [(None, None, 0.0)] * N

    # старт и уверенность каждой строки из прохода 1
    L = len(lines)
    line_start = [None] * L
    line_conf = [0.0] * L
    for li, (i0, i1) in enumerate(line_span):
        starts = [p1[k][0] for k in range(i0, i1) if p1[k][0] is not None]
        scs = [p1[k][2] for k in range(i0, i1)]  # scs = средние лог-вероятности слов
        line_start[li] = min(starts) if starts else None
        # уверенность строки: exp(средняя лог-вероятность) → 0..1
        line_conf[li] = float(np.exp(np.mean(scs))) if scs else 0.0

    # ---- Починка границ строк по альбомной структуре + уверенности ----
    alb = [float(ln.get("t", 0.0)) for ln in lines]
    CONF = 0.4  # порог по 0..1 уверенности
    trusted = [li for li in range(L) if line_start[li] is not None and line_conf[li] >= CONF]
    # монотонность доверенных
    for a in range(1, len(trusted)):
        i, p = trusted[a], trusted[a - 1]
        if line_start[i] <= line_start[p]:
            line_start[i] = line_start[p] + 0.3
    # интерполяция недоверенных по альбомным таймингам между ближайшими доверенными
    if trusted:
        for li in range(L):
            if li in trusted:
                continue
            lo = max([t for t in trusted if t < li], default=None)
            hi = min([t for t in trusted if t > li], default=None)
            if lo is not None and hi is not None and alb[hi] > alb[lo]:
                frac = (alb[li] - alb[lo]) / (alb[hi] - alb[lo])
                line_start[li] = line_start[lo] + frac * (line_start[hi] - line_start[lo])
            elif lo is not None:
                line_start[li] = line_start[lo] + max(0.4, alb[li] - alb[lo])
            elif hi is not None:
                line_start[li] = max(0.0, line_start[hi] - max(0.4, alb[hi] - alb[li]))
            else:
                line_start[li] = alb[li]
    else:
        line_start = alb[:]
    # финальная монотонность
    for li in range(1, L):
        if line_start[li] <= line_start[li - 1]:
            line_start[li] = line_start[li - 1] + 0.3

    # ---- Проход 2: каждую строку в её окне ----
    final = [None] * N
    for li, (i0, i1) in enumerate(line_span):
        w0 = max(0.0, line_start[li] - 0.4)
        w1 = (line_start[li + 1] + 0.4) if li + 1 < L else dur
        if w1 <= w0 + 0.2:
            w1 = min(dur, w0 + 2.0)
        r = align_words(flat[i0:i1], w0 / stride, w1 / stride)
        for k in range(i0, i1):
            rr = r[k - i0] if r else None
            final[k] = rr if (rr and rr[0] is not None) else p1[k]
        # первое слово строки утекло назад в интро/инструментал? (большой отрыв от 2-го) → подтянуть
        if i1 - i0 >= 2 and final[i0] and final[i0 + 1] and final[i0][0] is not None and final[i0 + 1][0] is not None:
            if final[i0 + 1][0] - final[i0][0] > 1.0:
                ns = final[i0 + 1][0] - 0.4
                en = final[i0][1] if (final[i0][1] and final[i0][1] > ns) else ns + 0.2
                final[i0] = (ns, en, final[i0][2])

    # ---- Онсет-снеп + монотонность + мин.длительность ----
    words_out = []
    prev = -1.0
    for k in range(N):
        st, en, sc = final[k] if final[k] else (None, None, 0.0)
        if st is None:
            st = prev + 0.2 if prev >= 0 else 0.0
            en = st + 0.2
        st = snap(st)
        if st <= prev:
            st = prev + 0.06
        if en is None or en < st + 0.08:
            en = st + 0.12
        prev = st
        conf = float(np.exp(sc)) if sc < 0 else 1.0  # лог-вероятность → 0..1
        words_out.append({"kr": flat[k], "t": round(st, 2), "te": round(en, 2), "sc": round(conf, 2)})

    vol.commit()
    os.unlink(path)
    lowconf = sum(1 for w in words_out if w["sc"] < CONF)
    return {"words": words_out, "duration": dur, "n": N, "lowconf": lowconf}


@app.function(image=image, gpu="T4", volumes={CACHE: vol}, timeout=1800)
def asr(audio_bytes: bytes, lang: str = "ko") -> dict:
    """Независимый ASR-проход: Whisper САМ слушает клип и слышит слова со своими
    таймингами (не forced) — эталон для проверки нашей привязки. Слушает ИЗОЛИР. вокал."""
    import tempfile, os
    import torch
    from faster_whisper import WhisperModel

    os.environ["HF_HOME"] = CACHE
    os.environ["TORCH_HOME"] = CACHE
    with tempfile.NamedTemporaryFile(suffix=".m4a", delete=False) as f:
        f.write(audio_bytes)
        path = f.name
    device = "cuda" if torch.cuda.is_available() else "cpu"
    vocals = isolate_vocals(path, device)
    # Whisper на CPU (int8): ctranslate2-GPU требует системный libcublas, которого в образе нет.
    # Для валидатора скорость не критична.
    model = WhisperModel("large-v3", device="cpu", compute_type="int8", download_root=CACHE)
    segs, info = model.transcribe(vocals, language=lang, word_timestamps=True,
                                  beam_size=5, vad_filter=False, condition_on_previous_text=False)
    words = []
    for s in segs:
        for w in (s.words or []):
            t = w.word.strip()
            if t:
                words.append({"kr": t, "t": round(float(w.start), 2)})
    vol.commit()
    os.unlink(path)
    return {"words": words, "duration": round(float(info.duration), 2)}


@app.local_entrypoint()
def main(audio: str, lines: str, lang: str = "kor"):
    with open(audio, "rb") as f:
        data = f.read()
    with open(lines, "r", encoding="utf-8") as f:
        ln = json.load(f)
    out = align.remote(data, ln, lang)
    print("RESULT_JSON:" + json.dumps(out, ensure_ascii=False))


@app.local_entrypoint()
def check(audio: str, lang: str = "ko"):
    with open(audio, "rb") as f:
        data = f.read()
    out = asr.remote(data, lang)
    print("RESULT_JSON:" + json.dumps(out, ensure_ascii=False))
