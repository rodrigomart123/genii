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
        const { image, folder } = req.body;
        if (!image) {
            return res.status(400).json({ error: 'Imagem é obrigatória.' });
        }
        const timestamp = String(Math.floor(Date.now() / 1000));
        const folderName = folder || 'genii_uploads';
        const formData = new URLSearchParams();
        formData.append('file', image);
        formData.append('folder', folderName);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp);
        const paramsToSign = { folder: folderName, timestamp };
        const signatureStr =
            Object.keys(paramsToSign)
                .sort()
                .map((k) => `${k}=${paramsToSign[k]}`)
                .join('&') + apiSecret;
        const signature = createHash('sha1').update(signatureStr).digest('hex');
        formData.append('signature', signature);
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Erro Cloudinary: ${errText}`);
        }
        const result = await response.json();
        return res.status(200).json({
            url: result.secure_url || result.url,
            publicId: result.public_id,
        });
    } catch (error) {
        console.error('Erro no proxy de upload:', error);
        return res.status(500).json({ error: error.message });
    }
}
