import React, { useState } from "react";

interface LinkItem {
  href: string;
  text: string;
}

export default function DemoPage() {
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
        throw new Error(data?.error || "请求失败");
      }
      setLinks(data.links || []);
    } catch (err: any) {
      setError(err?.message || "未知错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        padding: "2rem",
        lineHeight: 1.5,
      }}
    >
      <h1>Web Link Crawler Demo</h1>
      <p>
        输入一个 URL，我们将解析页面中的所有链接（服务端进行抓取以避免 CORS
        问题）。
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
          {loading ? "抓取中…" : "抓取链接"}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: "1rem", color: "#b00020" }}>错误：{error}</div>
      )}

      {links && (
        <div style={{ marginTop: "1.5rem" }}>
          <h2>发现 {links.length} 个链接</h2>
          {links.length === 0 ? (
            <p>未找到链接。</p>
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
          提示：某些站点可能拒绝抓取或者阻止请求；如遇失败请尝试其它公开网页。
        </p>
      </div>
    </div>
  );
}
