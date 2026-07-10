// StageOne — склейка готовых (уже обрезанных, с LipSync) кусков в один финальный клип.
import { writeFile, readFile, unlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import ffmpegPath from "ffmpeg-static";
import { fetchWithRetry } from "../lib/fal-fetch.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function withRetry(fn, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) { lastErr = e; await sleep(2000); }
  }
  throw lastErr;
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, args);
    let stderr = "";
    p.stderr.on("data", (d) => { stderr += d.toString(); });
    p.on("error", reject);
    p.on("close", (code) => (code !== 0 ? reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-500)}`)) : resolve()));
  });
}

async function uploadToFalCdn(buf, falKey, contentType, fileName) {
  return withRetry(async () => {
    const initRes = await fetchWithRetry("https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3", {
      method: "POST",
      headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content_type: contentType, file_name: fileName }),
    });
    if (!initRes.ok) throw new Error(`fal storage initiate ${initRes.status}: ${await initRes.text()}`);
    const { upload_url, file_url } = await initRes.json();
    const up = await fetchWithRetry(upload_url, { method: "PUT", headers: { "Content-Type": contentType }, body: buf });
    if (!up.ok) throw new Error(`fal storage upload ${up.status}: ${await up.text()}`);
    return file_url;
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) return res.status(500).json({ error: "FAL_KEY не задан" });

  const { videoUrls } = req.body || {};
  if (!Array.isArray(videoUrls) || videoUrls.length < 2) {
    return res.status(400).json({ error: "Нужен массив videoUrls минимум из 2 ссылок" });
  }

  const tag = Date.now();
  const tmp = os.tmpdir();
  const localPaths = videoUrls.map((_, i) => path.join(tmp, `stitch-${tag}-${i}.mp4`));
  const listPath = path.join(tmp, `stitch-list-${tag}.txt`);
  const outPath = path.join(tmp, `stitch-out-${tag}.mp4`);

  try {
    for (let i = 0; i < videoUrls.length; i++) {
      const buf = await withRetry(async () => {
        const r = await fetchWithRetry(videoUrls[i]);
        if (!r.ok) throw new Error(`download ${r.status}`);
        return Buffer.from(await r.arrayBuffer());
      });
      await writeFile(localPaths[i], buf);
    }

    const listContent = localPaths.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n");
    await writeFile(listPath, listContent);
    await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outPath]);

    const finalBuf = await readFile(outPath);
    const finalUrl = await uploadToFalCdn(finalBuf, FAL_KEY, "video/mp4", `stitched-${tag}.mp4`);
    return res.status(200).json({ ok: true, videoUrl: finalUrl });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  } finally {
    await Promise.all([...localPaths, listPath, outPath].map((p) => unlink(p).catch(() => {})));
  }
}
