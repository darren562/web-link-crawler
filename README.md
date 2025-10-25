# Web Link Crawler

A simple link crawling demo built with Next.js.

## Getting Started

Development:

```bash
npm install
npm run dev
```

Then open: http://localhost:3000/demo

Production build and start:

```bash
npm run build
npm start
```

## Features

- Page: `/demo` — Enter a URL, the server fetches the page and parses all hyperlinks.
- API: `/api/crawl` — GET only, use the `url` query parameter to specify the page to crawl.

Notes:

- Crawling runs on the server to avoid browser CORS restrictions.
- Some sites may block crawling or return non-HTML content. If a request fails, try another public webpage.
