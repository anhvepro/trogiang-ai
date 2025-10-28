export default async function handler(req, res) {
  const text = req.query.text || "Xin chào, tôi là trợ giảng AI.";
  const FPT_KEY = process.env.FPT_API_KEY || "ceytqQlIkjv6zKpxlliocdtAjSQeQRvN"; // tạm test

  try {
    const response = await fetch("https://api.fpt.ai/hmi/tts/v5", {
      method: "POST",
      headers: {
        "api-key": FPT_KEY,
        "voice": "banmai",
        "speed": "",
        "Cache-Control": "no-cache",
      },
      body: text,
    });

    const data = await response.json();
    console.log("Phản hồi FPT:", data);

    if (data.async) {
      res.redirect(data.async);
    } else {
      res.status(500).send("Không nhận được link âm thanh từ FPT");
    }
  } catch (error) {
    console.error("Lỗi gọi FPT.AI:", error);
    res.status(500).send("Lỗi máy chủ: " + error.message);
  }
}
