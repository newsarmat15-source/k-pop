# Проверка: может ли Modal (IP дата-центра) сам скачать аудио с YouTube,
# или YouTube банит серверный IP как бота. Make-or-break для on-the-fly сборки.
import modal

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "curl", "unzip")
    .pip_install("yt-dlp")
    .run_commands("curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh || true")
)
app = modal.App("stageone-dltest")


@app.function(image=image, timeout=300)
def dl(yt_id: str) -> dict:
    import subprocess, os
    out = f"/tmp/{yt_id}.m4a"
    cmd = ["python", "-m", "yt_dlp", "-f", "bestaudio[ext=m4a]/bestaudio",
           "-o", out, "--no-playlist", f"https://www.youtube.com/watch?v={yt_id}"]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=240)
    ok = os.path.exists(out)
    size = os.path.getsize(out) if ok else 0
    tail = (r.stderr or r.stdout or "").splitlines()[-6:]
    return {"ok": ok, "size": size, "code": r.returncode, "tail": tail}


@app.local_entrypoint()
def main(yt_id: str = "phuiiNCxRMg"):
    import json
    print("DLRESULT:" + json.dumps(dl.remote(yt_id), ensure_ascii=False))
