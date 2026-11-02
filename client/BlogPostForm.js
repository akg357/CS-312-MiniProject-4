import React, { useState } from "react";

export default function BlogPostForm({ user, post, onSave })
{
    const [title, setTitle] = useState(post ? post.title : "");
    const [content, setContent] = useState(post ? post.body : "");
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
            await onSave({ title, content });
            if (!post)
            {
                setTitle("");
                setContent("");
            }
        }
        catch (err)
        {
            setError(err.message);
        }
        finally
        {
            setSaving(false);
        }
    }

    return (
        <section>
            {!post && <h2>Create a New Post</h2>}

            <p>{post ? "Author: " + post.creator_name : "Posting as " + user.name}</p>
            {error && <p className="error" role="alert">{error}</p>}

            <form onSubmit={submit}>
                <label htmlFor="title">Blog Title:</label>
                <input type="text" id="title" name="title" maxLength="255" required value={title} onChange={event => setTitle(event.target.value)} />
                <label htmlFor="content">Your Blog:</label>

                <textarea id="content" name="content" rows={post ? 8 : 6} maxLength="20000" required value={content} onChange={event => setContent(event.target.value)}></textarea>
                <button type="submit" disabled={saving}>{post ? "Save Changes" : "Create Post"}</button>

            </form>
            {post && <p><a href="/">Back to Home</a></p>}
        </section>
    );
}
