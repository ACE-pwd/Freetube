const { requireSecret } = require('./config');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs');
const { openDatabase } = require('./database');
const { createUsers } = require('./users');
const { createTopicsRouter } = require('./topics');
const { setupCourses, createCoursesRouter, isAdmin, adminOnly } = require('./courses');
const { isValidToken } = require('./middleware');

async function createApp({ databasePath } = {}) {
    requireSecret();
    const db = openDatabase(databasePath);
    let users;
    try {
        await db.ready;
        users = await createUsers(db);
        await setupCourses(db);
    } catch (error) {
        await db.close();
        throw error;
    }
    const app = express();
    app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true }));
    app.use(express.json({ limit: '1mb' }));
    const publicUser = ({ id, email, name, createdAt }) => ({ id, email, name, createdAt, isAdmin: isAdmin({ email }) });
    function credentials(req, res, next) {
        const { email, password } = req.body || {};
        if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
            email.length > 254 || typeof password !== 'string' || !password || Buffer.byteLength(password) > 72) {
            return res.status(400).json({ message: 'Provide a valid email and password (up to 72 bytes)' });
        }
        req.credentials = { email: email.trim().toLowerCase(), password };
        next();
    }
    app.post('/signup', credentials, async (req, res) => {
        const { email, password } = req.credentials;
        const { name = '' } = req.body;
        if (typeof name !== 'string' || name.length > 100 || password.length < 8) {
            return res.status(400).json({ message: 'Use a password of at least 8 characters and a name of up to 100 characters' });
        }
        if (await users.byEmail(email)) return res.status(422).json({ message: 'User already exists' });
        try {
            const user = await users.create({ name: name.trim(), email, password: await bcrypt.hash(password, 10) });
            res.status(201).json({ message: 'User created successfully! Please log in.', user: publicUser(user) });
        } catch (error) {
            if (error.code === 'P2002' || error.code === 'SQLITE_CONSTRAINT') return res.status(422).json({ message: 'User already exists' });
            throw error;
        }
    });
    app.post('/login', credentials, async (req, res) => {
        const { email, password } = req.credentials;
        const user = await users.byEmail(email);
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ message: 'Incorrect email or password' });
        }
        const token = jwt.sign({ id: user.id, email: user.email }, process.env.SECRET_KEY, { expiresIn: '1d', algorithm: 'HS256' });
        res.json({ message: 'Login successful', token, email: user.email });
    });
    app.get('/me', isValidToken, async (req, res) => {
        const user = await users.byId(req.user.id);
        if (!user) return res.status(401).json({ message: 'Account not found' });
        res.json(publicUser(user));
    });
    // Legacy route returns only the signed-in user's public fields.
    app.get('/users', isValidToken, async (req, res) => {
        const user = await users.byId(req.user.id);
        if (!user) return res.status(401).json({ message: 'Account not found' });
        res.json({ users: [publicUser(user)] });
    });
    app.use('/api/courses', createCoursesRouter(db, users));
    app.use('/api/topics', (req, res, next) => {
        if (['GET', 'HEAD'].includes(req.method)) return next();
        isValidToken(req, res, () => adminOnly(req, res, next));
    }, createTopicsRouter(db));
    app.get('/health', (req, res) => res.json({ status: 'ok' }));
    app.use('/api', (req, res) => res.status(404).json({ message: 'API endpoint not found' }));
    const dist = path.join(__dirname, '../Frontend/FreeLearn/dist');
    if (fs.existsSync(path.join(dist, 'index.html'))) {
        app.use(express.static(dist));
        app.get('/{*path}', (req, res) => res.sendFile(path.join(dist, 'index.html')));
    } else {
        app.get('/', (req, res) => res.send('Server is running'));
    }
    app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);
        const status = error.status === 400 || error.status === 413 ? error.status : 500;
        if (status === 500) console.error(error);
        res.status(status).json({ message: status === 500 ? 'Something went wrong' : 'Invalid request body' });
    });
    return { app, close: async () => { await users.close(); await db.close(); } };
}

if (require.main === module) {
    createApp().then(({ app, close }) => {
        const port = process.env.PORT || 3000;
        const server = app.listen(port, () => console.log(`FreeLearn running on http://localhost:${port}`));
        for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => close().then(() => process.exit(0))));
    }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { createApp };
