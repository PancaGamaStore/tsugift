const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
    console.log('Register endpoint called:', req.method, req.body);

    if (req.method !== 'POST') {
        console.log('Method not allowed:', req.method);
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { idToken, email } = req.body;
    if (!idToken || !email) {
        console.log('Missing idToken or email:', { idToken, email });
        return res.status(400).json({ message: 'idToken and email are required' });
    }

    try {
        console.log('Initializing Firebase Admin');
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS))
            });
        }
        const db = admin.firestore();

        console.log('Verifying Firebase ID token');
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        if (decodedToken.email !== email) {
            console.log('Email mismatch:', { tokenEmail: decodedToken.email, providedEmail: email });
            return res.status(400).json({ message: 'Email mismatch' });
        }

        console.log('Checking if user exists in Firestore');
        const userRef = db.collection('users').doc(email);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
            console.log('User already registered:', email);
            return res.status(400).json({ message: 'Email already registered' });
        }

        console.log('Creating user document in Firestore:', { email, role: 'user' });
        await userRef.set({ email, role: 'user' });

        const token = jwt.sign({ email, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '30m' });
        console.log('Registration successful, token generated');
        res.status(200).json({ token });
    } catch (error) {
        console.error('Register error:', error);
        if (error.code === 'auth/invalid-id-token') {
            res.status(401).json({ message: 'Invalid Firebase ID token' });
        } else {
            res.status(500).json({ message: 'Internal server error: ' + error.message });
        }
    }
}
