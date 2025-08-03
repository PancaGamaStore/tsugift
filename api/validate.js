const jwt = require('jsonwebtoken');

export default function handler(req, res) {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized', valid: false });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.status(200).json({ valid: true, email: decoded.email });
    } catch (error) {
        res.status(401).json({ message: 'Invalid token', valid: false });
    }
}
