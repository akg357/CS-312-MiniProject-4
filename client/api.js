// Send form data as JSON and keep the session cookie with each request.
export default async function api(url, data)
{
    const response = await fetch(url,
    {
        method: data === undefined ? "GET" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: data === undefined ? undefined : JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to complete the request.");
    return result;
}
