const express = require('express');
const { isValidToken } = require('./middleware');
const difficulties = ['easy', 'medium', 'hard'];

function createTopicsRouter(db) {
    const router = express.Router();
    router.get('/', async (req, res) => {
        const { page = '1', limit = '5', search = '', difficulty = '', sort = 'date_newest' } = req.query;
        const sorts = { title_asc: 'title ASC, id ASC', title_desc: 'title DESC, id DESC', date_newest: 'createdAt DESC, id DESC', date_oldest: 'createdAt ASC, id ASC' };
        if (![page, limit, search, difficulty, sort].every(value => typeof value === 'string') ||
            !/^\d+$/.test(page) || !/^\d+$/.test(limit) || !Number.isSafeInteger(Number(page)) ||
            Number(page) < 1 || Number(limit) < 1 || Number(limit) > 100 ||
            (difficulty && !difficulties.includes(difficulty)) || !Object.hasOwn(sorts, sort)) {
            return res.status(400).json({ message: 'Invalid pagination, difficulty, or sort parameters' });
        }
        const clauses = [], params = [];
        if (search) { clauses.push('title LIKE ?'); params.push(`%${search}%`); }
        if (difficulty) { clauses.push('difficulty = ?'); params.push(difficulty); }
        const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
        const { count } = await db.get(`SELECT COUNT(*) AS count FROM topics${where}`, params);
        const totalPages = Math.ceil(count / Number(limit));
        const currentPage = Math.min(Number(page), Math.max(1, totalPages));
        const topics = await db.all(`SELECT * FROM topics${where} ORDER BY ${sorts[sort]} LIMIT ? OFFSET ?`, [...params, Number(limit), (currentPage - 1) * Number(limit)]);
        res.json({ topics, pagination: { totalItems: count, totalPages, currentPage, itemsPerPage: Number(limit) } });
    });
    router.use(isValidToken);
    router.param('id', (req, res, next, id) => {
        if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) {
            return res.status(400).json({ message: 'Invalid topic ID' });
        }
        next();
    });
    router.get('/:id', async (req, res) => {
        const topic = await db.get('SELECT * FROM topics WHERE id = ?', [req.params.id]);
        if (!topic) return res.status(404).json({ message: 'Topic not found' });
        res.json(topic);
    });
    function validate(req, res, next) {
        const { title, description = '', difficulty = 'easy' } = req.body || {};
        if (typeof title !== 'string' || !title.trim() || title.trim().length > 200 ||
            typeof description !== 'string' || description.length > 10000 || !difficulties.includes(difficulty)) {
            return res.status(400).json({ message: 'Provide a title (1–200 characters), description (up to 10000 characters), and valid difficulty' });
        }
        req.topic = { title: title.trim(), description: description.trim(), difficulty };
        next();
    }
    router.post('/', validate, async (req, res) => {
        const { title, description, difficulty } = req.topic;
        const { id } = await db.run('INSERT INTO topics (title, description, difficulty) VALUES (?, ?, ?)', [title, description, difficulty]);
        res.status(201).json({ ...await db.get('SELECT * FROM topics WHERE id = ?', [id]), message: 'Topic created successfully' });
    });
    router.put('/:id', validate, async (req, res) => {
        const { title, description, difficulty } = req.topic;
        const { changes } = await db.run('UPDATE topics SET title = ?, description = ?, difficulty = ? WHERE id = ?', [title, description, difficulty, req.params.id]);
        if (!changes) return res.status(404).json({ message: 'Topic not found' });
        res.json({ message: 'Topic updated successfully' });
    });
    router.delete('/:id', async (req, res) => {
        const { changes } = await db.run('DELETE FROM topics WHERE id = ?', [req.params.id]);
        if (!changes) return res.status(404).json({ message: 'Topic not found' });
        res.json({ message: 'Topic deleted successfully' });
    });
    return router;
}
module.exports = { createTopicsRouter };
