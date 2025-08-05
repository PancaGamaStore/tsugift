const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
    console.log('Login endpoint called:', req.method, req.body);

    if (req.method !== 'POST') {
        console.log('Method not allowed:', req.method);
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { idToken } = req.body;
    if (!idToken) {
        console.log('Missing idToken:', req.body);
        return res.status(400).json({ message: 'idToken is required' });
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
        const email = decodedToken.email;

        console.log('Fetching user document from Firestore:', email);
        const userRef = db.collection('users').doc(email);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            console.log('User not found in Firestore:', email);
            return res.status(401).json({ message: 'User not found' });
        }

        const userData = userDoc.data();
        const token = jwt.sign({ email, role: userData.role }, process.env.JWT_SECRET, { expiresIn: '30m' });
        console.log('Login successful, token generated for:', email);
        res.status(200).json({ token });
    } catch (error) {
        console.error('Login error:', error);
        if (error.code === 'auth/invalid-id-token') {
            res.status(401).json({ message: 'Invalid Firebase ID token' });
        } else {
            res.status(500).json({ message: 'Internal server error: ' + error.message });
        }
    }
}
