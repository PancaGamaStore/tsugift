const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
    console.log('Validate endpoint called');
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ message: 'Unauthorized', valid: false });
    }

    try {
        console.log('Initializing Firebase Admin');
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS))
            });
        }
        const db = admin.firestore();

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token validated for:', decoded.email);
        const userRef = db.collection('users').doc(decoded.email);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            console.log('User not found:', decoded.email);
            return res.status(401).json({ message: 'User not found', valid: false });
        }
        const userData = userDoc.data();
        res.status(200).json({ valid: true, email: decoded.email, role: userData.role });
    } catch (error) {
        console.error('Token validation error:', error);
        res.status(401).json({ message: 'Invalid token', valid: false });
    }
}
