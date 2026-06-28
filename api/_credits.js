import { getAuth, getDb } from './_firebase.js';

const MAX_DAILY = 100;

export const COSTS = {
    chat: 1,
    image: 5,
    quizAuto: 2,
};

function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
}

export async function verifyToken(req) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    try {
        return await getAuth().verifyIdToken(header.slice(7));
    } catch {
        return null;
    }
}

export async function ensureCredits(uid) {
    const ref = getDb().collection('users').doc(uid);
    const snap = await ref.get();
    if (!snap.exists) return null;

    const data = snap.data();
    const today = getTodayKey();
    let credits = data.credits;

    if (!credits || credits.lastResetDate !== today) {
        credits = { remaining: MAX_DAILY, maxDaily: MAX_DAILY, lastResetDate: today };
        await ref.update({ credits });
    }

    return credits;
}

export async function deductCredits(uid, amount) {
    const ref = getDb().collection('users').doc(uid);
    const today = getTodayKey();

    return getDb().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = snap.data();
        let credits = data.credits;

        if (!credits || credits.lastResetDate !== today) {
            credits = { remaining: MAX_DAILY, maxDaily: MAX_DAILY, lastResetDate: today };
        }

        if (credits.remaining < amount) {
            return { ok: false, remaining: credits.remaining };
        }

        credits.remaining -= amount;
        tx.update(ref, { credits });

        return { ok: true, remaining: credits.remaining };
    });
}
