import { createHash } from 'crypto';
import { verifyToken } from './_credits.js';
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    const decoded = await verifyToken(req);
    if (!decoded) {
        return res.status(401).json({ error: 'Token inválido ou em falta.' });
    }
    try {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        if (!cloudName || !apiKey || !apiSecret) {
            return res.status(500).json({ error: 'Cloudinary não configurado.' });
        }
        const { publicId } = req.body;
        if (!publicId) {
            return res.status(400).json({ error: 'publicId é obrigatório.' });
        }
        const timestamp = Math.floor(Date.now() / 1000);
        const signatureStr = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
        const signature = createHash('sha1').update(signatureStr).digest('hex');
        const formData = new URLSearchParams();
        formData.append('public_id', publicId);
        formData.append('api_key', apiKey);
        formData.append('timestamp', String(timestamp));
        formData.append('signature', signature);
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
            {
                method: 'POST',
                body: formData,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            }
        );
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Erro ao apagar: ${errText}`);
        }
        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Erro no delete-image:', error);
        return res.status(500).json({ error: error.message });
    }
}
