export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { text } = req.query;
    if (!text) return res.status(400).json({ error: "Thiếu tham số text" });

    const FPT_KEY = process.env.FPT_API_KEY || "ceytqQlIkjv6zKpxlliocdtAjSQeQRvN";
    if (!FPT_KEY) {
      return res.status(500).json({ error: "Chưa có FPT_API_KEY trong Vercel" });
    }

    console.log("🔊 Gọi FPT TTS cho text:", text);

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
    console.log("📡 Phản hồi FPT:", fptJson);

    if (!fptJson || !fptJson.async) {
      return res.status(502).json({
        error: "Không nhận được async link từ FPT",
        data: fptJson,
      });
    }

    const audioUrl = fptJson.async;

    // 🕓 Đợi file FPT tạo xong (tối đa 10 lần)
    let ok = false;
    for (let i = 0; i < 10; i++) {
      const check = await fetch(audioUrl, { method: "HEAD" });
      console.log(`Kiểm tra file (lần ${i + 1}): ${check.status}`);
      if (check.ok) {
        ok = true;
        break;
      }
      await new Promise(r => setTimeout(r, 2000));
    }

    if (!ok) {
      return res.status(504).json({ error: "File chưa sẵn sàng sau 10 lần thử" });
    }

    // 📥 Tải file thật về và gửi cho client
    const file = await fetch(audioUrl);
    const arrayBuffer = await file.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.status(200).send(Buffer.from(arrayBuffer));
    console.log("✅ File âm thanh đã được gửi về client");

  } catch (error) {
    console.error("🔥 Lỗi xử lý proxy:", error);
    res.status(500).json({ error: "Lỗi xử lý proxy", details: error.message });
  }
}
