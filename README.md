# Foxy Tech API

Multi-purpose REST API powering Foxy Bot. Deploy on Render.

## Deploy on Render

1. Fork or connect this repo on Render
2. Set runtime: **Node**
3. Build command: `npm install`
4. Start command: `npm start`

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API info & endpoint list |
| GET | `/health` | Health check |
| GET | `/api/ai/chat?q=` | AI chat response |
| GET | `/api/search/google?q=` | Web search results |
| GET | `/api/search/lyrics?q=` | Song lyrics |
| GET | `/api/search/wallpaper?q=` | Wallpaper images |
| GET | `/api/downloader/tiktok?url=` | TikTok video download |
| GET | `/api/downloader/ytmp3?url=` | YouTube audio download |
| GET | `/api/downloader/ytmp4?url=` | YouTube video download |

## Response Format

```json
{
  "success": true,
  "creator": "Foxy Tech",
  "version": "1.0.0",
  "result": { ... }
}
```
