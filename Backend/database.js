const path = require('node:path');
const sqlite3 = require('sqlite3');

function openDatabase(filename = process.env.SQLITE_PATH || path.join(__dirname, 'topics.db')) {
    const db = new sqlite3.Database(filename);
    const run = (sql, params = []) => new Promise((resolve, reject) => {
        db.run(sql, params, function (error) {
            if (error) reject(error);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
    const get = (sql, params = []) => new Promise((resolve, reject) => {
        db.get(sql, params, (error, row) => error ? reject(error) : resolve(row));
    });
    const all = (sql, params = []) => new Promise((resolve, reject) => {
        db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows));
    });
    const ready = run('PRAGMA busy_timeout = 5000').then(() => run(`CREATE TABLE IF NOT EXISTS topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT,
        difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`));
    return { run, get, all, ready, close: () => new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve())) };
}
module.exports = { openDatabase };
