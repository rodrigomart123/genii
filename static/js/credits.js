import { auth } from '../../firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
const CREDITS_KEY = 'genii_credits';
const MAX_DAILY = 100;
let _userReady = null;
function getAuthenticatedUser() {
    if (auth.currentUser) return Promise.resolve(auth.currentUser);
    if (_userReady) return _userReady;
    _userReady = new Promise((resolve) => {
        const unsub = onAuthStateChanged(auth, (user) => {
            if (user) {
                unsub();
                resolve(user);
            }
        });
    });
    return _userReady;
}
export const API_COSTS = {
    chat: 1,
    image: 5,
    quizAuto: 2,
};
function getCachedCredits() {
    try {
        const raw = localStorage.getItem(CREDITS_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        const today = new Date().toISOString().slice(0, 10);
        if (data.date !== today) return null;
        return data.remaining;
    } catch {
        return null;
    }
}
let _initialLoad = true;
function initCreditsFromCache() {
    const cached = getCachedCredits();
    if (cached !== null) {
        updateCreditsUI(cached, true);
    }
}
initCreditsFromCache();
function cacheCredits(remaining) {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(CREDITS_KEY, JSON.stringify({ remaining, date: today }));
    updateCreditsUI(remaining, _initialLoad);
    _initialLoad = false;
}
function updateCreditsUI(remaining, skipAnimation = false) {
    const ids = [
        { el: 'widget-credits-count', badge: 'widgetCredits' },
        { el: 'mobile-credits-count', badge: 'mobileCredits' },
        { el: 'studio-credits-count', badge: 'studioCredits' },
    ];
    for (const { el: elId, badge: badgeId } of ids) {
        const el = document.getElementById(elId);
        if (!el) continue;
        const current = parseInt(el.textContent);
        if (!skipAnimation && !isNaN(current) && current !== remaining) {
            animateCreditsChange(el, current, remaining);
        } else {
            el.textContent = remaining;
        }
        const badge = document.getElementById(badgeId);
        if (badge) {
            if (remaining <= 0) badge.classList.add('empty');
            else badge.classList.remove('empty');
        }
    }
}
function animateCreditsChange(el, from, to) {
    const diff = to - from;
    const steps = Math.min(Math.abs(diff), 10);
    const stepTime = 30;
    let step = 0;
    el.classList.add('credits-spending');
    const interval = setInterval(() => {
        step++;
        const progress = step / steps;
        const current = Math.round(from + diff * progress);
        el.textContent = current;
        if (step >= steps) {
            clearInterval(interval);
            el.textContent = to;
            setTimeout(() => el.classList.remove('credits-spending'), 200);
        }
    }, stepTime);
}
export async function getAuthHeaders() {
    const user = await getAuthenticatedUser();
    if (!user) return {};
    const token = await user.getIdToken();
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}
export async function refreshCredits() {
    try {
        const headers = await getAuthHeaders();
        const res = await fetch('/api/credits', { headers });
        if (!res.ok) return getCachedCredits() ?? MAX_DAILY;
        const data = await res.json();
        cacheCredits(data.remaining);
        return data.remaining;
    } catch {
        return getCachedCredits() ?? MAX_DAILY;
    }
}
export function updateCreditsAfterSpend(remaining) {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(CREDITS_KEY, JSON.stringify({ remaining, date: today }));
    updateCreditsUI(remaining, false);
}
export function showCreditsWarning() {
    if (typeof window.showGeniiToast === 'function') {
        window.showGeniiToast('Créditos insuficientes! Tenta amanhã.', 'error');
    }
}
