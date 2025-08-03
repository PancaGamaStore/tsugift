const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    const client = new MongoClient(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db('tsukoyomi_store');
        const users = db.collection('users');

        const existingUser = await users.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await users.insertOne({ email, password: hashedPassword, role: 'user' });

        const token = jwt.sign({ email, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '30m' });
        res.status(200).json({ token });
    } catch (error) {
        console.error('Register error:', error);
        if (error.name === 'MongoServerError' && error.code === 11000) {
            res.status(400).json({ message: 'Email already registered' });
        } else if (error.name === 'MongoNetworkError') {
            res.status(500).json({ message: 'MongoDB connection failed. Check MONGODB_URI and network settings.' });
        } else {
            res.status(500).json({ message: 'Internal server error: ' + error.message });
        }
    } finally {
        await client.close();
        console.log('MongoDB connection closed');
    }
}
