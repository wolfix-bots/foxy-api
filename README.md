# 🦊 Foxy Tech API

A free, multi-purpose REST API built with Node.js + Express. No API keys, no sign-ups, no rate limits on most endpoints. 49 endpoints across 8 categories.

**Live explorer:** https://foxy-api-febf.onrender.com

---

## Categories & Endpoints

| Category | Endpoints |
|---|---|
| 🤖 AI | `/api/ai/chat` `/api/ai/deepseek` `/api/ai/gemini` `/api/ai/mistral` |
| 🔍 Search | `/api/search/google` `/api/search/youtube` `/api/search/lyrics` `/api/search/wallpaper` `/api/search/news` |
| 🛠️ Tools | `/api/tools/weather` `/api/tools/qrcode` `/api/tools/screenshot` `/api/tools/age` `/api/tools/countdown` |
| 🕵️ Stalk | `/api/stalk/github` `/api/stalk/tiktok` |
| ⬇️ Downloader | `/api/downloader/ytmp3` `/api/downloader/ytmp4` `/api/downloader/tiktok` `/api/downloader/spotify` `/api/downloader/facebook` |
| 🎲 Fun | `/api/fun/joke` `/api/fun/dadjoke` `/api/fun/fact` `/api/fun/advice` `/api/fun/affirmation` `/api/fun/insult` `/api/fun/chuck` `/api/fun/dog` `/api/fun/cat` `/api/fun/bored` |
| ℹ️ Info | `/api/info/dictionary` `/api/info/country` `/api/info/currency` `/api/info/color` `/api/info/time` |
| ⚙️ Utils | `/api/utils/password` `/api/utils/uuid` `/api/utils/hash` `/api/utils/base64` `/api/utils/textcase` `/api/utils/wordcount` `/api/utils/morse` `/api/utils/roman` `/api/utils/palindrome` `/api/utils/slug` `/api/utils/lorem` `/api/utils/binary` |

All requests are `GET`. All responses are JSON.

**Quick example:**
```
GET /api/ai/chat?q=What is the speed of light?
GET /api/tools/weather?city=Nairobi
GET /api/downloader/ytmp3?url=https://youtu.be/dQw4w9WgXcQ
GET /api/utils/hash?text=hello world&algo=sha256
```

---

## Running Locally

**Requirements:** Node.js 18+

```bash
git clone https://github.com/wolfix-bots/foxy-api.git
cd foxy-api
npm install
npm start
```

The server starts on `http://localhost:3000` (or the `PORT` env variable).

```bash
# Development mode (auto-restarts on file changes)
npm run dev
```

---

## Deployment

### Render (recommended — free tier available)

1. Fork this repo to your GitHub account
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Set:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Click **Deploy**

Render will auto-deploy on every push to `main`.

---

### Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select your fork
3. Railway auto-detects Node.js and runs `npm start`
4. Click **Generate Domain** to get a public URL

---

### Heroku

```bash
heroku login
heroku create my-foxy-api
git push heroku main
heroku open
```

---

### Fly.io

```bash
npm install -g @fly/fly
fly auth login
fly launch       # follow the prompts, picks Node automatically
fly deploy
```

---

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t foxy-api .
docker run -p 3000:3000 foxy-api
```

---

### VPS / Ubuntu Server

```bash
# Install Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and run
git clone https://github.com/wolfix-bots/foxy-api.git
cd foxy-api && npm install

# Keep it running with PM2
npm install -g pm2
pm2 start src/index.js --name foxy-api
pm2 startup && pm2 save
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the server listens on |

No other environment variables are required — all APIs used are free and keyless.

---

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express 4
- **External APIs:** xwolf, xcasper, GiftedTech, JokeAPI, dictionaryapi.dev, restcountries.com, frankfurter.app, and others (all free, no keys)
- **Self-built utils:** 12 endpoints using only Node.js built-ins (crypto, buffer)

---

## License

MIT — free to use, modify and deploy anywhere.

Built by [Foxy Tech](https://github.com/wolfix-bots)
