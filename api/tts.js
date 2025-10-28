// api/tts.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const text = req.query.text;
  if (!text) return res.status(400).send("Thiếu tham số 'text'");

  const FPT_KEY = "ceytqQlIkjv6zKpxlliocdtAjSQeQRvN"; // 👉 Thầy dán key FPT của mình vào đây
  const VOICE = "banmai"; // Giọng nữ miền Bắc

  try {
    const fptRes = await fetch("https://api.fpt.ai/hmi/tts/v5", {
      method: "POST",
      headers: {
        "api-key": FPT_KEY,
        "speed": "0",
        "voice": VOICE,
      },
      body: text,
    });

    const data = await fptRes.json();
    if (!data.async) return res.status(500).send("Không nhận được link âm thanh");

    let ready = false;
    for (let i = 0; i < 6; i++) {
      const check = await fetch(data.async, { method: "HEAD" });
      if (check.ok) {
        ready = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    if (!ready) return res.status(504).send("FPT chưa sẵn sàng file");

    const file = await fetch(data.async);
    const buffer = await file.arrayBuffer();

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi proxy FPT.AI");
  }
}
