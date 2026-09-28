const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

function requireSecret() {
    if (!process.env.SECRET_KEY || process.env.SECRET_KEY.length < 32) {
        throw new Error('Set SECRET_KEY to at least 32 characters in Backend/.env (see .env.example).');
    }
}
module.exports = { requireSecret };
