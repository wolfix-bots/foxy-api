import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = '1.0.0';
const CREATOR = 'Foxy Tech';

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '..', 'public')));

app.use((req, _res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health')
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

async function apiFetch(url, timeout = 15000) {
    const { default: fetch } = await import('node-fetch');
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, { signal: controller.signal });
        return await res.json();
    } finally { clearTimeout(t); }
}

function ok(res, data)          { return res.json({ success: true, creator: CREATOR, version: VERSION, ...data }); }
function fail(res, msg, s = 500){ return res.status(s).json({ success: false, creator: CREATOR, error: msg }); }

// ── Health ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() }));

// ── AI ──────────────────────────────────────────────────────────────
app.get('/api/ai/chat', async (req, res) => {
    const q = req.query.q || req.query.query;
    if (!q) return fail(res, 'Parameter q is required', 400);
    try {
        const d = await apiFetch(`https://api.giftedtech.co.ke/api/ai/letmegpt?apikey=gifted&q=${encodeURIComponent(q)}`);
        if (!d.success) throw new Error(d.error || 'AI error');
        return ok(res, { result: d.result });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/ai/deepseek', async (req, res) => {
    const q = req.query.q || req.query.query;
    if (!q) return fail(res, 'Parameter q is required', 400);
    try {
        const d = await apiFetch(`https://apis.xwolf.space/api/ai/deepseek?q=${encodeURIComponent(q)}`);
        if (!d.status && !d.success) throw new Error(d.message || 'AI error');
        return ok(res, { result: d.result });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/ai/gemini', async (req, res) => {
    const q = req.query.q || req.query.query;
    if (!q) return fail(res, 'Parameter q is required', 400);
    try {
        const d = await apiFetch(`https://apis.xwolf.space/api/ai/gemini?q=${encodeURIComponent(q)}`);
        if (!d.status && !d.success) throw new Error(d.message || 'AI error');
        return ok(res, { result: d.result });
    } catch (e) { return fail(res, e.message); }
});

// ── Search ──────────────────────────────────────────────────────────
app.get('/api/search/google', async (req, res) => {
    const q = req.query.q || req.query.query;
    if (!q) return fail(res, 'Parameter q is required', 400);
    try {
        const d = await apiFetch(`https://api.giftedtech.co.ke/api/search/google?query=${encodeURIComponent(q)}&apikey=gifted`);
        if (!d.success) throw new Error('Search failed');
        return ok(res, { results: d.results });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/search/lyrics', async (req, res) => {
    const q = req.query.q || req.query.query || req.query.song;
    if (!q) return fail(res, 'Parameter q is required', 400);
    try {
        const d = await apiFetch(`https://api.giftedtech.co.ke/api/search/lyrics?query=${encodeURIComponent(q)}&apikey=gifted`);
        if (!d.success) throw new Error('Lyrics not found');
        return ok(res, { result: d.result });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/search/wallpaper', async (req, res) => {
    const q = req.query.q || req.query.query || 'nature';
    try {
        const d = await apiFetch(`https://api.giftedtech.co.ke/api/search/wallpaper?query=${encodeURIComponent(q)}&apikey=gifted`);
        if (!d.success) throw new Error('No wallpapers found');
        return ok(res, { results: d.results });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/search/news', async (req, res) => {
    const q = req.query.q || req.query.query;
    if (!q) return fail(res, 'Parameter q is required', 400);
    try {
        const d = await apiFetch(`https://apis.xwolf.space/api/search/news?q=${encodeURIComponent(q)}`);
        if (!d.success) throw new Error('No news found');
        return ok(res, { results: d.results, source: d.source });
    } catch (e) { return fail(res, e.message); }
});

// ── Tools ───────────────────────────────────────────────────────────
app.get('/api/tools/weather', async (req, res) => {
    const city = req.query.city || req.query.q;
    if (!city) return fail(res, 'Parameter city is required', 400);
    try {
        const d = await apiFetch(`https://apis.xwolf.space/api/tools/weather?city=${encodeURIComponent(city)}`);
        if (!d.success) throw new Error(d.message || 'Weather not found');
        return ok(res, { result: d.result });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/tools/qrcode', async (req, res) => {
    const text = req.query.text || req.query.q;
    if (!text) return fail(res, 'Parameter text is required', 400);
    try {
        const d = await apiFetch(`https://apis.xwolf.space/api/tools/qrcode?text=${encodeURIComponent(text)}`);
        if (!d.success) throw new Error('QR generation failed');
        return ok(res, { result: d.result });
    } catch (e) { return fail(res, e.message); }
});

// ── Stalk ───────────────────────────────────────────────────────────
app.get('/api/stalk/github', async (req, res) => {
    const username = req.query.username || req.query.q;
    if (!username) return fail(res, 'Parameter username is required', 400);
    try {
        const d = await apiFetch(`https://apis.xwolf.space/api/stalk/github?username=${encodeURIComponent(username)}`);
        if (!d.success) throw new Error('User not found');
        const { success, creator, ...rest } = d;
        return ok(res, { result: rest });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/stalk/tiktok', async (req, res) => {
    const username = req.query.username || req.query.q;
    if (!username) return fail(res, 'Parameter username is required', 400);
    try {
        const d = await apiFetch(`https://apis.xwolf.space/api/stalk/tiktok?username=${encodeURIComponent(username)}`);
        if (!d.success) throw new Error('User not found');
        const { success, creator, ...rest } = d;
        return ok(res, { result: rest });
    } catch (e) { return fail(res, e.message); }
});

// ── Downloader ──────────────────────────────────────────────────────
app.get('/api/downloader/ytmp3', async (req, res) => {
    const url = req.query.url || req.query.q;
    if (!url) return fail(res, 'Parameter url is required', 400);
    try {
        const d = await apiFetch(`https://apis.xwolf.space/download/mp3?url=${encodeURIComponent(url)}`, 30000);
        if (!d.success) throw new Error(d.error || 'Download failed');
        return ok(res, { result: d });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/downloader/ytmp4', async (req, res) => {
    const url = req.query.url || req.query.q;
    if (!url) return fail(res, 'Parameter url is required', 400);
    try {
        const d = await apiFetch(`https://apis.xwolf.space/download/mp4?url=${encodeURIComponent(url)}`, 30000);
        if (!d.success) throw new Error(d.error || 'Download failed');
        return ok(res, { result: d });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/downloader/tiktok', async (req, res) => {
    const url = req.query.url;
    if (!url) return fail(res, 'Parameter url is required', 400);
    if (!url.includes('tiktok')) return fail(res, 'Invalid TikTok URL', 400);
    try {
        const d = await apiFetch(`https://apis.xcasper.space/api/downloader/tiktok?url=${encodeURIComponent(url)}`, 30000);
        if (!d.success || d.error) throw new Error(d.message || 'Download failed');
        return ok(res, { result: d.result || d });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/downloader/facebook', async (req, res) => {
    const url = req.query.url;
    if (!url) return fail(res, 'Parameter url is required', 400);
    try {
        const d = await apiFetch(`https://fb.xcasper.space/scrape?url=${encodeURIComponent(url)}`, 30000);
        if (!d.success) throw new Error('Could not fetch video');
        return ok(res, { title: d.title, thumbnail: d.thumbnail, links: d.links });
    } catch (e) { return fail(res, e.message); }
});

// ── 404 for API ──────────────────────────────────────────────────────
app.use('/api/*', (_req, res) => res.status(404).json({ success: false, creator: CREATOR, error: 'Endpoint not found.' }));

// ── SPA fallback ─────────────────────────────────────────────────────
app.get('*', (_req, res) => res.sendFile(join(__dirname, '..', 'public', 'index.html')));

app.listen(PORT, () => console.log(`Foxy Tech API v${VERSION} running on port ${PORT}`));
