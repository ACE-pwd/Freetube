// Preserve the original MongoDB integration when DATABASE_URL is configured.
// Local development uses SQLite so no external account is required.
async function createUsers(db) {
    if (process.env.DATABASE_URL) {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        await prisma.$connect();
        return {
            byEmail: email => prisma.user.findUnique({ where: { email } }),
            byId: id => prisma.user.findUnique({ where: { id: String(id) } }),
            create: data => prisma.user.create({ data }),
            close: () => prisma.$disconnect(),
        };
    }
    await db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE, password TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    return {
        byEmail: email => db.get('SELECT * FROM users WHERE email = ?', [email]),
        byId: id => db.get('SELECT * FROM users WHERE id = ?', [id]),
        create: async ({ name, email, password }) => {
            const { id } = await db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, password]);
            return db.get('SELECT * FROM users WHERE id = ?', [id]);
        },
        close: async () => {},
    };
}
module.exports = { createUsers };
