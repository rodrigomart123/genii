import { doc, getDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "../../firebase-config.js";
export function xpForLevel(level) {
    if (level <= 1) return 0;
    return 50 * level * (level - 1);
}
export function levelFromXp(totalXp) {
    if (totalXp <= 0) return 1;
    return Math.floor((1 + Math.sqrt(1 + totalXp / 12.5)) / 2);
}
export function getXpProgress(totalXp) {
    const level = levelFromXp(totalXp);
    const currentLevelXp = xpForLevel(level);
    const nextLevelXp = xpForLevel(level + 1);
    const xpIntoLevel = totalXp - currentLevelXp;
    const xpNeeded = nextLevelXp - currentLevelXp;
    const percentage = Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100));
    return {
        level,
        xpIntoLevel,
        xpNeeded,
        percentage,
        totalXp,
        nextLevelXp
    };
}
export const XP_REWARDS = {
    GAME_COMPLETED:     50,
    GAME_PERFECT:       150,
    GAME_MULTIPLAYER:   30,
    GAME_WIN:           100,
    DAILY_LOGIN:        50,
    QUIZ_MASTER:        150,
    EXPLORER:           100,
};
export async function awardXp(uid, amount, reason = '') {
    if (!uid || amount <= 0) return null;
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    const oldXp = data.totalXp || data.xp || 0;
    const oldLevel = levelFromXp(oldXp);
    const newTotalXp = oldXp + amount;
    const newLevel = levelFromXp(newTotalXp);
    await updateDoc(userRef, {
        totalXp: newTotalXp,
        xp: newTotalXp,
        level: newLevel
    });
    const leveledUp = newLevel > oldLevel;
    if (leveledUp && typeof window.showGeniiToast === 'function') {
        window.showGeniiToast(`Subiste para o Nível ${newLevel}! 🎉`, 'success');
    }
    return { newTotalXp, newLevel, leveledUp };
}
export async function recordGame(uid, gameResult) {
    if (!uid) return 0;
    const { correctCount = 0, totalQuestions = 0, isPublicQuiz = false, isMultiplayer = false, position = 0 } = gameResult;
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return 0;
    const data = snap.data();
    const stats = data.stats || {};
    const gamesPlayed = (stats.gamesPlayed || 0) + 1;
    const isPerfect = totalQuestions > 0 && correctCount === totalQuestions;
    const quizzesMastered = (stats.quizzesMastered || 0) + (isPerfect ? 1 : 0);
    let earnedXp = XP_REWARDS.GAME_COMPLETED;
    if (isPerfect) earnedXp += XP_REWARDS.GAME_PERFECT;
    if (isMultiplayer) {
        earnedXp += XP_REWARDS.GAME_MULTIPLAYER;
        if (position === 1) earnedXp += XP_REWARDS.GAME_WIN;
    }
    await updateDoc(userRef, {
        'stats.gamesPlayed': gamesPlayed,
        'stats.quizzesMastered': quizzesMastered
    });
    await awardXp(uid, earnedXp, `game:${isMultiplayer ? 'multi' : 'solo'}`);
    return earnedXp;
}
export async function updateStreak(uid) {
    if (!uid) return { streak: 0, activeDays: 0, isNewDay: false };
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return { streak: 0, activeDays: 0, isNewDay: false };
    const data = snap.data();
    const stats = data.stats || {};
    const today = _getTodayStr();
    const lastActive = stats.lastActiveDate || '';
    if (lastActive === today) {
        return {
            streak: stats.currentStreak || 0,
            activeDays: stats.activeDays || 0,
            isNewDay: false
        };
    }
    const yesterday = _getDateStr(new Date(Date.now() - 86400000));
    let newStreak = 1;
    if (lastActive === yesterday) {
        newStreak = (stats.currentStreak || 0) + 1;
    }
    const newActiveDays = (stats.activeDays || 0) + 1;
    const longestStreak = Math.max(stats.longestStreak || 0, newStreak);
    await updateDoc(userRef, {
        'stats.currentStreak': newStreak,
        'stats.longestStreak': longestStreak,
        'stats.activeDays': newActiveDays,
        'stats.lastActiveDate': today
    });
    return {
        streak: newStreak,
        activeDays: newActiveDays,
        isNewDay: true
    };
}
function _getTodayStr() {
    return _getDateStr(new Date());
}
function _getDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
export { _getTodayStr };
