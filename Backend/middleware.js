const jwt = require('jsonwebtoken');

function isValidToken(req, res, next) {
    const match = /^Bearer (\S+)$/i.exec(req.headers.authorization || '');
    if (!match) return res.status(401).json({ message: 'Access token required' });
    try {
        req.user = jwt.verify(match[1], process.env.SECRET_KEY, { algorithms: ['HS256'] });
        if (!req.user.id) throw new Error('Missing user');
        next();
    } catch {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}
module.exports = { isValidToken };
