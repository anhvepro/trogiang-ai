export default async function handler(req, res) {
  // ✅ Cho phép tất cả origin truy cập API này
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ Xử lý request OPTIONS (trình duyệt gửi để hỏi trước)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { text } = req.query;
    if (!text) {
      return res.status(400).json({ error: "Thiếu tham số text" });
    }

    // ✅ Ghi thẳng key FPT.AI vào đây để test (key của thầy)
    const FPT_API_KEY = "ceytqQlIkjv6zKpxlliocdtAjSQeQRvN"; // ← thay bằng key FPT của thầy

    const response = await fetch("https://api.fpt.ai/hmi/tts/v5", {
      method: "POST",
      headers: {
        "api-key": FPT_API_KEY,
        "voice": "banmai",
        "speed": "0",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ text }),
    });

    const data = await response.json();

    if (!data.async) {
      console.error("❌ Không nhận được link âm thanh:", data);
      return res.status(500).json({ error: "Không nhận được link âm thanh từ FPT", data });
    }

    console.log("🔗 Link âm thanh:", data.async);

    // 🕒 Đợi FPT tạo file (thường mất 1–2s)
    await new Promise(r => setTimeout(r, 2000));

    const audioResp = await fetch(data.async);
    if (!audioResp.ok) {
      throw new Error(`Không thể tải file âm thanh: ${audioResp.status}`);
    }

    const audioBuffer = await audioResp.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.status(200).send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error("🔥 Lỗi xử lý FPT:", error);
    res.status(500).json({ error: "Lỗi xử lý proxy", details: error.message });
  }
}
