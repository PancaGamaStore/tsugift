export default function handler(req, res) {
    console.log('Logout endpoint called:', req.method);
    if (req.method !== 'POST') {
        console.log('Method not allowed:', req.method);
        return res.status(405).json({ message: 'Method not allowed' });
    }
    res.status(200).json({ message: 'Logged out successfully' });
}
