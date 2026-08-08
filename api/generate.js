import { InferenceClient } from "@huggingface/inference";
import Busboy from "busboy";

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const form = await parseMultipart(req);

    const prompttext = form.prompttext;
    const image = form.image;

    if (!prompttext || prompttext.trim() === "") {
      return res.status(400).json({
        error: "Prompt is required"
      });
    }

    if (!image) {
      return res.status(400).json({
        error: "Please upload an image."
      });
    }

    const client = new InferenceClient(process.env.HF_TOKEN);

    // Convert uploaded Buffer to Blob
    const imageBlob = new Blob(
      [image.data],
      { type: image.mimeType || "image/jpeg" }
    );

    const video = await client.imageToVideo({
      model: "Lightricks/LTX-Video-0.9.8-13B-distilled",
      inputs: imageBlob,
      prompt: prompttext
    });

    const buffer = Buffer.from(await video.arrayBuffer());

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", buffer.length);

    return res.status(200).send(buffer);

  } catch (error) {
    console.error("Video generation error:", error);

    return res.status(500).json({
      error: error.message || "Video generation failed"
    });
  }
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers
    });

    const result = {
      prompttext: "",
      image: null
    };

    busboy.on("field", (name, value) => {
      if (name === "prompttext") {
        result.prompttext = value;
      }
    });

    busboy.on("file", (name, file, info) => {
      if (name !== "image") {
        file.resume();
        return;
      }

      const chunks = [];

      file.on("data", (chunk) => {
        chunks.push(chunk);
      });

      file.on("end", () => {
        result.image = {
          data: Buffer.concat(chunks),
          mimeType: info.mimeType
        };
      });
    });

    busboy.on("finish", () => {
      resolve(result);
    });

    busboy.on("error", reject);

    req.pipe(busboy);
  });
}
