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
    const form = await parseMultipart(req);

    const audio = form.audio;

    if (!audio) {
      return res.status(400).json({
        error: "Please upload an audio or video file.",
      });
    }

    /*
      Step 2:
      File upload endpoint is ready.

      Speech-to-text engine will be connected
      in the next step.
    */

    return res.status(200).json({
      success: true,
      message: "Audio / Video uploaded successfully.",
      filename: audio.filename,
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
