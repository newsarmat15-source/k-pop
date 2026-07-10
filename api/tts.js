// Прокси для озвучки текста через ElevenLabs Text-to-Speech.
// Причина существования: прямые запросы к ElevenLabs с домашнего IP блокируются
// их Cloudflare-защитой (см. их же справку про ограничения по странам/сетям) —
// с серверов Vercel (как и у остальных наших вызовов ElevenLabs) это не проблема.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
  if (!ELEVEN_KEY) return res.status(500).json({ error: "ELEVENLABS_API_KEY не задан" });

  const { text, voiceId = "21m00Tcm4TlvDq8ikWAM" } = req.body || {};
  if (!text || !String(text).trim()) return res.status(400).json({ error: "Нужен непустой text" });

  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVEN_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      return res.status(r.status).json({ ok: false, error: errText || `ElevenLabs вернул ${r.status}` });
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
