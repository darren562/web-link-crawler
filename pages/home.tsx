import React, { useState } from "react";

interface LinkItem {
  href: string;
  text: string;
}

export default function HomePage() {
  const [urls, setUrls] = useState<string[]>([
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [links, setLinks] = useState<LinkItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError(null);
    setLinks(null);
    setLoading(true);
    setProgress(null);
    try {
      const inputUrls = urls.map((u) => u.trim()).filter((u) => u.length > 0);

      if (inputUrls.length === 0) {
        throw new Error("请至少输入一个链接");
      }

      const unique = new Set<string>();
      const merged: LinkItem[] = [];
      const total = inputUrls.length;

      for (let i = 0; i < inputUrls.length; i++) {
        const u = inputUrls[i];
        setProgress({ current: i + 1, total });
        try {
          const res = await fetch(`/api/crawl?url=${encodeURIComponent(u)}`);
          const data = await res.json();
          if (!res.ok) {
            // if one fails, continue others
            // collect message subtly
            console.warn("crawl failed:", u, data?.error);
            continue;
          }
          const list: LinkItem[] = Array.isArray(data.links) ? data.links : [];
          for (const item of list) {
            if (!unique.has(item.href)) {
              unique.add(item.href);
              merged.push(item);
            }
          }
        } catch (err) {
          console.warn("crawl error:", u, err);
          continue;
        }
      }

      setLinks(merged);
    } catch (err: any) {
      setError(err?.message || "Unknown error");
    } finally {
      setLoading(false);
      setProgress(null);
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
          输入最多 10 个链接，服务端将分别抓取每个页面中的所有链接并合并输出。
        </p>

        <form onSubmit={onSubmit} style={{ marginTop: "1rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "0.5rem",
            }}
          >
            {urls.map((val, idx) => (
              <input
                key={idx}
                type="url"
                placeholder={`URL ${idx + 1}`}
                value={val}
                onChange={(e) => {
                  const next = [...urls];
                  next[idx] = e.target.value;
                  setUrls(next);
                }}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  border: "1px solid #ccc",
                  borderRadius: 6,
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
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
              {loading && progress
                ? `Fetching ${progress.current}/${progress.total}…`
                : "Fetch & Merge Links"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setUrls(["", "", "", "", "", "", "", "", "", ""]);
                setLinks(null);
                setError(null);
              }}
              style={{
                padding: "0.5rem 0.9rem",
                borderRadius: 6,
                border: "1px solid #bbb",
                background: "#f5f5f5",
                color: "#333",
              }}
            >
              Clear
            </button>
          </div>
        </form>

        {error && (
          <div style={{ marginTop: "1rem", color: "#b00020" }}>
            Error: {error}
          </div>
        )}

        {links && (
          <div style={{ marginTop: "1.5rem" }}>
            <h2>Found {links.length} merged links</h2>
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
