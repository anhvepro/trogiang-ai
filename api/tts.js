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
      return res.status(500).json({ error: "Chưa có FPT_API_KEY trong môi trường Vercel" });
    }

    console.log("🎧 Gọi FPT TTS với text:", text);

    // Gửi yêu cầu TTS đến FPT
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

    if (!fptJson?.async) {
      return res.status(502).json({ error: "Không nhận được link async từ FPT", fptJson });
    }

    const audioUrl = fptJson.async;
    console.log("🕓 Chờ FPT tạo file:", audioUrl);

    // Chờ tới khi file tồn tại (tối đa 15 lần × 3s = 45 giây)
    let ready = false;
    for (let i = 0; i < 15; i++) {
      const check = await fetch(audioUrl, { method: "HEAD" });
      console.log(`Kiểm tra file (lần ${i + 1}): ${check.status}`);
      if (check.ok) {
        ready = true;
        break;
      }
      await new Promise(r => setTimeout(r, 3000)); // đợi 3 giây
    }

    if (!ready) {
      return res.status(504).json({ error: "File chưa sẵn sàng từ FPT sau 45 giây" });
    }

    console.log("✅ File FPT sẵn sàng, tải về...");

    // Tải file về và gửi lại client
    const fileResp = await fetch(audioUrl);
    const arrayBuffer = await fileResp.arrayBuffer();

    res.setHeader("Content-Type", "audio/mpeg");
    res.status(200).send(Buffer.from(arrayBuffer));
    console.log("🎉 File âm thanh đã gửi về client!");

  } catch (error) {
    console.error("🔥 Lỗi proxy:", error);
    res.status(500).json({ error: "Lỗi xử lý proxy", details: error.message });
  }
}
