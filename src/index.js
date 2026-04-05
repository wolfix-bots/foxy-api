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

// ── Serve static frontend ──
app.use(express.static(join(__dirname, '..', 'public')));

// ── Logging ──
app.use((req, _res, next) => {
    if (!req.path.startsWith('/api') && req.path !== '/health') return next();
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ── Helper ──
async function apiFetch(url, timeout = 15000) {
    const { default: fetch } = await import('node-fetch');
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, { signal: controller.signal });
        return await res.json();
    } finally {
        clearTimeout(t);
    }
}

function ok(res, data) {
    return res.json({ success: true, creator: CREATOR, version: VERSION, ...data });
}
function fail(res, message, status = 500) {
    return res.status(status).json({ success: false, creator: CREATOR, error: message });
}

// ── Health ──
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

// ── AI Chat ──
app.get('/api/ai/chat', async (req, res) => {
    const q = req.query.q || req.query.query || req.query.text;
    if (!q) return fail(res, 'Query parameter q is required', 400);
    try {
        const data = await apiFetch(
            'https://api.giftedtech.co.ke/api/ai/letmegpt?apikey=gifted&q=' + encodeURIComponent(q)
        );
        if (!data.success) throw new Error(data.error || 'AI error');
        return ok(res, { result: data.result });
    } catch (e) {
        return fail(res, e.message);
    }
});

// ── Google Search ──
app.get('/api/search/google', async (req, res) => {
    const q = req.query.q || req.query.query;
    if (!q) return fail(res, 'Query parameter q is required', 400);
    try {
        const data = await apiFetch(
            'https://api.giftedtech.co.ke/api/search/google?query=' + encodeURIComponent(q) + '&apikey=gifted'
        );
        if (!data.success) throw new Error('Search failed');
        return ok(res, { results: data.results });
    } catch (e) {
        return fail(res, e.message);
    }
});

// ── Lyrics ──
app.get('/api/search/lyrics', async (req, res) => {
    const q = req.query.q || req.query.query || req.query.song;
    if (!q) return fail(res, 'Query parameter q is required', 400);
    try {
        const data = await apiFetch(
            'https://api.giftedtech.co.ke/api/search/lyrics?query=' + encodeURIComponent(q) + '&apikey=gifted'
        );
        if (!data.success) throw new Error('Lyrics not found');
        return ok(res, { result: data.result });
    } catch (e) {
        return fail(res, e.message);
    }
});

// ── Wallpaper ──
app.get('/api/search/wallpaper', async (req, res) => {
    const q = req.query.q || req.query.query || 'nature';
    try {
        const data = await apiFetch(
            'https://api.giftedtech.co.ke/api/search/wallpaper?query=' + encodeURIComponent(q) + '&apikey=gifted'
        );
        if (!data.success) throw new Error('No wallpapers found');
        return ok(res, { results: data.results });
    } catch (e) {
        return fail(res, e.message);
    }
});

// ── TikTok Downloader ──
app.get('/api/downloader/tiktok', async (req, res) => {
    const url = req.query.url;
    if (!url) return fail(res, 'URL parameter is required', 400);
    if (!url.includes('tiktok')) return fail(res, 'Invalid TikTok URL', 400);
    try {
        const data = await apiFetch(
            'https://apis.xcasper.space/api/downloader/tiktok?url=' + encodeURIComponent(url), 30000
        );
        if (!data.success || data.error) throw new Error(data.message || 'Download failed');
        return ok(res, { result: data.result || data });
    } catch (e) {
        return fail(res, e.message);
    }
});

// ── YouTube MP3 ──
app.get('/api/downloader/ytmp3', async (req, res) => {
    const url = req.query.url || req.query.q;
    if (!url) return fail(res, 'URL or query parameter is required', 400);
    try {
        const data = await apiFetch(
            'https://apis.xwolf.space/download/mp3?url=' + encodeURIComponent(url), 30000
        );
        if (!data.success) throw new Error(data.error || 'Download failed');
        return ok(res, { result: data.result || data });
    } catch (e) {
        return fail(res, e.message);
    }
});

// ── YouTube MP4 ──
app.get('/api/downloader/ytmp4', async (req, res) => {
    const url = req.query.url || req.query.q;
    if (!url) return fail(res, 'URL or query parameter is required', 400);
    try {
        const data = await apiFetch(
            'https://apis.xwolf.space/download/mp4?url=' + encodeURIComponent(url), 30000
        );
        if (!data.success) throw new Error(data.error || 'Download failed');
        return ok(res, { result: data.result || data });
    } catch (e) {
        return fail(res, e.message);
    }
});

// ── 404 for API routes ──
app.use('/api/*', (_req, res) => {
    res.status(404).json({ success: false, creator: CREATOR, error: 'API endpoint not found.' });
});

// ── SPA fallback for frontend ──
app.get('*', (_req, res) => {
    res.sendFile(join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Foxy Tech API v${VERSION} running on port ${PORT}`);
});
