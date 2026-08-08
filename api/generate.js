import { InferenceClient } from "@huggingface/inference";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { prompttext } = req.body;

    if (!prompttext || prompttext.trim() === "") {
      return res.status(400).json({
        error: "Prompt is required"
      });
    }

    const client = new InferenceClient(process.env.HF_TOKEN);

    const video = await client.textToVideo({
      model: "Lightricks/LTX-Video-0.9.8-13B-distilled",
      inputs: prompttext
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
