const
{
    Pool
}
= require("pg");
const fs = require("node:fs/promises");
const path = require("node:path");
const pool = require("./db");
const
{
    hashPassword
}
= require("./passwords");

// Create the database, tables, and starting data.
async function setup()
{
    const database = process.env.PGDATABASE;
    if (!database) throw new Error("Set PGDATABASE in .env first.");
    const admin = new Pool(
    {
        database: "postgres"
    });
    try
    {
        const existing = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);
        if (!existing.rowCount)
        {
            // Identifiers cannot use $1, so quote the database name safely.
            await admin.query('CREATE DATABASE "' + database.replaceAll('"', '""') + '"');
        }
    }
    finally
    {
        await admin.end();
    }

    const client = await pool.connect();
    try
    {
        // Keep the setup changes together so a failure can be rolled back.
        await client.query("BEGIN");
        await client.query(await fs.readFile(path.join(__dirname, "schema.sql"), "utf8"));
        await client.query("CREATE TABLE IF NOT EXISTS seed_history (seed_name TEXT PRIMARY KEY)");
        const seeded = await client.query("SELECT 1 FROM seed_history WHERE seed_name = $1", ["initial"]);
        // Only add these demo users and posts the first time setup runs.
        if (!seeded.rowCount)
        {
            // These are the three accounts available for the demo.
            const users = [["aron", "Aron", "AronDemo123!"], ["maya", "Maya", "MayaDemo123!"], ["daniel", "Daniel", "DanielDemo123!"]];
            for (const [id, name, password] of users)
            {
                await client.query("INSERT INTO users (user_id, password, name) VALUES ($1, $2, $3)", [id, await hashPassword(password), name]);
            }

            // Five starting posts give the feed content on the first launch.
            const posts = [
            ["aron", "Aron", "Learning PostgreSQL", "I am adding PostgreSQL to my blog so posts remain saved after the server restarts. Tables help me organize users and their posts.", "2026-10-01 10:00:00"],
            ["maya", "Maya", "A walk around Flagstaff", "I took a walk around Flagstaff this weekend. The cooler weather made it a good time to get outside and take a break from homework.", "2026-10-02 14:30:00"],
            ["daniel", "Daniel", "My study routine", "I split large assignments into smaller tasks and work on one task at a time. Testing each part before moving on helps me find mistakes earlier.", "2026-10-03 09:15:00"],
            ["aron", "Aron", "Working on a team project", "Our team is learning how to divide responsibilities and review changes before combining them. Clear notes make it easier for everyone to follow the code.", "2026-10-04 16:00:00"],
            ["maya", "Maya", "Cooking at home", "This week I tried making more meals at home. Planning a few meals ahead helped me save time and avoid buying ingredients I did not need.", "2026-10-05 18:45:00"]
            ];
            for (const post of posts)
            {
                await client.query("INSERT INTO blogs (creator_user_id, creator_name, title, body, date_created) VALUES ($1, $2, $3, $4, $5)", post);
            }

            await client.query("INSERT INTO seed_history (seed_name) VALUES ($1)", ["initial"]);
        }

        await client.query("COMMIT");
        console.log("Database ready. Initial demo data is inserted only once.");
    }
    catch (err)
    {
        await client.query("ROLLBACK");
        throw err;
    }
    finally
    {
        client.release();
    }
}

setup().catch(err =>
{
    console.error("Setup failed:", err.message);
    process.exitCode = 1;
}).finally(() => pool.end());
