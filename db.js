const
{
    Pool
}
= require("pg");

// pg reads the PostgreSQL connection settings from .env.
const pool = new Pool();
pool.on("error", err => console.error("Database connection error:", err.message));
module.exports = pool;
