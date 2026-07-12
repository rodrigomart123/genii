import { verifyToken } from './_credits.js';
import { decryptAnswer } from './_validation.js';
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
    const { quizId, questionIndex, selectedKey, typingAnswer, validationToken } = req.body;
    if (!validationToken) {
        return res.status(400).json({ error: 'Token de validação em falta.' });
    }
    const answerData = decryptAnswer(validationToken);
    if (!answerData) {
        return res.status(400).json({ error: 'Token de validação inválido ou adulterado.' });
    }
    const questionType = answerData.tp || 'quiz';
    const correctKey = answerData.ck;
    const acceptedAnswers = answerData.aa;
    const basePoints = answerData.pt || 1000;
    const options = answerData.opts || {};
    let isCorrect = false;
    if (questionType === 'typing') {
        const accepted = (acceptedAnswers || []).map((a) => a.trim().toLowerCase());
        const userAnswer = (typingAnswer || '').trim().toLowerCase();
        isCorrect = accepted.includes(userAnswer);
    } else {
        if (Array.isArray(correctKey)) {
            isCorrect = correctKey.includes(selectedKey);
        } else {
            isCorrect = correctKey === selectedKey;
        }
    }
    const points = isCorrect ? parseInt(basePoints) : 0;
    let correctText = null;
    let displayCorrectKey = null;
    if (questionType === 'typing') {
        correctText = (acceptedAnswers || []).join(', ');
    } else {
        displayCorrectKey = correctKey;
        if (Array.isArray(correctKey)) {
            correctText = correctKey.map((k) => options[k] || k).join(', ');
        } else if (correctKey && options[correctKey]) {
            correctText = options[correctKey];
        }
    }
    return res.status(200).json({
        correct: isCorrect,
        points,
        correctKey: displayCorrectKey,
        correctText,
        acceptedAnswers: questionType === 'typing' ? (acceptedAnswers || []) : null,
    });
}
