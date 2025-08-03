const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
    console.log('Register endpoint called:', req.method, req.body);

    if (req.method !== 'POST') {
        console.log('Method not allowed:', req.method);
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { email, password } = req.body;
    if (!email || !password) {
        console.log('Missing email or password:', { email, password });
        return res.status(400).json({ message: 'Email and password are required' });
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

        const existingUser = await users.findOne({ email });
        if (existingUser) {
            console.log('Email already registered:', email);
            return res.status(400).json({ message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Inserting new user:', { email, role: 'user' });
        await users.insertOne({ email, password: hashedPassword, role: 'user' });

        const token = jwt.sign({ email, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '30m' });
        console.log('Registration successful, token generated');
        res.status(200).json({ token });
    } catch (error) {
        console.error('Register error:', error);
        if (error.name === 'MongoServerError' && error.code === 11000) {
            res.status(400).json({ message: 'Email already registered' });
        } else if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
            res.status(500).json({ message: 'MongoDB connection failed. Check MONGODB_URI and network settings.' });
        } else {
            res.status(500).json({ message: 'Internal server error: ' + error.message });
        }
    } finally {
        await client.close();
        console.log('MongoDB connection closed');
    }
}
