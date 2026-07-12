import { verifyToken } from './_credits.js';
import { getDb } from './_firebase.js';
import { encryptAnswer } from './_validation.js';
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
    const { id } = req.query;
    if (!id) {
        return res.status(400).json({ error: 'ID do quiz é obrigatório.' });
    }
    try {
        const db = getDb();
        const quizDoc = await db.collection('quizzes').doc(id).get();
        if (!quizDoc.exists) {
            return res.status(404).json({ error: 'Quiz não encontrado.' });
        }
        const quizData = { id: quizDoc.id, ...quizDoc.data() };
        const isPublic =
            quizData.isPublic === true || quizData.visibility === 'public';
        const isOwner = quizData.ownerId === decoded.uid;
        if (!isPublic && !isOwner) {
            return res.status(403).json({ error: 'Sem permissão para aceder a este quiz.' });
        }
        const validQuestions = (quizData.questions || []).filter(q => {
            if (q.type === 'slide') return true;
            const ck = q.correct_option ?? q.correctOption ?? q.correct ?? q.answer ?? null;
            if (q.type === 'quiz' || q.type === 'boolean') {
                if (Array.isArray(ck)) return ck.length > 0;
                if (typeof ck === 'string') return ck.length > 0;
                return false;
            }
            if (q.type === 'typing') {
                return Array.isArray(q.acceptedAnswers) && q.acceptedAnswers.length > 0;
            }
            return false;
        });
        const sanitizedQuestions = validQuestions.map((q) => {
            const answerData = {
                ck: q.correct_option ?? q.correctOption ?? q.correct ?? q.answer ?? null,
                aa: q.acceptedAnswers || null,
                pt: q.points || 1000,
                tp: q.type || 'quiz',
                opts: q.options || null,
            };
            const safe = { ...q };
            delete safe.correct_option;
            delete safe.correctOption;
            delete safe.correct;
            delete safe.answer;
            delete safe.correct_answer;
            if (safe.type === 'typing') {
                delete safe.acceptedAnswers;
            }
            safe._vt = encryptAnswer(answerData);
            safe._cv = btoa(JSON.stringify({ ck: answerData.ck, aa: answerData.aa, tp: answerData.tp })).split('').reverse().join('');
            return safe;
        });
        const safeQuiz = {
            id: quizDoc.id,
            title: quizData.title,
            description: quizData.description,
            cover_image_url: quizData.cover_image_url,
            questions: sanitizedQuestions,
            questionCount: sanitizedQuestions.length,
            settings: quizData.settings || {},
            isPublic: quizData.isPublic,
            visibility: quizData.visibility,
            ownerId: quizData.ownerId,
            createdAt: quizData.createdAt,
        };
        return res.status(200).json(safeQuiz);
    } catch (error) {
        console.error('Erro em quiz-play:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
}
