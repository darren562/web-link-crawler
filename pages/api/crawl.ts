import type { NextApiRequest, NextApiResponse } from "next";
import { load } from "cheerio";

interface LinkItem {
  href: string;
  text: string;
}

function isHttpUrl(u: string): boolean {
  try {
    const parsed = new URL(u);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_) {
    return false;
  }
}

async function fetchWithTimeout(url: string, ms = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      // Identify ourselves politely
      headers: {
        "user-agent": "web-link-crawler-demo/0.1 (+https://example.com)",
      },
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ links?: LinkItem[]; error?: string }>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Only GET is allowed" });
  }

  const urlParam = req.query.url;
  const url = Array.isArray(urlParam) ? urlParam[0] : urlParam;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing `url` query parameter" });
  }

  if (!isHttpUrl(url)) {
    return res
      .status(400)
      .json({ error: "Invalid URL (must start with http or https)" });
  }

  try {
    const r = await fetchWithTimeout(url, 12000);
    if (!r.ok) {
      return res
        .status(r.status)
        .json({ error: `Upstream responded with status ${r.status}` });
    }

    const contentType = r.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      // Still try to read but warn
      // return res.status(400).json({ error: 'Target is not an HTML page' });
    }

    const html = await r.text();
    const $ = load(html);

    const unique = new Set<string>();
    const links: LinkItem[] = [];
    const baseUrl = new URL(url);

    $("a[href]").each((_, el) => {
      const rawHref = $(el).attr("href")?.trim();
      if (!rawHref) return;
      try {
        const absolute = new URL(rawHref, baseUrl).toString();
        if (unique.has(absolute)) return;
        unique.add(absolute);
        const text = $(el).text().trim().replace(/\s+/g, " ");
        links.push({ href: absolute, text });
      } catch (_) {
        // ignore invalid URLs
      }
    });

    return res.status(200).json({ links });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return res.status(504).json({ error: "Fetch timeout" });
    }
    return res.status(500).json({ error: err?.message || "Internal error" });
  }
}
