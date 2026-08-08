import { Client, handle_file } from "@gradio/client";
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

    const prompttext = form.prompttext;
    const image = form.image;

    if (!prompttext || prompttext.trim() === "") {
      return res.status(400).json({
        error: "Prompt is required",
      });
    }

    if (!image) {
      return res.status(400).json({
        error: "Please upload an image.",
      });
    }

    console.log("Connecting to Wan 2.2...");

    const client = await Client.connect("kulkas2pintu/wan555");

    const imageFile = handle_file(
      new Blob([image.data], {
        type: image.mimeType || "image/jpeg",
      })
    );

    console.log("Generating video...");

    const result = await client.predict("/generate_video", {
      input_image: imageFile,
      last_image: imageFile,

      prompt: prompttext,

      steps: 4,

      negative_prompt:
        "色调艳丽, 过曝, 静态, 细节模糊不清, 字幕, 风格, 作品, 画作, 画面, 静止, 整体发灰, 最差质量, 低质量, JPEG压缩残留, 丑陋的, 残缺的, 多余的手指, 畸形的, 毁容的, 静止不动的画面, 杂乱的背景, 三条腿, 背景人很多, 倒着走",

      duration_seconds: 3.5,

      guidance_scale: 1,
      guidance_scale_2: 1,

      seed: 42,
      randomize_seed: true,

      quality: 6,

      scheduler: "UniPCMultistep",

      flow_shift: 3,

      frame_multiplier: 0,

      video_component: true,

      safe_mode: true,
    });

    console.log("Generation result:", result);

    const videoResult = result?.data?.[0];

    if (!videoResult) {
      throw new Error("No video returned from Wan 2.2.");
    }

    let videoUrl = null;

    if (typeof videoResult === "string") {
      videoUrl = videoResult;
    } else if (videoResult.url) {
      videoUrl = videoResult.url;
    } else if (videoResult.path) {
      videoUrl = videoResult.path;
    }

    if (!videoUrl) {
      throw new Error("Could not find generated video URL.");
    }

    const response = await fetch(videoUrl);

    if (!response.ok) {
      throw new Error("Failed to download generated video.");
    }

    const videoBuffer = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", videoBuffer.length);

    return res.status(200).send(videoBuffer);
  } catch (error) {
    console.error("VIDEO ERROR:", error);

    return res.status(500).json({
      error: error?.message || "Video generation failed.",
    });
  }
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
    });

    const result = {
      prompttext: "",
      image: null,
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
