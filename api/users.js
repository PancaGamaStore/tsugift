const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
    console.log('Users endpoint called:', req.method);

    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ message: 'Unauthorized' });
    }

    let email, role;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        email = decoded.email;
        role = decoded.role;
        console.log('Token verified for:', email, role);
        if (role !== 'admin') {
            console.log('Access denied, not an admin:', email);
            return res.status(403).json({ message: 'Access denied. Admin role required.' });
        }
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ message: 'Invalid token' });
    }

    try {
        console.log('Initializing Firebase Admin');
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS))
            });
        }
        const db = admin.firestore();

        if (req.method === 'GET') {
            console.log('Fetching all users');
            const usersSnapshot = await db.collection('users').get();
            const users = usersSnapshot.docs.map(doc => ({ email: doc.id, role: doc.data().role }));
            res.status(200).json(users);
        } else if (req.method === 'PUT') {
            const { email: userEmail, newRole } = req.body;
            if (!userEmail || !newRole || (newRole !== 'user' && newRole !== 'admin')) {
                console.log('Invalid request data:', req.body);
                return res.status(400).json({ message: 'Invalid request data' });
            }
            console.log('Updating user:', { userEmail, newRole });
            await db.collection('users').doc(userEmail).update({ role: newRole });
            res.status(200).json({ message: 'User updated' });
        } else if (req.method === 'DELETE') {
            const { email: userEmail } = req.body;
            if (!userEmail) {
                console.log('Email required for deletion');
                return res.status(400).json({ message: 'Email is required' });
            }
            if (userEmail === email) {
                console.log('Cannot delete own account:', email);
                return res.status(400).json({ message: 'Cannot delete own account' });
            }
            console.log('Deleting user:', userEmail);
            await db.collection('users').doc(userEmail).delete();
            await admin.auth().deleteUser((await admin.auth().getUserByEmail(userEmail)).uid);
            res.status(200).json({ message: 'User deleted' });
        } else {
            console.log('Method not allowed:', req.method);
            res.status(405).json({ message: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Users endpoint error:', error);
        res.status(500).json({ message: 'Internal server error: ' + error.message });
    }
}
