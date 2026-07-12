import { verifyToken } from './_credits.js';
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    if (req.method !== 'GET') return res.status(405).json({ error: "Method not allowed" });
    const decoded = await verifyToken(req);
    if (!decoded) {
        return res.status(401).json({ error: 'Token inválido ou em falta.' });
    }
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ error: "A query de pesquisa é obrigatória." });
        }
        const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12`;
        const response = await fetch(unsplashUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Client-ID ${process.env.UNSPLASH_API_KEY}`
            }
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Erro Unsplash: ${errText}`);
        }
        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}