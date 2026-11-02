import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import api from "./api";
import SignIn from "./SignIn";
import SignUp from "./SignUp";
import BlogPostForm from "./BlogPostForm";
import PostList from "./PostList";
import EditPost from "./EditPost";

function App()
{
    const [user, setUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);
    const page = window.location.pathname;

    // Get all posts and the signed-in user when the page opens.
    useEffect(() =>
    {
        if (page === "/signin" || page === "/signup") return;
        async function load()
        {
            try
            {
                const [currentUser, allPosts] = await Promise.all([api("/api/user"), api("/api/posts")]);
                setUser(currentUser);
                setPosts(allPosts);
                console.log("Posts from the backend:", allPosts);
                if (page.startsWith("/posts/edit/"))
                {
                    const post = await api("/api/posts/edit/" + page.split("/").pop());
                    setEditing(post);
                }
            }
            catch (err)
            {
                setError(err.message);
            }
            finally
            {
                setLoading(false);
            }
        }
        load();
    }, []);

    // Add the saved post to the list without reloading the page.
    async function createPost(data)
    {
        const post = await api("/api/posts", data);
        setPosts(current => [post, ...current]);
    }

    // Replace the edited post without changing the other posts.
    async function savePost(data)
    {
        const post = await api("/api/posts/edit/" + editing.blog_id, data);
        setPosts(current => current.map(item => item.blog_id === post.blog_id ? post : item));
        setEditing(null);
        window.history.replaceState(null, "", "/");
    }

    // Remove the post from the list only after the server deletes it.
    async function deletePost(id)
    {
        setError("");
        setDeleting(id);
        try
        {
            await api("/api/posts/delete/" + id, {});
            setPosts(current => current.filter(post => post.blog_id !== id));
        }
        catch (err)
        {
            setError(err.message);
        }
        finally
        {
            setDeleting(null);
        }
    }

    // Remove the session when the user signs out.
    async function signOut(event)
    {
        event.preventDefault();
        try
        {
            await api("/api/signout", {});
            window.location.href = "/signin";
        }
        catch (err)
        {
            setError(err.message);
        }
    }

    if (page === "/signin") return <SignIn />;
    if (page === "/signup") return <SignUp />;
    if (loading) return <main><p>Loading posts...</p></main>;
    if (editing) return <EditPost post={editing} user={user} onSave={savePost} />;

    return (
        <>
            <header>
                <h1>Welcome to The Blog</h1>
                <p>Share your thoughts and ideas here.</p>
                {user ?
                (
                    <>
                        <p>Signed in as {user.name} ({user.user_id})</p>
                        <form onSubmit={signOut}><button type="submit">Sign Out</button></form>
                    </>
                ) :
                (
                    <nav><a href="/signin">Sign In</a> · <a href="/signup">Sign Up</a></nav>
                )}
            </header>
            <main>
                {error && <p className="error" role="alert">{error}</p>}
                {user ? <BlogPostForm user={user} onSave={createPost} /> : <p><a href="/signin">Sign in</a> to create a post.</p>}
                <PostList posts={posts} user={user} onEdit={post =>
                {
                    setError("");
                    setEditing(post);
                }} onDelete={deletePost} deleting={deleting} />
            </main>
        </>
    );
}

createRoot(document.getElementById("root")).render(<App />);
