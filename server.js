const express = require("express");
const session = require("express-session");
const path = require("node:path");
const pool = require("./db");
const
{
    hashPassword, checkPassword
}
= require("./passwords");

const app = express();
const port = process.env.PORT || 3500;
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === "replace_with_a_long_random_value")
{
    throw new Error("Set a random SESSION_SECRET in .env before starting.");
}

// I use React for the pages and send JSON from the backend.
app.use(express.json(
{
    limit: "100kb"
}));
app.use(express.urlencoded(
{
    extended: false, limit: "100kb"
}));
app.use(express.static(path.join(__dirname, "public")));
// This keeps track of who signed in.
app.use(session(
{
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie:
    {
        httpOnly: true, sameSite: "lax", maxAge: 2 * 60 * 60 * 1000
    }
}));

// The browser keeps a session cookie; the server remembers the user ID.
app.use(async (req, res, next) =>
{
    res.locals.user = null;
    if (req.session.userId)
    {
        const result = await pool.query("SELECT user_id, name FROM users WHERE user_id = $1", [req.session.userId]);
        res.locals.user = result.rows[0] || null;
    }

    next();
});

// Require the user to sign in before allowing changes to posts.
function requireLogin(req, res, next)
{
    if (!res.locals.user) return res.status(401).json({ error: "Sign in before changing posts." });
    next();
}

// Remove extra spaces from the beginning and end of text fields.
function text(value)
{
    return typeof value === "string" ? value.trim() : "";
}

// Make sure the title and body are not empty or too long.
function validPost(title, content)
{
    return title.length > 0 && title.length <= 255 && content.length > 0 && content.length <= 20000;
}

// Blog IDs should be positive numbers that fit the database column.
app.param("id", (req, res, next, id) =>
{
    if (!/^[1-9]\d*$/.test(id) || Number(id) > 2147483647) return res.status(404).json({ error: "Post not found." });
    next();
});

// Get all posts from the database, with the newest posts first.
app.get("/api/posts", async (req, res) =>
{
    const result = await pool.query("SELECT * FROM blogs ORDER BY date_created DESC, blog_id DESC");
    res.json(result.rows);
});

// Let React check who is signed in when the page opens.
app.get("/api/user", (req, res) => res.json(res.locals.user));

// Check the signup information before saving a new user.
app.post("/api/signup", async (req, res) =>
{
    const userId = text(req.body.user_id);
    const name = text(req.body.name);
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!userId || userId.length > 255 || !name || name.length > 255 || password.length < 8 || password.length > 128)
    {
        return res.status(400).json(
        {
            error: "Enter a user ID and name (up to 255 characters), and a password with 8–128 characters."
        });
    }

    // Check whether someone already has this user ID.
    const existing = await pool.query("SELECT user_id FROM users WHERE user_id = $1", [userId]);
    if (existing.rowCount) return res.status(409).json(
    {
        error: "That user ID is taken. Choose another one."
    });
    // Store the password hash instead of the original password.
    try
    {
        await pool.query("INSERT INTO users (user_id, password, name) VALUES ($1, $2, $3)", [userId, await hashPassword(password), name]);
    }
    catch (err)
    {
        if (err.code === "23505") return res.status(409).json(
        {
            error: "That user ID is taken. Choose another one."
        });
        throw err;
    }

    res.status(201).json({ message: "Account created. Sign in below." });
});

// Find the user, then compare the submitted password with the saved hash.
app.post("/api/signin", async (req, res, next) =>
{
    const userId = text(req.body.user_id);
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const result = await pool.query("SELECT * FROM users WHERE user_id = $1", [userId]);
    const user = result.rows[0];
    if (!user || password.length > 128 || !(await checkPassword(password, user.password)))
    {
        return res.status(401).json(
        {
            error: "Incorrect user ID or password."
        });
    }

    // Start a fresh session after a successful sign-in.
    req.session.regenerate(err =>
    {
        if (err) return next(err);
        req.session.userId = user.user_id;
        req.session.save(err => err ? next(err) : res.json({ user_id: user.user_id, name: user.name }));
    });
});

// Remove the session when the user signs out.
app.post("/api/signout", (req, res, next) =>
{
    req.session.destroy(err =>
    {
        if (err) return next(err);
        res.clearCookie("connect.sid");
        res.json({ message: "Signed out." });
    });
});

// Save a new post using the signed-in user as the author.
app.post("/api/posts", requireLogin, async (req, res) =>
{
    const title = text(req.body.title);
    const content = text(req.body.content);
    if (!validPost(title, content)) return res.status(400).json({ error: "Enter a title (1–255 characters) and body (1–20,000 characters)." });
    const user = res.locals.user;
    const result = await pool.query("INSERT INTO blogs (creator_name, creator_user_id, title, body) VALUES ($1, $2, $3, $4) RETURNING *", [user.name, user.user_id, title, content]);
    res.status(201).json(result.rows[0]);
});

// Only load the post for editing if it belongs to the current user.
app.get("/api/posts/edit/:id", requireLogin, async (req, res) =>
{
    const result = await pool.query("SELECT * FROM blogs WHERE blog_id = $1 AND creator_user_id = $2", [req.params.id, res.locals.user.user_id]);
    if (!result.rowCount) return res.status(404).json({ error: "Post not found or you do not own it." });
    res.json(result.rows[0]);
});

// Save the edited title and body without changing the author or date.
app.post("/api/posts/edit/:id", requireLogin, async (req, res) =>
{
    const title = text(req.body.title);
    const content = text(req.body.content);
    if (!validPost(title, content)) return res.status(400).json({ error: "Enter a title (1–255 characters) and body (1–20,000 characters)." });
    // The SQL checks ownership even if someone changes the URL manually.
    const result = await pool.query("UPDATE blogs SET title = $1, body = $2 WHERE blog_id = $3 AND creator_user_id = $4 RETURNING *", [title, content, req.params.id, res.locals.user.user_id]);
    if (!result.rowCount) return res.status(404).json({ error: "Post not found or you do not own it." });
    res.json(result.rows[0]);
});

// Delete the post only when its creator matches the signed-in user.
app.post("/api/posts/delete/:id", requireLogin, async (req, res) =>
{
    const result = await pool.query("DELETE FROM blogs WHERE blog_id = $1 AND creator_user_id = $2 RETURNING blog_id", [req.params.id, res.locals.user.user_id]);
    if (!result.rowCount) return res.status(404).json({ error: "Post not found or you do not own it." });
    res.json({ blog_id: result.rows[0].blog_id });
});

// Send the same React page for the home, signup, signin, and edit URLs.
app.get(["/", "/signup", "/signin", "/posts/edit/:id"], (req, res) =>
{
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Handle a URL that does not exist.
app.use((req, res) => res.status(404).json({ error: "Page not found." }));
// Show a simple error message instead of database details.
app.use((err, req, res, next) =>
{
    console.error(err.message);
    res.status(err.status === 413 ? 413 : err.status === 400 ? 400 : 500).json({ error: "Unable to complete the request. Please try again." });
});

// Check that the database is ready before starting the website.
if (require.main === module)
{
    pool.query("SELECT 1 FROM blogs LIMIT 1").then(() =>
    {
        app.listen(port, () => console.log(`Blog running at http://localhost:${port}`));
    }).catch(async err =>
    {
        console.error("Check .env, start PostgreSQL, and run npm run db:setup:", err.message);
        await pool.end();
        process.exitCode = 1;
    });
}

module.exports = app;
