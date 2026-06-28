import { verifyToken, ensureCredits } from './_credits.js';
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    const decoded = await verifyToken(req);
    if (!decoded) {
        return res.status(401).json({ error: 'Token inválido ou em falta.' });
    }
    const credits = await ensureCredits(decoded.uid);
    if (!credits) {
        return res.status(404).json({ error: 'Utilizador não encontrado.' });
    }
    return res.status(200).json({ remaining: credits.remaining, maxDaily: credits.maxDaily });
}
