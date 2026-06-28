import admin from 'firebase-admin';

let _db = null;
let _auth = null;

function init() {
    if (admin.apps.length) return;
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not set');
    const sa = JSON.parse(raw);
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: sa.project_id,
            clientEmail: sa.client_email,
            privateKey: sa.private_key.replace(/\\n/g, '\n'),
        }),
    });
}

export function getDb() {
    if (!_db) { init(); _db = admin.firestore(); }
    return _db;
}

export function getAuth() {
    if (!_auth) { init(); _auth = admin.auth(); }
    return _auth;
}
