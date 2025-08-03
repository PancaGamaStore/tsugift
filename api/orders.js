const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    let email;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        email = decoded.email;
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        const db = client.db('tsukoyomi_store');
        const orders = db.collection('orders');

        if (req.method === 'POST') {
            const orderData = req.body;
            orderData.email = email;
            await orders.insertOne(orderData);
            res.status(200).json({ message: 'Order saved' });
        } else if (req.method === 'GET') {
            const userOrders = await orders.find({ email }).toArray();
            res.status(200).json(userOrders);
        } else {
            res.status(405).json({ message: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Orders error:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        await client.close();
    }
}
