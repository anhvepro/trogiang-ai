// api/tts.js (Vercel)
export default async function handler(req, res) {
  // CORS: cho phép mọi origin (để chạy local dev + hosting)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const text = (req.query.text || "").toString().trim();
    if (!text) {
      return res.status(400).json({ error: "Thiếu tham số 'text'." });
    }

    const FPT_KEY = process.env.FPT_API_KEY;
    if (!FPT_KEY) {
      return res.status(500).json({ error: "FPT_API_KEY chưa được cấu hình trong Environment Variables." });
    }

    // Gọi FPT để tạo file TTS
    const fptResp = await fetch("https://api.fpt.ai/hmi/tts/v5", {
      method: "POST",
      headers: {
        "api-key": FPT_KEY,
        "voice": "banmai",
        "speed": "0",
        // gửi plain text giống như khi dùng curl -d "..."
        "Content-Type": "text/plain; charset=utf-8"
      },
      body: text
    });

    // Nếu FPT trả lỗi (401/403...) thì đọc message để debug
    if (!fptResp.ok) {
      const txt = await fptResp.text();
      console.error("FPT API returned non-OK:", fptResp.status, txt);
      return res.status(502).json({ error: "FPT API error", status: fptResp.status, body: txt });
    }

    const data = await fptResp.json();
    if (!data || !data.async) {
      console.error("FPT did not return async link:", data);
      return res.status(502).json({ error: "Không nhận được link âm thanh từ FPT", data });
    }

    const mp3Url = data.async;
    // Poll (HEAD) tối đa N lần để đợi file mp3 sẵn sàng
    let ready = false;
    const maxChecks = 10;
    const delayMs = 1500;
    for (let i = 0; i < maxChecks; i++) {
      try {
        const head = await fetch(mp3Url, { method: "HEAD" });
        if (head.ok) {
          ready = true;
          break;
        }
      } catch (e) {
        // ignore, chờ tiếp
      }
      await new Promise(r => setTimeout(r, delayMs));
    }

    if (!ready) {
      console.error("FPT audio not ready after polling:", mp3Url);
      return res.status(504).json({ error: "FPT audio chưa sẵn sàng sau thời gian chờ." });
    }

    // Lấy file mp3 và trả về cho client cùng header CORS
    const audioResp = await fetch(mp3Url);
    if (!audioResp.ok) {
      const txt = await audioResp.text().catch(()=>null);
      console.error("Failed to fetch mp3:", audioResp.status, txt);
      return res.status(502).json({ error: "Không tải được file âm thanh từ FPT", status: audioResp.status });
    }

    const arrayBuffer = await audioResp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", "audio/mpeg");
    res.status(200).send(buffer);

  } catch (err) {
    console.error("Unhandled error in TTS proxy:", err);
    res.status(500).json({ error: "Lỗi proxy server", message: err?.message || String(err) });
  }
}
