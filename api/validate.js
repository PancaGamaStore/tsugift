const jwt = require('jsonwebtoken');

export default function handler(req, res) {
    console.log('Validate endpoint called');
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ message: 'Unauthorized', valid: false });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token validated for:', decoded.email);
        res.status(200).json({ valid: true, email: decoded.email, role: decoded.role });
    } catch (error) {
        console.error('Token validation error:', error);
        res.status(401).json({ message: 'Invalid token', valid: false });
    }
}
