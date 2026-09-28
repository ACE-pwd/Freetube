const express = require('express');
const { randomUUID } = require('node:crypto');
const { isValidToken } = require('./middleware');

const isAdmin = user => (process.env.ADMIN_EMAILS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean).includes(user?.email?.toLowerCase());
const adminOnly = (req, res, next) => isAdmin(req.user) ? next() : res.status(403).json({ message: 'Only course editors can change the catalogue' });

function youtubeId(value) {
    if (typeof value !== 'string') return null;
    if (/^[\w-]{11}$/.test(value)) return value;
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:') return null;
        const id = url.hostname === 'youtu.be' ? url.pathname.slice(1) :
            ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname) ?
                (url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(embed|shorts)\/([\w-]{11})$/.exec(url.pathname)?.[2]) : null;
        return /^[\w-]{11}$/.test(id || '') ? id : null;
    } catch { return null; }
}
async function setupCourses(db) {
    await db.run(`CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL,
        difficulty TEXT NOT NULL, description TEXT NOT NULL, materials TEXT NOT NULL,
        outcome TEXT NOT NULL, status TEXT NOT NULL, lessons TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP, updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    const columns = await db.all('PRAGMA table_info(courses)');
    if (!columns.some(c => c.name === 'prerequisites')) await db.run("ALTER TABLE courses ADD COLUMN prerequisites TEXT NOT NULL DEFAULT '[]'");
    await db.run(`CREATE TABLE IF NOT EXISTS course_views (
        courseId TEXT NOT NULL, userId TEXT NOT NULL, viewedOn TEXT NOT NULL,
        PRIMARY KEY(courseId, userId, viewedOn)
    )`);
    await db.run(`CREATE TABLE IF NOT EXISTS lesson_progress (
        userId TEXT NOT NULL, courseId TEXT NOT NULL, lessonId TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0, updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(userId, courseId, lessonId)
    )`);
}
function validateCourse(body) {
    const result = {};
    for (const [key, max] of Object.entries({ title: 200, category: 80, description: 3000, materials: 2000, outcome: 2000 })) {
        const value = body?.[key];
        if (typeof value !== 'string' || value.length > max || (['title', 'category'].includes(key) && !value.trim())) throw new Error(`Provide a valid ${key} (up to ${max} characters)`);
        result[key] = value.trim();
    }
    if (!['easy', 'medium', 'hard'].includes(body.difficulty) || !['draft', 'published'].includes(body.status)) throw new Error('Choose a difficulty and publication status');
    const prerequisites = body.prerequisites ?? [];
    if (!Array.isArray(prerequisites) || prerequisites.length > 20 || prerequisites.some(p => typeof p !== 'string' || !p.trim() || p.length > 300)) throw new Error('Provide up to 20 prerequisite topics, each up to 300 characters');
    result.prerequisites = [...new Set(prerequisites.map(p => p.trim()))];
    if (body.status === 'published' && body.difficulty !== 'easy' && !result.prerequisites.length) throw new Error('Intermediate and advanced courses require prerequisite topics before publishing');
    result.difficulty = body.difficulty; result.status = body.status;
    if (!Array.isArray(body.lessons) || body.lessons.length > 200) throw new Error('A course can contain up to 200 lessons');
    const ids = new Set();
    result.lessons = body.lessons.map(lesson => {
        if (!lesson || typeof lesson !== 'object') throw new Error('Invalid lesson');
        const id = lesson.id || randomUUID();
        if (typeof id !== 'string' || !/^[\w-]{1,80}$/.test(id) || ids.has(id)) throw new Error('Lesson IDs must be unique');
        ids.add(id);
        const clean = { id };
        for (const [key, max] of Object.entries({ title: 200, module: 100, creator: 200, practice: 4000 })) {
            const value = lesson[key] ?? '';
            if (typeof value !== 'string' || value.length > max || (key === 'title' && !value.trim())) throw new Error(`Provide a valid lesson ${key}`);
            clean[key] = value.trim();
        }
        clean.videoId = lesson.videoId ? youtubeId(lesson.videoId) : '';
        if (lesson.videoId && !clean.videoId) throw new Error('Use a valid YouTube video URL or ID');
        if (!Number.isInteger(lesson.minutes) || lesson.minutes < 1 || lesson.minutes > 1440) throw new Error('Lesson time must be 1–1440 minutes');
        clean.minutes = lesson.minutes;
        if (body.status === 'published' && ((!clean.videoId && !clean.practice) || (clean.videoId && !clean.creator))) throw new Error('Published lessons need a video with creator credit or a written practice task');
        return clean;
    });
    if (result.status === 'published' && (!result.lessons.length || !result.outcome || !result.materials || !result.description)) throw new Error('Add lessons, description, materials and outcome before publishing');
    return result;
}
const courseSelect = 'SELECT courses.*, (SELECT COUNT(*) FROM course_views WHERE courseId = courses.id) AS views FROM courses';
const parse = row => ({ ...row, views: row.views || 0, prerequisites: JSON.parse(row.prerequisites || '[]'), lessons: JSON.parse(row.lessons) });

async function importPlaylist(value, fetcher = fetch) {
    if (!process.env.YOUTUBE_API_KEY) { const error = new Error('Playlist import needs YOUTUBE_API_KEY on the server. You can add individual YouTube links below without a key.'); error.status = 503; throw error; }
    let playlistId;
    try { const url = new URL(value); if (!['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname) || url.protocol !== 'https:') throw new Error(); playlistId = url.searchParams.get('list'); } catch { /* checked below */ }
    if (!/^[\w-]{10,100}$/.test(playlistId || '')) { const error = new Error('Paste a valid YouTube playlist URL'); error.status = 400; throw error; }
    async function api(endpoint, params) {
        const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
        for (const [key, value] of Object.entries({ ...params, key: process.env.YOUTUBE_API_KEY })) url.searchParams.set(key, value);
        const response = await fetcher(url, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) { const error = new Error('YouTube could not load this playlist. Check that it is public and your API key has available quota.'); error.status = 502; throw error; }
        return response.json();
    }
    const lessons = []; let pageToken = '', skipped = 0;
    do {
        const page = await api('playlistItems', { part: 'snippet,contentDetails', playlistId, maxResults: '50', ...(pageToken ? { pageToken } : {}) });
        const items = page.items || [];
        const ids = items.map(x => x.contentDetails?.videoId).filter(Boolean);
        const videos = ids.length ? await api('videos', { part: 'snippet,status,contentDetails', id: ids.join(',') }) : { items: [] };
        const byId = new Map((videos.items || []).map(x => [x.id, x]));
        for (const item of items) {
            const video = byId.get(item.contentDetails?.videoId);
            if (!video || !video.status?.embeddable || video.status?.privacyStatus !== 'public') { skipped++; continue; }
            lessons.push({ id: randomUUID(), title: video.snippet.title, creator: video.snippet.channelTitle, videoId: video.id, module: '', practice: '', minutes: 15 });
        }
        pageToken = page.nextPageToken || '';
        if (pageToken && lessons.length + skipped >= 200) { const error = new Error('This playlist exceeds 200 entries. Import a smaller playlist.'); error.status = 400; throw error; }
    } while (pageToken);
    return { lessons, skipped, message: 'Review lesson order, practice tasks and estimated study times before publishing.' };
}
function createCoursesRouter(db, users, { fetcher } = {}) {
    const router = express.Router();
    const get = async id => { const row = await db.get(`${courseSelect} WHERE id = ?`, [id]); return row && parse(row); };
    router.get('/', async (req, res) => {
        const rows = await db.all(`${courseSelect} WHERE status = 'published' ORDER BY createdAt DESC, id`);
        res.json({ courses: rows.map(parse) });
    });
    router.use(isValidToken);
    router.use(async (req, res, next) => {
        const user = await users.byId(req.user.id);
        if (!user) return res.status(401).json({ message: 'Account not found' });
        req.user = user; next();
    });
    router.get('/manage', adminOnly, async (req, res) => res.json({ courses: (await db.all(`${courseSelect} ORDER BY createdAt DESC, id`)).map(parse) }));
    router.post('/import-playlist', adminOnly, async (req, res) => {
        try { res.json(await importPlaylist(req.body?.url, fetcher)); }
        catch (error) { res.status(error.status || 502).json({ message: error.status ? error.message : 'YouTube is temporarily unavailable. Please try again.' }); }
    });
    router.get('/progress', async (req, res) => {
        const courses = (await db.all(`${courseSelect} WHERE status = 'published'`)).map(parse);
        const progress = await db.all('SELECT * FROM lesson_progress WHERE userId = ?', [String(req.user.id)]);
        res.json({ courses: courses.map(course => ({ ...course, completed: course.lessons.filter(lesson => progress.some(p => p.courseId === course.id && p.lessonId === lesson.id && p.completed === 1)).map(l => l.id) })).filter(course => progress.some(p => p.courseId === course.id)) });
    });
    router.post('/', adminOnly, async (req, res) => {
        let course; try { course = validateCourse(req.body); } catch (error) { return res.status(400).json({ message: error.message }); }
        const id = randomUUID();
        await db.run('INSERT INTO courses (id,title,category,difficulty,description,materials,outcome,status,lessons,prerequisites) VALUES (?,?,?,?,?,?,?,?,?,?)', [id, course.title, course.category, course.difficulty, course.description, course.materials, course.outcome, course.status, JSON.stringify(course.lessons), JSON.stringify(course.prerequisites)]);
        res.status(201).json(await get(id));
    });
    router.get('/:id', async (req, res) => {
        const course = await get(req.params.id);
        if (!course || (course.status !== 'published' && !isAdmin(req.user))) return res.status(404).json({ message: 'Course not found' });
        const rows = await db.all('SELECT lessonId FROM lesson_progress WHERE userId = ? AND courseId = ? AND completed = 1', [String(req.user.id), course.id]);
        res.json({ ...course, completed: rows.map(x => x.lessonId).filter(id => course.lessons.some(l => l.id === id)) });
    });
    router.put('/:id', adminOnly, async (req, res) => {
        if (!await get(req.params.id)) return res.status(404).json({ message: 'Course not found' });
        let course; try { course = validateCourse(req.body); } catch (error) { return res.status(400).json({ message: error.message }); }
        await db.run('UPDATE courses SET title=?,category=?,difficulty=?,description=?,materials=?,outcome=?,status=?,lessons=?,prerequisites=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?', [course.title, course.category, course.difficulty, course.description, course.materials, course.outcome, course.status, JSON.stringify(course.lessons), JSON.stringify(course.prerequisites), req.params.id]);
        res.json(await get(req.params.id));
    });
    router.post('/:id/view', async (req, res) => {
        const course = await get(req.params.id);
        if (!course || course.status !== 'published') return res.status(404).json({ message: 'Published course not found' });
        // One view per learner per course per UTC day; refreshes and editor previews do not inflate popularity.
        if (!isAdmin(req.user)) await db.run(`INSERT OR IGNORE INTO course_views (courseId,userId,viewedOn) VALUES (?,?,date('now'))`, [course.id, String(req.user.id)]);
        res.json({ views: (await get(course.id)).views });
    });
    router.put('/:id/progress/:lessonId', async (req, res) => {
        const course = await get(req.params.id);
        if (!course || course.status !== 'published' || !course.lessons.some(l => l.id === req.params.lessonId)) return res.status(404).json({ message: 'Published lesson not found' });
        if (typeof req.body?.completed !== 'boolean') return res.status(400).json({ message: 'Completion must be true or false' });
        await db.run(`INSERT INTO lesson_progress (userId,courseId,lessonId,completed) VALUES (?,?,?,?) ON CONFLICT(userId,courseId,lessonId) DO UPDATE SET completed=excluded.completed,updatedAt=CURRENT_TIMESTAMP`, [String(req.user.id), course.id, req.params.lessonId, Number(req.body.completed)]);
        res.json({ completed: req.body.completed });
    });
    return router;
}
module.exports = { setupCourses, createCoursesRouter, isAdmin, adminOnly, validateCourse, youtubeId, importPlaylist };
