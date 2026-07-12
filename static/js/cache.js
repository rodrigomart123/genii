const CACHE_PREFIX = "genii_cache_";
const DEFAULT_TTL = 5 * 60 * 1000;
function _key(collection, id) {
    return CACHE_PREFIX + collection + "_" + id;
}
function _metaKey(collection, id) {
    return CACHE_PREFIX + collection + "_" + id + "_ts";
}
export function getCache(collection, id, ttl = DEFAULT_TTL) {
    try {
        const key = _key(collection, id);
        const metaKey = _metaKey(collection, id);
        const ts = sessionStorage.getItem(metaKey);
        if (ts && Date.now() - parseInt(ts) > ttl) {
            sessionStorage.removeItem(key);
            sessionStorage.removeItem(metaKey);
            return null;
        }
        const data = sessionStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
}
export function setCache(collection, id, data, ttl = DEFAULT_TTL) {
    try {
        const key = _key(collection, id);
        const metaKey = _metaKey(collection, id);
        sessionStorage.setItem(key, JSON.stringify(data));
        sessionStorage.setItem(metaKey, Date.now().toString());
    } catch (e) {
        console.warn("Cache set failed:", e);
    }
}
export function invalidateCache(collection, id) {
    try {
        sessionStorage.removeItem(_key(collection, id));
        sessionStorage.removeItem(_metaKey(collection, id));
    } catch (e) {}
}
export function clearAllCache() {
    try {
        const keysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith(CACHE_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => sessionStorage.removeItem(k));
    } catch (e) {}
}
const memoryCache = new Map();
export function getMemCache(key) {
    return memoryCache.get(key) || null;
}
export function setMemCache(key, value) {
    memoryCache.set(key, value);
}
export function invalidateMemCache(key) {
    memoryCache.delete(key);
}
let sharedUserData = null;
let sharedUserDataPromise = null;
export function getSharedUserData() {
    return sharedUserData;
}
export function setSharedUserData(data) {
    sharedUserData = data;
}
export function invalidateSharedUserData() {
    sharedUserData = null;
    sharedUserDataPromise = null;
}
export async function cachedFetch(db, collection, id, getDocFn, ttl = DEFAULT_TTL) {
    const cached = getCache(collection, id, ttl);
    if (cached) return cached;
    const snap = await getDocFn(db, collection, id);
    if (!snap.exists()) return null;
    const data = { id: snap.id, ...snap.data() };
    setCache(collection, id, data, ttl);
    return data;
}
const USER_CACHE_KEY = "genii_user_cache";
const USER_CACHE_TTL = 30 * 60 * 1000;
export function getCachedUser() {
    try {
        const cached = localStorage.getItem(USER_CACHE_KEY);
        if (!cached) return null;
        const parsed = JSON.parse(cached);
        if (parsed._cachedAt && Date.now() - parsed._cachedAt > USER_CACHE_TTL) {
            localStorage.removeItem(USER_CACHE_KEY);
            return null;
        }
        return parsed;
    } catch (e) {
        return null;
    }
}
export function saveUserToCache(userData) {
    if (userData) {
        const data = { ...userData, _cachedAt: Date.now() };
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(data));
    }
}
export function invalidateUserCache() {
    localStorage.removeItem(USER_CACHE_KEY);
}
