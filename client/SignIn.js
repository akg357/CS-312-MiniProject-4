import React, { useState } from "react";
import api from "./api";

export default function SignIn()
{
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const created = new URLSearchParams(window.location.search).get("created") === "1";

    // The form sends these fields to the server.
    async function submit(event)
    {
        event.preventDefault();
        setError("");
        setSaving(true);
        try
        {
            await api("/api/signin", { user_id: userId, password });
            window.location.href = "/";
        }
        catch (err)
        {
            setError(err.message);
            setSaving(false);
        }
    }

    return (
        <>
            <header><h1>Sign In to The Blog</h1></header>
            <main className="auth">
                <section>
                    {created && <p className="success">Account created. Sign in below.</p>}
                    {error && <p className="error" role="alert">{error}</p>}
                    <form onSubmit={submit}>
                        <label htmlFor="user_id">User ID:</label>
                        <input id="user_id" name="user_id" maxLength="255" autoComplete="username" required value={userId} onChange={event => setUserId(event.target.value)} />
                        <label htmlFor="password">Password:</label>
                        <input type="password" id="password" name="password" maxLength="128" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
                        <button type="submit" disabled={saving}>Sign In</button>
                    </form>
                    <p>Need an account? <a href="/signup">Sign Up</a></p>
                    <a href="/">Back to Home</a>
                </section>
            </main>
        </>
    );
}
