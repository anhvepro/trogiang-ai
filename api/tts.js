// api/tts.js
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const text = req.query.text;
  if (!text) return res.status(400).send("Thiếu tham số 'text'");

  // 👉 Lấy key từ biến môi trường thay vì ghi cứng
  const FPT_KEY = process.env.FPT_API_KEY;
  const VOICE = "banmai";

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
    if (!data.async) return res.status(500).send("Không nhận được link âm thanh từ FPT");

    // Đợi file âm thanh sẵn sàng
    for (let i = 0; i < 5; i++) {
      const check = await fetch(data.async, { method: "HEAD" });
      if (check.ok) {
        const file = await fetch(data.async);
        const buffer = await file.arrayBuffer();
        res.setHeader("Content-Type", "audio/mpeg");
        return res.send(Buffer.from(buffer));
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    res.status(504).send("FPT chưa sẵn sàng file âm thanh");
  } catch (err) {
    console.error("Lỗi FPT.AI:", err);
    res.status(500).send("Lỗi proxy hoặc sai API key");
  }
}
