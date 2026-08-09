import Busboy from "busboy";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    if (!process.env.SARVAM_API_KEY) {
      return res.status(500).json({
        error: "SARVAM_API_KEY is missing in Vercel.",
      });
    }

    const form = await parseMultipart(req);

    if (!form.audio) {
      return res.status(400).json({
        error: "Please upload an audio or video file.",
      });
    }

    console.log(
  "SARVAM KEY CHECK:",
  process.env.SARVAM_API_KEY
    ? "KEY EXISTS"
    : "KEY MISSING"
); 
    
    const audioBlob = new Blob(
      [form.audio.data],
      {
        type: form.audio.mimeType || "audio/mpeg",
      }
    );

    const formData = new FormData();

    formData.append(
      "file",
      audioBlob,
      form.audio.filename || "audio.mp3"
    );

    formData.append("model", "saaras:v2.5");

    const response = await fetch(
      "https://api.sarvam.ai/speech-to-text",
      {
        method: "POST",
        headers: {
      "api-subscription-key": process.env.SARVAM_API_KEY.trim(),
     },
        body: formData,
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error("SARVAM ERROR:", responseText);

      return res.status(response.status).json({
        error: responseText,
      });
    }

    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      return res.status(500).json({
        error: "Invalid response from Sarvam.",
        raw: responseText,
      });
    }

    return res.status(200).json({
      success: true,
      text: result.transcript || "",
      filename: form.audio.filename,
    });

  } catch (error) {
    console.error("TRANSCRIBE ERROR:", error);

    return res.status(500).json({
      error: error?.message || "Transcription failed.",
    });
  }
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
    });

    const result = {
      audio: null,
    };

    busboy.on("file", (name, file, info) => {
      if (name !== "audio") {
        file.resume();
        return;
      }

      const chunks = [];

      file.on("data", (chunk) => {
        chunks.push(chunk);
      });

      file.on("end", () => {
        result.audio = {
          data: Buffer.concat(chunks),
          filename: info.filename,
          mimeType: info.mimeType,
        };
      });
    });

    busboy.on("finish", () => {
      resolve(result);
    });

    busboy.on("error", (error) => {
      reject(error);
    });

    req.pipe(busboy);
  });
}
