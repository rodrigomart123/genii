import { GoogleGenerativeAI } from "@google/generative-ai";
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
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    const decoded = await verifyToken(req);
    if (!decoded) {
        return res.status(401).json({ error: 'Token inválido ou em falta.' });
    }
    await ensureCredits(decoded.uid);
    const cost = COSTS.chat;
    const deductResult = await deductCredits(decoded.uid, cost);
    if (!deductResult.ok) {
        return res.status(429).json({ error: 'Créditos insuficientes.', remaining: deductResult.remaining });
    }
    const { prompt, messages, systemPrompt } = req.body;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    function buildHistory(useSystemInstruction) {
        const history = [];
        if (systemPrompt && !useSystemInstruction) {
            history.push({ role: 'user', parts: [{ text: systemPrompt }] });
            history.push({ role: 'model', parts: [{ text: 'Entendido. Sou o Geno e vou seguir essas instruções. Responde sempre em JSON puro.' }] });
        }
        if (messages && Array.isArray(messages)) {
            for (let i = 0; i < messages.length - 1; i++) {
                history.push({
                    role: messages[i].role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: messages[i].text }]
                });
            }
        }
        return history;
    }
    function writeSSE(res, data) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
    async function streamChat(useSystemInstruction) {
        const model = genAI.getGenerativeModel({
            model: "gemini-3.1-flash-lite",
            ...(useSystemInstruction && systemPrompt ? { systemInstruction: systemPrompt } : {})
        });
        if (messages && Array.isArray(messages) && messages.length > 0) {
            const history = buildHistory(useSystemInstruction);
            const lastMsg = messages[messages.length - 1];
            const chat = model.startChat({ history });
            const result = await chat.sendMessageStream(lastMsg.text);
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                if (chunkText) writeSSE(res, { token: chunkText });
            }
        } else {
            const result = await model.generateContentStream(prompt);
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                if (chunkText) writeSSE(res, { token: chunkText });
            }
        }
    }
    try {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        writeSSE(res, { credits: deductResult.remaining });
        if (systemPrompt) {
            try {
                await streamChat(true);
            } catch (e) {
                console.warn("systemInstruction stream failed, falling back:", e.message);
                await streamChat(false);
            }
        } else {
            await streamChat(false);
        }
        writeSSE(res, { done: true });
        res.end();
    } catch (error) {
        console.error("Erro na API Gemini:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message || 'Erro ao gerar conteúdo' });
        } else {
            writeSSE(res, { error: error.message });
            res.end();
        }
    }
}
