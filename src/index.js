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
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try { const r = await fetch(url, { signal: ctrl.signal }); return await r.json(); }
    finally { clearTimeout(t); }
}
const ok   = (res, d)      => res.json({ success: true, creator: CREATOR, version: VERSION, ...d });
const fail = (res, m, s=500) => res.status(s).json({ success: false, creator: CREATOR, error: m });

// ── Health ──
app.get('/health', (_q, r) => r.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() }));

// ── AI ──
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
    } catch (e) {
        // fallback: xcasper gemini
        try {
            const d2 = await apiFetch(`https://apis.xcasper.space/api/ai/gemini?q=${encodeURIComponent(q)}`);
            if (!d2.success) throw new Error('Both Gemini sources failed');
            return ok(res, { result: d2.reply });
        } catch (e2) { return fail(res, e2.message); }
    }
});

app.get('/api/ai/mistral', async (req, res) => {
    const q = req.query.q || req.query.query || req.query.message;
    if (!q) return fail(res, 'Parameter q is required', 400);
    try {
        const d = await apiFetch(`https://apis.xcasper.space/api/ai/mistral?message=${encodeURIComponent(q)}`);
        if (!d.success) throw new Error(d.message || 'AI error');
        return ok(res, { result: d.reply });
    } catch (e) { return fail(res, e.message); }
});

// ── Search ──
app.get('/api/search/google', async (req, res) => {
    const q = req.query.q || req.query.query;
    if (!q) return fail(res, 'Parameter q is required', 400);
    try {
        const d = await apiFetch(`https://api.giftedtech.co.ke/api/search/google?query=${encodeURIComponent(q)}&apikey=gifted`);
        if (!d.success) throw new Error('Search failed');
        return ok(res, { results: d.results });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/search/youtube', async (req, res) => {
    const q = req.query.q || req.query.query;
    if (!q) return fail(res, 'Parameter q is required', 400);
    try {
        const d = await apiFetch(`https://apis.xcasper.space/api/search/youtube?query=${encodeURIComponent(q)}`);
        if (!d.success) throw new Error('Search failed');
        return ok(res, { results: d.videos, count: d.count });
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

// ── Tools ──
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

// ── Stalk ──
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

// ── Downloader ──
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
        return ok(res, { result: d });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/downloader/spotify', async (req, res) => {
    const url = req.query.url;
    if (!url) return fail(res, 'Parameter url is required', 400);
    if (!url.includes('spotify.com/track')) return fail(res, 'Invalid Spotify track URL', 400);
    try {
        const d = await apiFetch(`https://apis.xcasper.space/api/downloader/spotify?url=${encodeURIComponent(url)}`, 30000);
        if (!d.success) throw new Error(d.message || 'Download failed');
        return ok(res, { result: d.track || d });
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

// ── 404 / SPA ──
app.use('/api/*', (_q, r) => r.status(404).json({ success: false, creator: CREATOR, error: 'Endpoint not found.' }));
app.get('*', (_q, r) => r.sendFile(join(__dirname, '..', 'public', 'index.html')));

app.listen(PORT, () => console.log(`Foxy Tech API v${VERSION} on port ${PORT}`));
