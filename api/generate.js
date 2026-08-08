export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { prompttext } = req.body;

    if (!prompttext) {
      return res.status(400).json({
        error: "Prompt is required"
      });
    }

    const response = await fetch(
      "https://api-inference.huggingface.co/models/stabilityai/stable-video-diffusion-img2vid-xt",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: prompttext
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error("Hugging Face Error:", errorText);

      return res.status(response.status).json({
        error: errorText
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", "video/mp4");

    return res.status(200).send(buffer);

  } catch (error) {
    console.error("Server Error:", error);

    return res.status(500).json({
      error: error.message
    });
  }
}
