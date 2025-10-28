export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { text } = req.query;
    if (!text) return res.status(400).json({ error: "Thiếu tham số text" });

    const FPT_KEY = process.env.FPT_API_KEY || "ceytqQlIkjv6zKpxlliocdtAjSQeQRvN";
    const fptResp = await fetch("https://api.fpt.ai/hmi/tts/v5", {
      method: "POST",
      headers: {
        "api-key": FPT_KEY,
        "voice": "banmai",
        "speed": "0",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ text }),
    });

    const fptJson = await fptResp.json();
    console.log("📡 FPT JSON:", fptJson);

    if (!fptJson.async)
      return res.status(500).json({ error: "Không nhận được link âm thanh", fptJson });

    const audioUrl = fptJson.async;

    // 🕓 Kiểm tra đến khi file có thật (FPT cần 2–5s để tạo)
    let fileReady = false;
    for (let i = 0; i < 10; i++) {
      const check = await fetch(audioUrl, { method: "HEAD" });
      if (check.ok) {
        fileReady = true;
        break;
      }
      await new Promise(r => setTimeout(r, 1500)); // đợi 1.5s
    }

    if (!fileReady)
      return res.status(504).json({ error: "File chưa sẵn sàng từ FPT" });

    // 🪄 Tải file thật và gửi về client
    const audioData = await fetch(audioUrl);
    const arrayBuffer = await audioData.arrayBuffer();

    res.setHeader("Content-Type", "audio/mpeg");
    res.status(200).send(Buffer.from(arrayBuffer));
    console.log("✅ Gửi file âm thanh thành công");

  } catch (err) {
    console.error("🔥 Lỗi proxy:", err);
    res.status(500).json({ error: "Lỗi proxy FPT", details: err.message });
  }
}
