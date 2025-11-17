require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");         // <--- IMPORTANT
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const app = express();

app.use(cors());                      // allow all origins
app.use(express.json());

const { isValidToken } = require("./middleware");

app.get('/', (req, res) => {
  res.status(200).send('Server is running');
});

// ---------------- SIGNUP ----------------
app.post("/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) return res.status(422).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { name: name || "", email, password: hashedPassword },
    });

    return res.status(200).json({
      message: "User created successfully!",
      user: { id: newUser.id, email: newUser.email },
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

// ---------------- LOGIN ----------------
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(422).json({ message: "User does not exist" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Incorrect password" });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.SECRET_KEY,
      { expiresIn: "1d" }
    );

    return res.status(200).json({ message: "Login successful", token, email: user.email });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
});

// ------------- PROTECTED ROUTE -------------
app.get("/users", isValidToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    return res.json({ users });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching users" });
  }
});

// ------------- START SERVER -------------
app.listen(3000, () => {
  console.log(`Server running on http://localhost:3000/`);
});
