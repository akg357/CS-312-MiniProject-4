import React from "react";

export default function PostList({ posts, user, onEdit, onDelete, deleting })
{
    return (
        <section>


            <h2>Blog Posts</h2>
            {posts.length === 0 && <p>No blog posts yet.</p>}
            {/* Display each post returned by the database. */}
            {posts.map(post =>
            (
                <article key={post.blog_id}>

                    <h3>{post.title}</h3>
                    <p>By {post.creator_name}</p>
                    <p>Created: {new Date(post.date_created).toLocaleString('en-US')}</p>
                    <p className="post-body">{post.body}</p>
                    {/* Only show these buttons for posts owned by this user. */}
                    {user && user.user_id === post.creator_user_id &&
                    (
                        <div className="actions">
                            <a href={"/posts/edit/" + post.blog_id} onClick={event =>
                            {
                                event.preventDefault();
                                onEdit(post);
                            }}>Edit</a>
                            <form onSubmit={event =>
                            {
                                event.preventDefault();
                                onDelete(post.blog_id);
                            }}>
                                <button type="submit" disabled={deleting === post.blog_id}>Delete</button>
                            </form>
                        </div>
                    )}
                </article>
            ))}
        </section>
    );
}
