import React from "react";

import BlogPostForm from "./BlogPostForm";

export default function EditPost({ post, user, onSave })
{
    return (

        <>
            <header><h1>Edit My Blog Post</h1><p>Change your post and save it below.</p></header>

            <main>

                <BlogPostForm key={post.blog_id} user={user} post={post} onSave={onSave} />

            </main>
            
        </>
    );
}
