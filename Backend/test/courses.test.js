const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
process.env.SECRET_KEY = 'course-integration-test-secret-at-least-32';
process.env.ADMIN_EMAILS = 'editor@example.com';
const { createApp } = require('../Auth');
delete process.env.DATABASE_URL;
const { youtubeId, validateCourse, importPlaylist } = require('../courses');
const body = () => ({ title: 'Brush lettering', category: 'Calligraphy', difficulty: 'easy', description: 'Learn strokes', materials: 'Pen and paper', outcome: 'Make a card', status: 'draft', lessons: [{ id: 'strokes', title: 'Basic strokes', module: 'Basics', creator: 'Teacher', videoId: 'https://www.youtube.com/watch?v=ENj1xxj9STs', practice: 'Practise strokes', minutes: 20 }] });
test('course lifecycle, editor restrictions, publication, per-user progress and edits', async () => {
    const instance = await createApp({ databasePath: ':memory:' });
    const server = instance.app.listen(0, '127.0.0.1');
    try {
        await once(server, 'listening');
        const base = `http://127.0.0.1:${server.address().port}`;
        async function request(path, method = 'GET', body, token) {
            const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
            return { status: r.status, data: await r.json() };
        }
        async function user(email) {
            await request('/signup', 'POST', { name: 'Test', email, password: 'test-password' });
            return (await request('/login', 'POST', { email, password: 'test-password' })).data.token;
        }
        const editor = await user('editor@example.com'), learner = await user('learner@example.com'), other = await user('other@example.com');
        assert.equal((await request('/me', 'GET', undefined, learner)).data.isAdmin, false);
        assert.equal((await request('/me', 'GET', undefined, editor)).data.isAdmin, true);
        assert.equal((await request('/api/courses', 'POST', body(), learner)).status, 403);
        assert.equal((await request('/api/courses/manage', 'GET', undefined, learner)).status, 403);
        const created = await request('/api/courses', 'POST', body(), editor);
        assert.equal(created.status, 201); const id = created.data.id;
        assert.equal((await request('/api/courses')).data.courses.length, 0);
        assert.equal((await request(`/api/courses/${id}`, 'GET', undefined, learner)).status, 404);
        assert.equal((await request(`/api/courses/${id}`, 'GET', undefined, editor)).data.lessons[0].videoId, 'ENj1xxj9STs');
        const published = { ...body(), status: 'published' };
        assert.equal((await request(`/api/courses/${id}`, 'PUT', published, editor)).status, 200);
        assert.equal((await request('/api/courses')).data.courses.length, 1);
        assert.equal((await request(`/api/courses/${id}/view`, 'POST', {}, editor)).data.views, 0);
        assert.equal((await request(`/api/courses/${id}/view`, 'POST', {}, learner)).data.views, 1);
        assert.equal((await request(`/api/courses/${id}/view`, 'POST', {}, learner)).data.views, 1);
        assert.equal((await request(`/api/courses/${id}/view`, 'POST', {}, other)).data.views, 2);
        assert.equal((await request('/api/courses')).data.courses[0].views, 2);
        assert.equal((await request(`/api/courses/${id}/view`, 'POST', {})).status, 401);
        for (const difficulty of ['medium', 'hard']) {
            assert.equal((await request(`/api/courses/${id}`, 'PUT', { ...published, difficulty }, editor)).status, 400);
            const revised = await request(`/api/courses/${id}`, 'PUT', { ...published, difficulty, prerequisites: ['Basic strokes', 'Pen pressure'] }, editor);
            assert.equal(revised.status, 200);
            assert.deepEqual(revised.data.prerequisites, ['Basic strokes', 'Pen pressure']);
            assert.equal(revised.data.views, 2);
        }
        await request(`/api/courses/${id}`, 'PUT', published, editor);
        assert.equal((await request(`/api/courses/${id}/progress/strokes`, 'PUT', { completed: 'yes' }, learner)).status, 400);
        assert.equal((await request(`/api/courses/${id}/progress/missing`, 'PUT', { completed: true }, learner)).status, 404);
        assert.equal((await request(`/api/courses/${id}/progress/strokes`, 'PUT', { completed: true }, learner)).status, 200);
        await request(`/api/courses/${id}/progress/strokes`, 'PUT', { completed: true }, learner);
        assert.deepEqual((await request(`/api/courses/${id}`, 'GET', undefined, learner)).data.completed, ['strokes']);
        assert.deepEqual((await request(`/api/courses/${id}`, 'GET', undefined, other)).data.completed, []);
        assert.equal((await request('/api/courses/progress', 'GET', undefined, learner)).data.courses.length, 1);
        await request(`/api/courses/${id}/progress/strokes`, 'PUT', { completed: false }, learner);
        assert.deepEqual((await request(`/api/courses/${id}`, 'GET', undefined, learner)).data.completed, []);
        await request(`/api/courses/${id}/progress/strokes`, 'PUT', { completed: true }, learner);
        await request(`/api/courses/${id}`, 'PUT', { ...published, lessons: [{ ...published.lessons[0], id: 'replacement' }] }, editor);
        assert.deepEqual((await request(`/api/courses/${id}`, 'GET', undefined, learner)).data.completed, []);
        await request(`/api/courses/${id}`, 'PUT', { ...published, status: 'draft' }, editor);
        assert.equal((await request('/api/courses/progress', 'GET', undefined, learner)).data.courses.length, 0);
        assert.equal((await request(`/api/courses/${id}/view`, 'POST', {}, learner)).status, 404);
        assert.equal((await request(`/api/courses/${id}/progress/strokes`, 'PUT', { completed: true }, learner)).status, 404);
    } finally { await new Promise(resolve => server.close(resolve)); await instance.close(); }
});
test('safe YouTube parsing and publication validation', () => {
    assert.equal(youtubeId('https://youtu.be/ENj1xxj9STs'), 'ENj1xxj9STs');
    assert.equal(youtubeId('https://evil.example/watch?v=ENj1xxj9STs'), null);
    assert.equal(youtubeId('javascript:alert(1)'), null);
    assert.throws(() => validateCourse({ ...body(), lessons: [body().lessons[0], body().lessons[0]] }), /unique/);
    assert.throws(() => validateCourse({ ...body(), status: 'published', lessons: [] }), /Add lessons/);
    assert.throws(() => validateCourse({ ...body(), lessons: [{ ...body().lessons[0], videoId: 'https://evil.example/video' }] }), /YouTube/);
    assert.throws(() => validateCourse({ ...body(), status: 'published', lessons: [{ ...body().lessons[0], creator: '' }] }), /creator/);
});
test('playlist import handles pagination, unavailable entries, API failures and missing key', async () => {
    delete process.env.YOUTUBE_API_KEY;
    await assert.rejects(importPlaylist('https://www.youtube.com/playlist?list=PL123456789'), /YOUTUBE_API_KEY/);
    process.env.YOUTUBE_API_KEY = 'test-only';
    await assert.rejects(importPlaylist('https://evil.example/?list=PL123456789'), /valid YouTube/);
    const calls = [];
    const fetcher = async url => {
        calls.push(url);
        if (url.pathname.endsWith('/playlistItems')) return { ok: true, json: async () => url.searchParams.has('pageToken') ? { items: [{ contentDetails: { videoId: 'second12345' } }] } : { items: [{ contentDetails: { videoId: 'ENj1xxj9STs' } }, { contentDetails: { videoId: 'unavailable' } }], nextPageToken: 'page2' } };
        const id = url.searchParams.get('id').split(',')[0];
        return { ok: true, json: async () => ({ items: [{ id, snippet: { title: 'Lesson', channelTitle: 'Creator' }, status: { embeddable: true, privacyStatus: 'public' } }] }) };
    };
    const result = await importPlaylist('https://www.youtube.com/playlist?list=PL123456789', fetcher);
    assert.equal(result.lessons.length, 2); assert.equal(result.skipped, 1); assert.equal(calls.length, 4);
    assert.equal(calls[2].searchParams.get('pageToken'), 'page2');
    await assert.rejects(importPlaylist('https://www.youtube.com/playlist?list=PL123456789', async () => ({ ok: false })), /YouTube could not/);
    delete process.env.YOUTUBE_API_KEY;
});

test('prerequisite validation and starter content', () => {
    for (const prerequisites of ['HTML', [' '], [42], Array(21).fill('Topic')]) {
        assert.throws(() => validateCourse({ ...body(), prerequisites }), /prerequisite/);
    }
    assert.deepEqual(validateCourse({ ...body(), prerequisites: [' HTML ', 'HTML'] }).prerequisites, ['HTML']);
    const { courses } = require('../seed-courses');
    for (const course of courses) assert.doesNotThrow(() => validateCourse(course));
    assert.ok(courses.some(c => c.category === 'Web Development' && c.difficulty === 'easy'));
    assert.ok(courses.some(c => c.category === 'Terminal' && c.difficulty === 'easy'));
});
test('course migration preserves existing lessons and is repeatable', async () => {
    const { openDatabase } = require('../database');
    const { setupCourses } = require('../courses');
    const db = openDatabase(':memory:');
    try {
        await db.ready;
        await setupCourses(db);
        await db.run('INSERT INTO courses (id,title,category,difficulty,description,materials,outcome,status,lessons) VALUES (?,?,?,?,?,?,?,?,?)', ['existing','Existing','Piano','easy','','','','draft','[]']);
        await setupCourses(db);
        const existing = await db.get('SELECT * FROM courses WHERE id = ?', ['existing']);
        assert.equal(existing.title, 'Existing');
        assert.equal(existing.prerequisites, '[]');
    } finally { await db.close(); }
});
