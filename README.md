# 🦊 Foxy API

> Central REST API for the Foxy Bot ecosystem. 85+ endpoints powering FoxyStream, FoxyFlix, and all Foxy bots.

## Base URL
```
https://foxy-api-febf.onrender.com
```

## Key Endpoint Groups

| Group | Path | Description |
|---|---|---|
| Movies | `/api/movies/*` | Search, detail, streams, play |
| Streaming | `/api/movies/stream` | Pipe xcasper bff/stream |
| Instagram | `/api/ig/*` | Instagram bot actions |
| WhatsApp | `/api/wa/*` | WhatsApp bot actions |
| AI | `/api/ai/*` | AI chat, recommendations |

## Notable Endpoints
```
GET  /api/movies/search?keyword=&page=&perPage=&subjectType=
GET  /api/movies/detail?subjectId=
GET  /api/movies/play?subjectId=            ← returns CDN stream URLs
GET  /api/movies/stream?subjectId=&streamId= ← pipes bff/stream
GET  /api/movies/captions?subjectId=&streamId=
```

## Deploy on Render (Web Service)

| Setting | Value |
|---|---|
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Node Version** | 18+ |

## Environment Variables Required
```
SESSION_SECRET=
TELEGRAM_BOT_TOKEN=
```

## Tech Stack
- **Node.js** + **Express**
- xcasper API proxy with Cloudflare bypass headers
- Supabase for session management

---
**Maintained by Foxy Tech**
