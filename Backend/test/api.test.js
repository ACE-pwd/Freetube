const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const jwt = require('jsonwebtoken');
process.env.SECRET_KEY = 'integration-test-secret-with-at-least-32-characters';
process.env.ADMIN_EMAILS = 'test@example.com';
delete process.env.DATABASE_URL;
const { createApp } = require('../Auth');
// dotenv must not connect tests to an external database from a developer's .env.
delete process.env.DATABASE_URL;
let instance, server, base, directory, token;
async function request(url, { method = 'GET', body, auth } = {}) {
    const response = await fetch(base + url, {
        method,
        headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
}
before(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'freelearn-test-'));
    instance = await createApp({ databasePath: path.join(directory, 'test.db') });
    server = instance.app.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
    base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    if (instance) await instance.close();
    if (directory) await rm(directory, { recursive: true, force: true });
});
test('signup validates input, normalizes email, hashes passwords, and rejects duplicates', async () => {
    assert.equal((await request('/signup', { method: 'POST', body: {} })).status, 400);
    assert.equal((await request('/signup', { method: 'POST', body: { email: 'test@example.com', password: 'short' } })).status, 400);
    const body = { name: 'Test Learner', email: ' Test@Example.com ', password: 'correct-password' };
    const signup = await request('/signup', { method: 'POST', body });
    assert.equal(signup.status, 201);
    assert.equal(signup.data.user.email, 'test@example.com');
    assert.equal(signup.data.user.password, undefined);
    assert.equal((await request('/signup', { method: 'POST', body })).status, 422);
    const { openDatabase } = require('../database');
    const db = openDatabase(path.join(directory, 'test.db'));
    await db.ready;
    const saved = await db.get('SELECT password FROM users WHERE email = ?', ['test@example.com']);
    assert.notEqual(saved.password, body.password);
    assert.match(saved.password, /^\$2/);
    await db.close();
});
test('login and profile enforce authentication and never expose password hashes', async () => {
    assert.equal((await request('/login', { method: 'POST', body: { email: 'test@example.com', password: 'wrong' } })).status, 401);
    const login = await request('/login', { method: 'POST', body: { email: 'TEST@example.com', password: 'correct-password' } });
    assert.equal(login.status, 200);
    token = login.data.token;
    assert.equal((await request('/me')).status, 401);
    assert.equal((await request('/me', { auth: 'invalid' })).status, 401);
    const expired = jwt.sign({ id: 1 }, process.env.SECRET_KEY, { expiresIn: -1 });
    assert.equal((await request('/me', { auth: expired })).status, 401);
    assert.equal((await request('/me', { auth: token })).data.name, 'Test Learner');
    await request('/signup', { method: 'POST', body: { email: 'another@example.com', password: 'another-password' } });
    const users = await request('/users', { auth: token });
    assert.equal(users.data.users.length, 1);
    assert.equal(users.data.users[0].email, 'test@example.com');
    assert.equal(users.data.users[0].password, undefined);
});
test('topic CRUD, filters, sorting, pagination and deletion of the final page', async () => {
    const body = { title: ' Alpha ', description: 'First topic', difficulty: 'easy' };
    assert.equal((await request('/api/topics', { method: 'POST', body })).status, 401);
    const first = await request('/api/topics', { method: 'POST', body, auth: token });
    assert.equal(first.status, 201);
    assert.equal(first.data.title, 'Alpha');
    assert.equal((await request(`/api/topics/${first.data.id}`)).status, 401);
    assert.equal((await request(`/api/topics/${first.data.id}`, { auth: token })).data.description, 'First topic');
    for (let i = 0; i < 5; i++) {
        assert.equal((await request('/api/topics', { method: 'POST', auth: token, body: { title: `Beta ${i}`, difficulty: 'hard' } })).status, 201);
    }
    const list = await request('/api/topics?sort=title_asc&limit=5');
    assert.equal(list.data.topics[0].title, 'Alpha');
    assert.equal(list.data.pagination.totalPages, 2);
    assert.equal((await request('/api/topics?difficulty=easy&search=Alpha')).data.pagination.totalItems, 1);
    assert.equal((await request('/api/topics?search=missing')).data.topics.length, 0);
    const last = await request('/api/topics?page=2&limit=5&sort=title_asc');
    assert.equal(last.data.topics.length, 1);
    assert.equal((await request(`/api/topics/${last.data.topics[0].id}`, { method: 'DELETE', auth: token })).status, 200);
    const afterDelete = await request('/api/topics?page=2&limit=5');
    assert.equal(afterDelete.data.pagination.currentPage, 1);
    assert.equal(afterDelete.data.topics.length, 5);
    assert.equal((await request(`/api/topics/${first.data.id}`, { method: 'PUT', auth: token, body: { ...body, title: 'Updated' } })).status, 200);
    assert.equal((await request(`/api/topics/${first.data.id}`, { auth: token })).data.title, 'Updated');
    assert.equal((await request('/api/topics/99999', { method: 'DELETE', auth: token })).status, 404);
});
test('malformed input produces actionable client errors', async () => {
    for (const query of ['page=-1', 'page=abc', 'limit=0', 'limit=101', 'sort=toString', 'difficulty=unknown', 'search=a&search=b']) {
        assert.equal((await request(`/api/topics?${query}`)).status, 400);
    }
    for (const body of [{ title: ' ' }, { title: 'Good', difficulty: 'invalid' }, { title: 'Good', description: 10 }]) {
        assert.equal((await request('/api/topics', { method: 'POST', auth: token, body })).status, 400);
        assert.equal((await request('/api/topics/1', { method: 'PUT', auth: token, body })).status, 400);
    }
    assert.equal((await request('/api/topics/nope', { auth: token })).status, 400);
    assert.equal((await request('/api/topics/99999', { auth: token })).status, 404);
    assert.equal((await request('/api/unknown')).status, 404);
    const invalidJson = await fetch(base + '/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(invalidJson.status, 400);
});
test('accounts and topics persist across an app restart', async () => {
    await new Promise(resolve => server.close(resolve));
    await instance.close();
    instance = await createApp({ databasePath: path.join(directory, 'test.db') });
    server = instance.app.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
    base = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await request('/me', { auth: token })).data.email, 'test@example.com');
    assert.equal((await request('/api/topics')).data.pagination.totalItems, 5);
});
