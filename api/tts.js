export default async function handler(req, res) {
  try {
    const { text } = req.query;
    if (!text) {
      return res.status(400).json({ error: "Thiếu tham số text" });
    }

    const response = await fetch("https://api.fpt.ai/hmi/tts/v5", {
      method: "POST",
      headers: {
        "api-key": process.env.FPT_API_KEY,
        "voice": "banmai",
        "speed": "0",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ text })
    });

    const data = await response.json();

    if (!data.async) {
      return res.status(500).json({ error: "Không nhận được link âm thanh từ FPT", data });
    }

    // 🟢 Cho phép mọi domain truy cập API này
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // 🕒 Lấy file mp3 thật từ FPT
    const audioResp = await fetch(data.async);
    const audioBuffer = await audioResp.arrayBuffer();

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error("Lỗi proxy FPT:", error);
    res.status(500).json({ error: "Lỗi xử lý proxy", details: error.message });
  }
}
