require("dotenv").config();
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Setup
const dbPath = path.resolve(__dirname, "topics.db");
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error opening database " + dbPath + ": " + err.message);
    } else {
        console.log("Connected to the SQLite database.");
        db.run(
            `CREATE TABLE IF NOT EXISTS topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
            (err) => {
                if (err) {
                    console.error("Error creating table: " + err.message);
                }
            }
        );
    }
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

    if (!token) return res.status(401).json({ message: "Access Token Required" });

    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: "Invalid Token" });
        req.user = user;
        next();
    });
};

// Routes

// GET /api/topics (Public)
// Supports: page, limit, sort (title, date), search (title), difficulty
app.get("/api/topics", (req, res) => {
    let { page = 1, limit = 5, sort, search, difficulty } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    let query = "SELECT * FROM topics WHERE 1=1";
    let params = [];
    let countQuery = "SELECT COUNT(*) as count FROM topics WHERE 1=1";
    let countParams = [];

    // Search
    if (search) {
        query += " AND title LIKE ?";
        params.push(`%${search}%`);
        countQuery += " AND title LIKE ?";
        countParams.push(`%${search}%`);
    }

    // Filter
    if (difficulty) {
        query += " AND difficulty = ?";
        params.push(difficulty);
        countQuery += " AND difficulty = ?";
        countParams.push(difficulty);
    }

    // Sort
    if (sort) {
        if (sort === "title_asc") query += " ORDER BY title ASC";
        else if (sort === "title_desc") query += " ORDER BY title DESC";
        else if (sort === "date_newest") query += " ORDER BY createdAt DESC";
        else if (sort === "date_oldest") query += " ORDER BY createdAt ASC";
        else query += " ORDER BY createdAt DESC"; // Default
    } else {
        query += " ORDER BY createdAt DESC";
    }

    // Pagination
    query += " LIMIT ? OFFSET ?";
    params.push(limit, offset);

    db.get(countQuery, countParams, (err, row) => {
        if (err) return res.status(500).json({ message: err.message });
        const totalItems = row.count;
        const totalPages = Math.ceil(totalItems / limit);

        db.all(query, params, (err, rows) => {
            if (err) return res.status(500).json({ message: err.message });
            res.json({
                topics: rows,
                pagination: {
                    totalItems,
                    totalPages,
                    currentPage: page,
                    itemsPerPage: limit,
                },
            });
        });
    });
});

// GET /api/topics/:id (Authenticated)
app.get("/api/topics/:id", authenticateToken, (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM topics WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!row) return res.status(404).json({ message: "Topic not found" });
        res.json(row);
    });
});

// POST /api/topics (Authenticated)
app.post("/api/topics", authenticateToken, (req, res) => {
    const { title, description, difficulty } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });

    const sql =
        "INSERT INTO topics (title, description, difficulty) VALUES (?, ?, ?)";
    db.run(sql, [title, description, difficulty], function (err) {
        if (err) return res.status(500).json({ message: err.message });
        res.status(201).json({
            id: this.lastID,
            title,
            description,
            difficulty,
            message: "Topic created successfully",
        });
    });
});

// PUT /api/topics/:id (Authenticated)
app.put("/api/topics/:id", authenticateToken, (req, res) => {
    const { id } = req.params;
    const { title, description, difficulty } = req.body;

    const sql =
        "UPDATE topics SET title = ?, description = ?, difficulty = ? WHERE id = ?";
    db.run(sql, [title, description, difficulty, id], function (err) {
        if (err) return res.status(500).json({ message: err.message });
        if (this.changes === 0)
            return res.status(404).json({ message: "Topic not found" });
        res.json({ message: "Topic updated successfully" });
    });
});

// DELETE /api/topics/:id (Authenticated)
app.delete("/api/topics/:id", authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM topics WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ message: err.message });
        if (this.changes === 0)
            return res.status(404).json({ message: "Topic not found" });
        res.json({ message: "Topic deleted successfully" });
    });
});

app.listen(PORT, () => {
    console.log(`Topics Server running on http://localhost:${PORT}`);
});
