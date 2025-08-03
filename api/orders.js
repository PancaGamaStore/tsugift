const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
    console.log('Orders endpoint called:', req.method);

    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ message: 'Unauthorized' });
    }

    let email;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        email = decoded.email;
        console.log('Token verified for user:', email);
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
        const orders = db.collection('orders');

        if (req.method === 'POST') {
            const orderData = req.body;
            orderData.email = email;
            console.log('Inserting order:', orderData);
            await orders.insertOne(orderData);
            res.status(200).json({ message: 'Order saved' });
        } else if (req.method === 'GET') {
            console.log('Fetching orders for:', email);
            const userOrders = await orders.find({ email }).toArray();
            res.status(200).json(userOrders);
        } else {
            console.log('Method not allowed:', req.method);
            res.status(405).json({ message: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Orders error:', error);
        if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
            res.status(500).json({ message: 'MongoDB connection failed. Check MONGODB_URI and network settings.' });
        } else {
            res.status(500).json({ message: 'Internal server error: ' + error.message });
        }
    } finally {
        await client.close();
        console.log('MongoDB connection closed');
    }
}
