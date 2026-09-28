// Backwards-compatible standalone topics service. Normal startup uses Auth.js,
// which now includes both auth and topics on the same port.
const { requireSecret } = require('./config');
const express = require('express');
const cors = require('cors');
const { openDatabase } = require('./database');
const { isValidToken } = require('./middleware');
const { adminOnly } = require('./courses');
const { createTopicsRouter } = require('./topics');

async function start() {
    requireSecret();
    const db = openDatabase();
    await db.ready;
    const app = express();
    app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true }));
    app.use(express.json({ limit: '32kb' }));
    app.use('/api/topics', (req, res, next) => {
        if (['GET', 'HEAD'].includes(req.method)) return next();
        isValidToken(req, res, () => adminOnly(req, res, next));
    }, createTopicsRouter(db));
    app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);
        res.status(error.status || 500).json({ message: 'Unable to process request' });
    });
    const port = process.env.TOPICS_PORT || 4000;
    const server = app.listen(port, () => console.log(`Topics server running on http://localhost:${port}`));
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => db.close().then(() => process.exit(0))));
}
start().catch(error => { console.error(error.message); process.exitCode = 1; });
