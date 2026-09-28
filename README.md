# FreeTube / FreeLearn

A React learning-topic library with signup/login, a dashboard and profile, plus searchable, sortable, paginated topics and authenticated topic creation, editing and deletion. The catalogue retains the original visual style; login and signup now use a refreshed, responsive design.

## Run locally

Use Node.js 22.12+ and npm. In two terminals:

```sh
cd Backend
npm ci
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Paste the generated value into SECRET_KEY in .env.
npm start
```

```sh
cd Frontend/FreeLearn
npm ci
npm run dev
```

Open the Vite URL (usually http://localhost:5173). Vite forwards API calls to port 3000. Signup requires a password of at least eight characters; log in after signup. The local checkout may already have a generated, ignored `Backend/.env`; preserve it rather than overwriting it.

Both auth and topics now run from `Backend/Auth.js`. `TopicsServer.js` remains available for legacy setups needing a separate service on port 4000.

## Storage and configuration

By default, accounts and topics persist in SQLite at `Backend/topics.db`. This file includes the repository's original topics. Back up this file; local usage can modify it. Set `SQLITE_PATH` to an absolute file path on a persistent volume for deployment or to keep runtime data separate from the tracked seed. Only allowlisted editors can change catalogue content or legacy topics.

To retain the original MongoDB account store, set `DATABASE_URL` in `Backend/.env`, then run `npm run db:generate` and `npm run db:push` from Backend. MongoDB must support transactions (a replica set, such as Atlas). Topics continue to use SQLite. Selecting MongoDB does not migrate local SQLite accounts. The MongoDB integration requires your own database credentials.

Set a private random `SECRET_KEY` (at least 32 characters), optional `PORT` (3000), and optional comma-separated `CORS_ORIGIN`. Examples are in each app's `.env.example`; never commit real secrets. The profile endpoint is `/me`; the legacy `/users` endpoint exposes only the current user's public fields.

For separate frontend hosting, set `VITE_AUTH_URL` and `VITE_TOPICS_URL` before building. Otherwise requests use the same origin.

## Production build

```sh
cd Frontend/FreeLearn
npm run build
cd ../../Backend
npm start
```

The backend serves the built frontend and supports page reloads on client-side routes. Use a persistent volume for SQLite when deploying (including Render). No deployment is performed by these scripts.

## Checks

```sh
cd Backend
npm test
cd ../Frontend/FreeLearn
npm run lint
npm run build
```

API tests use an isolated temporary database and cover signup/login, privacy, expired tokens, validation, topic CRUD, search, pagination and persistence. MongoDB is not needed for local checks.

## Progress

Course lesson completion is now stored per account. It records self-reported practice, not an assessed qualification.

## Curated course catalogue

The main catalogue now lives at `/courses` (the old `/topics` link redirects there). It is browsable by skill and difficulty, without an AI search prompt. Courses contain ordered lessons, modules, materials, outcomes, credited YouTube embeds, written practice, and saved per-account completion. The dashboard resumes at the first incomplete lesson. The original topic data remains intact in its separate table.

Editors are designated through `ADMIN_EMAILS` in `Backend/.env`. Register the intended account, set its email in this allowlist, then restart the backend. Learners cannot publish or edit courses. The local preview account is enabled as an editor only for demonstration; do not deploy that shared test account as an editor.

Run `npm run seed:courses` in Backend to add four introductory courses without overwriting existing editor changes. They cover brush-calligraphy strokes, a written piano practice guide, beginner web development, and terminal basics. They are starter content, not comprehensive or expert-reviewed curricula. Review teaching quality and video playback before a public launch.

Editors can create drafts, add individual YouTube URLs, arrange lessons, and publish after review. For bulk playlist import, enable YouTube Data API v3 and set `YOUTUBE_API_KEY` on the backend. The import fetches up to 200 playlist entries, skips unavailable/non-embeddable videos, and brings in titles and creator credits. Study times default to 15 minutes and must be reviewed. No videos are downloaded. Import errors leave the editor's existing work intact. Direct embeds need no API key.

AI course generation is not connected in this version. Editors can enter a reviewed AI-assisted syllabus manually; the app does not pretend to analyse videos. Public launch still needs a reviewed content catalogue, hosting, and a production account/database configuration. Imported YouTube metadata should be refreshed or removed within the applicable YouTube policy periods; this version does not automatically resync saved courses.

## Popularity, prerequisites and authentication screens

Catalogue sorting includes **Most Viewed**, using FreeLearn course opens rather than YouTube view counts. The server counts at most one view per signed-in learner per course per UTC day; editor previews, drafts, and repeated refreshes are excluded. Counts start at zero and are never seeded with invented popularity. The counts persist in SQLite.

Editors can enter prerequisite topics (one per line). Intermediate and advanced courses cannot be published without prerequisites. Learners see them on course cards and under “Before you start”; these are guidance rather than access restrictions. Existing data is migrated without losing lessons or progress.

Login/signup share a responsive design with labelled fields, password visibility, password confirmation on signup, loading/error/success states, and links between both flows. Returning learners are sent back to the selected course after login.

The seed command now also adds beginner **Web Development: Build Your First Website** and **Terminal Basics: Your First Commands**, each with a credited freeCodeCamp video reference and original practice exercises. Video references: https://www.youtube.com/watch?v=dX8396ZmSPk and https://www.youtube.com/watch?v=mABpAI-pCw0. Estimated lesson times refer to study/practice blocks, not the full video lengths. The terminal exercises target a Bash-compatible shell (macOS/Linux or Git Bash/WSL).
