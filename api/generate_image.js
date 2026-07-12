import { verifyToken, ensureCredits, deductCredits, COSTS } from './_credits.js';
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
    const decoded = await verifyToken(req);
    if (!decoded) {
        return res.status(401).json({ error: 'Token inválido ou em falta.' });
    }
    await ensureCredits(decoded.uid);
    const cost = COSTS.image;
    const deductResult = await deductCredits(decoded.uid, cost);
    if (!deductResult.ok) {
        return res.status(429).json({ error: 'Créditos insuficientes.', remaining: deductResult.remaining });
    }
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: "Prompt é obrigatório." });
        }
        const workerUrl = process.env.CLOUDFLARE_WORKER_URL;
        const apiKey = process.env.CLOUDFLARE_API_KEY;
        const response = await fetch(workerUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt })
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Erro na Cloudflare: ${errText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('X-Credits-Remaining', String(deductResult.remaining));
        return res.send(buffer);
    } catch (error) {
        console.error("Erro no proxy de imagem:", error);
        return res.status(500).json({ error: error.message });
    }
}
