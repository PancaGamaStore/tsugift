const { MongoClient } = require('mongodb');
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

    const client = new MongoClient(process.env.MONGODB_URI, {
        connectTimeoutMS: 10000,
        serverSelectionTimeoutMS: 10000
    });

    try {
        console.log('Attempting to connect to MongoDB');
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db('tsukoyomi_store');
        const users = db.collection('users');

        if (req.method === 'GET') {
            console.log('Fetching all users');
            const allUsers = await users.find({}, { projection: { email: 1, role: 1, _id: 0 } }).toArray();
            res.status(200).json(allUsers);
        } else if (req.method === 'PUT') {
            const { oldEmail, newEmail, newRole } = req.body;
            if (!oldEmail || !newEmail || !newRole || (newRole !== 'user' && newRole !== 'admin')) {
                console.log('Invalid request data:', req.body);
                return res.status(400).json({ message: 'Invalid request data' });
            }
            console.log('Updating user:', { oldEmail, newEmail, newRole });
            const result = await users.updateOne(
                { email: oldEmail },
                { $set: { email: newEmail, role: newRole } }
            );
            if (result.matchedCount === 0) {
                console.log('User not found:', oldEmail);
                return res.status(404).json({ message: 'User not found' });
            }
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
            const result = await users.deleteOne({ email: userEmail });
            if (result.deletedCount === 0) {
                console.log('User not found:', userEmail);
                return res.status(404).json({ message: 'User not found' });
            }
            res.status(200).json({ message: 'User deleted' });
        } else {
            console.log('Method not allowed:', req.method);
            res.status(405).json({ message: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Users endpoint error:', error);
        if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
            res.status(500).json({ message: 'MongoDB connection failed. Check MONGODB_URI and network settings.' });
        } else if (error.name === 'MongoServerError' && error.code === 11000) {
            res.status(400).json({ message: 'Email already registered' });
        } else {
            res.status(500).json({ message: 'Internal server error: ' + error.message });
        }
    } finally {
        await client.close();
        console.log('MongoDB connection closed');
    }
}
