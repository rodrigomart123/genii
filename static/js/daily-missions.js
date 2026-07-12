import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "../../firebase-config.js";
import { awardXp, _getTodayStr } from "./gamification.js";
const MISSION_BLUEPRINTS = [
    {
        id: 'daily_login',
        title: 'Login Diário',
        description: 'Entre na plataforma hoje.',
        xpReward: 50,
        icon: 'fa-right-to-bracket',
        target: 1
    },
    {
        id: 'quiz_master',
        title: 'Mestre do Quiz',
        description: 'Complete 2 quizzes com 100% de acerto.',
        xpReward: 150,
        icon: 'fa-trophy',
        target: 2
    },
    {
        id: 'explorer',
        title: 'Explorador',
        description: 'Jogar um set da comunidade.',
        xpReward: 100,
        icon: 'fa-compass',
        target: 1
    }
];
export { MISSION_BLUEPRINTS };
export async function getDailyMissions(uid) {
    if (!uid) return { missions: [], resetHappened: false };
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return { missions: [], resetHappened: false };
    const data = snap.data();
    const today = _getTodayStr();
    const stored = data.dailyMissions || {};
    const storedDate = stored.date || '';
    if (storedDate === today && stored.missions) {
        const merged = _mergeMissionsWithBlueprints(stored.missions);
        return { missions: merged, resetHappened: false };
    }
    const freshMissions = {};
    MISSION_BLUEPRINTS.forEach(bp => {
        freshMissions[bp.id] = {
            completed: false,
            progress: 0,
            xpClaimed: false
        };
    });
    await updateDoc(userRef, {
        dailyMissions: {
            date: today,
            missions: freshMissions
        }
    });
    const merged = _mergeMissionsWithBlueprints(freshMissions);
    return { missions: merged, resetHappened: true };
}
export async function progressMission(uid, missionId, amount = 1) {
    if (!uid || !missionId) return null;
    const blueprint = MISSION_BLUEPRINTS.find(m => m.id === missionId);
    if (!blueprint) return null;
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    const today = _getTodayStr();
    const dm = data.dailyMissions || {};
    if (dm.date !== today) {
        await getDailyMissions(uid);
        const snap2 = await getDoc(userRef);
        const data2 = snap2.data();
        return _doProgress(uid, userRef, data2, missionId, blueprint, amount);
    }
    return _doProgress(uid, userRef, data, missionId, blueprint, amount);
}
async function _doProgress(uid, userRef, data, missionId, blueprint, amount) {
    const missions = data.dailyMissions?.missions || {};
    const mission = missions[missionId] || { completed: false, progress: 0, xpClaimed: false };
    if (mission.completed && mission.xpClaimed) {
        return { completed: true, xpAwarded: 0 };
    }
    const newProgress = Math.min((mission.progress || 0) + amount, blueprint.target);
    const isNowComplete = newProgress >= blueprint.target;
    const updateData = {};
    updateData[`dailyMissions.missions.${missionId}.progress`] = newProgress;
    updateData[`dailyMissions.missions.${missionId}.completed`] = isNowComplete;
    let xpAwarded = 0;
    if (isNowComplete && !mission.xpClaimed) {
        updateData[`dailyMissions.missions.${missionId}.xpClaimed`] = true;
        xpAwarded = blueprint.xpReward;
    }
    await updateDoc(userRef, updateData);
    if (xpAwarded > 0) {
        await awardXp(uid, xpAwarded, `mission:${missionId}`);
        if (typeof window.showGeniiToast === 'function') {
            window.showGeniiToast(`Missão "${blueprint.title}" completa! +${xpAwarded} XP`, 'success');
        }
    }
    return { completed: isNowComplete, xpAwarded };
}
export async function checkMissionsAfterGame(uid, context = {}) {
    if (!uid) return;
    const { isPerfect = false, isPublicQuiz = false } = context;
    if (isPerfect) {
        await progressMission(uid, 'quiz_master', 1);
    }
    if (isPublicQuiz) {
        await progressMission(uid, 'explorer', 1);
    }
}
export function timeUntilReset() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight - now;
    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { hours, minutes, seconds, totalSeconds };
}
function _mergeMissionsWithBlueprints(storedMissions) {
    return MISSION_BLUEPRINTS.map(bp => {
        const saved = storedMissions[bp.id] || {};
        return {
            ...bp,
            completed: saved.completed || false,
            progress: saved.progress || 0,
            xpClaimed: saved.xpClaimed || false
        };
    });
}
