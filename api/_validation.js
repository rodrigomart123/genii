import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
const ALGORITHM = 'aes-256-gcm';
let _key = null;
function getKey() {
    if (!_key) {
        const raw = process.env.ANSWER_VALIDATION_SECRET ||
                    process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!raw) throw new Error('ANSWER_VALIDATION_SECRET or FIREBASE_SERVICE_ACCOUNT must be set');
        _key = createHash('sha256').update(raw + ':genii-answers-v1').digest();
    }
    return _key;
}
export function encryptAnswer(data) {
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, getKey(), iv);
    let enc = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    enc += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return iv.toString('hex') + ':' + tag + ':' + enc;
}
export function decryptAnswer(token) {
    try {
        const [ivHex, tagHex, enc] = token.split(':');
        if (!ivHex || !tagHex || !enc) return null;
        const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
        let dec = decipher.update(enc, 'hex', 'utf8');
        dec += decipher.final('utf8');
        return JSON.parse(dec);
    } catch {
        return null;
    }
}
