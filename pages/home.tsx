import React, { useState } from "react";

interface LinkItem {
  href: string;
  text: string;
}

export default function HomePage() {
  const [url, setUrl] = useState("https://example.com");
  const [links, setLinks] = useState<LinkItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError(null);
    setLinks(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/crawl?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Request failed");
      }
      setLinks(data.links || []);
    } catch (err: any) {
      setError(err?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "2rem 1rem",
        background: "#fafafa",
      }}
    >
      <div
        style={{
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          padding: "2rem",
          lineHeight: 1.5,
          width: "100%",
          maxWidth: 760,
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 6px 18px rgba(15,15,15,0.06)",
        }}
      >
        <h1>Web Link Crawler</h1>
        <p>
          Enter a URL and we will parse all links on that page (server-side fetch
          to avoid CORS issues).
        </p>

        <form
          onSubmit={onSubmit}
          style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}
        >
        <input
          type="url"
          required
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            border: "1px solid #ccc",
            borderRadius: 6,
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.5rem 0.9rem",
            borderRadius: 6,
            border: "1px solid #666",
            background: "#111",
            color: "#fff",
          }}
        >
          {loading ? "Fetching…" : "Fetch Links"}
        </button>
        </form>

      {error && (
        <div style={{ marginTop: "1rem", color: "#b00020" }}>
          Error: {error}
        </div>
      )}

      {links && (
        <div style={{ marginTop: "1.5rem" }}>
          <h2>Found {links.length} links</h2>
          {links.length === 0 ? (
            <p>No links found.</p>
          ) : (
            <ul style={{ marginTop: "0.5rem" }}>
              {links.map((l, idx) => (
                <li key={`${l.href}-${idx}`}>
                  <a href={l.href} target="_blank" rel="noreferrer noopener">
                    {l.text || l.href}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

        <div style={{ marginTop: "2rem", fontSize: 12, color: "#666" }}>
          <p>
            Note: Some sites may block crawling or large responses; if it fails,
            try another public page.
          </p>
        </div>
      </div>
    </div>
  );
}
