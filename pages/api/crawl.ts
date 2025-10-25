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

type HeaderProfile = "chrome" | "wechat";

function buildHeaders(
  profile: HeaderProfile,
  referer?: string
): Record<string, string> {
  // A realistic browser-like header set can help with strict sites.
  // We keep it minimal to avoid spoofing too much.
  const base: Record<string, string> = {
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    // Next/Node handles Accept-Encoding automatically; setting it manually can cause issues.
    // 'Accept-Encoding': 'gzip, deflate, br',
    // Provide a common desktop Chrome UA by default
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
  };

  if (profile === "wechat") {
    // A UA resembling WeChat in-app browser can improve success rate on mp.weixin.qq.com
    base["User-Agent"] =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.40(0x1800282c) NetType/WIFI Language/zh_CN";
  }

  if (referer && isHttpUrl(referer)) {
    base["Referer"] = referer;
  }

  return base;
}

async function fetchWithTimeout(
  url: string,
  ms = 10000,
  headers?: Record<string, string>
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers,
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
  const profileParam = req.query.profile;
  const profile: HeaderProfile =
    profileParam === "wechat" || profileParam === "chrome"
      ? (profileParam as HeaderProfile)
      : "chrome";
  const refererParam = req.query.referer;
  const referer = Array.isArray(refererParam) ? refererParam[0] : refererParam;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing `url` query parameter" });
  }

  if (!isHttpUrl(url)) {
    return res
      .status(400)
      .json({ error: "Invalid URL (must start with http or https)" });
  }

  try {
    const headers = buildHeaders(
      profile,
      typeof referer === "string" ? referer : undefined
    );
    const r = await fetchWithTimeout(url, 15000, headers);
    if (!r.ok) {
      let bodySnippet = "";
      try {
        const txt = await r.text();
        bodySnippet = txt.slice(0, 400);
      } catch {}
      return res.status(r.status).json({
        error: `Upstream responded with status ${r.status}. ${
          bodySnippet ? "Snippet: " + bodySnippet : ""
        }`.trim(),
      });
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
        // Skip non-http(s) links
        if (/^(javascript:|data:|mailto:|tel:)/i.test(rawHref)) return;
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
