import { InferenceClient } from "@huggingface/inference";
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
    if (!process.env.HF_TOKEN) {
      return res.status(500).json({
        error: "HF_TOKEN is missing in Vercel.",
      });
    }

    const form = await parseMultipart(req);

    if (!form.audio) {
      return res.status(400).json({
        error: "Please upload an audio or video file.",
      });
    }

    console.log("Starting speech recognition...");

    const client = new InferenceClient(process.env.HF_TOKEN);

    const audioBlob = new Blob(
      [form.audio.data],
      {
        type: form.audio.mimeType || "audio/mpeg",
      }
    );

    const result = await client.automaticSpeechRecognition({
      model: "openai/whisper-large-v3",
      data: audioBlob,
    });

    console.log("Transcription result:", result);

    return res.status(200).json({
      success: true,
      text: result.text || "",
      filename: form.audio.filename,
    });

  } catch (error) {
    console.error("TRANSCRIBE ERROR:", error);

    return res.status(500).json({
      error: error?.message || "Speech recognition failed.",
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
