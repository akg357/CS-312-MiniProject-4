import React, { useState } from "react";
import api from "./api";

export default function SignUp()
{
    const [userId, setUserId] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    // The form sends these fields to the server.
    async function submit(event)
    {
        event.preventDefault();
        setError("");
        setSaving(true);
        try
        {
            await api("/api/signup", { user_id: userId, name, password });
            window.location.href = "/signin?created=1";
        }
        catch (err)
        {
            setError(err.message);
            setSaving(false);
        }
    }

    return (
        <>
            <header><h1>Create an Account</h1></header>
            <main className="auth">
                <section>
                    {error && <p className="error" role="alert">{error}</p>}
                    <form onSubmit={submit}>
                        <label htmlFor="user_id">User ID:</label>
                        <input id="user_id" name="user_id" maxLength="255" autoComplete="username" required value={userId} onChange={event => setUserId(event.target.value)} />
                        <label htmlFor="name">Your Name:</label>
                        <input id="name" name="name" maxLength="255" autoComplete="name" required value={name} onChange={event => setName(event.target.value)} />
                        <label htmlFor="password">Password (8–128 characters):</label>
                        <input type="password" id="password" name="password" minLength="8" maxLength="128" autoComplete="new-password" required value={password} onChange={event => setPassword(event.target.value)} />
                        <button type="submit" disabled={saving}>Sign Up</button>
                    </form>
                    <p>Already have an account? <a href="/signin">Sign In</a></p>
                    <a href="/">Back to Home</a>
                </section>
            </main>
        </>
    );
}
