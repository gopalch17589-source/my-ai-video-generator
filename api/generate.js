export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const { prompttext } = req.body;
       const response = await fetch("api-inference.huggingface.co/models/stabilityai/stable-video-diffusion-img2vid-xt", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": Bearer ${process.env.HF_TOKEN}
            },
            body: JSON.stringify({ inputs: prompttext })
        });
        if (!response.ok) throw new Error(Hugging Face Error: ${await response.text()});
        const buffer = Buffer.from(await (await response.blob()).arrayBuffer());
        res.setHeader('Content-Type', 'video/mp4');
        return res.send(buffer);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
