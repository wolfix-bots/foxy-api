import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = '2.0.0';
const CREATOR = 'Foxy Tech';

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '..', 'public')));
app.use((req, _res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health')
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

async function apiFetch(url, timeout = 15000, headers = {}) {
    const { default: fetch } = await import('node-fetch');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
        const r = await fetch(url, { signal: ctrl.signal, headers });
        const ct = r.headers.get('content-type') || '';
        if (!ct.includes('json') && !ct.includes('text/plain')) {
            const text = await r.text();
            if (text.includes('<!DOCTYPE') || text.includes('<html'))
                throw new Error(`Upstream service returned an HTML page instead of JSON (HTTP ${r.status}) — it may be unavailable or blocking server requests`);
            throw new Error(`Unexpected response format (HTTP ${r.status}): ${text.slice(0, 100).replace(/\s+/g, ' ')}`);
        }
        return await r.json();
    } finally { clearTimeout(t); }
}

// Strip any upstream branding fields so our creator always wins
function clean(d) {
    if (!d || typeof d !== 'object') return d;
    const { creator, provider, code, status, ...rest } = d;
    return rest;
}

const ok   = (res, d)        => res.json({ success: true, creator: CREATOR, version: VERSION, ...clean(d) });
const fail = (res, m, s=500) => res.status(s).json({ success: false, creator: CREATOR, error: m });

// ── Health ──────────────────────────────────────────────────────
app.get('/health', (_q, r) => r.json({ status: 'ok', creator: CREATOR, version: VERSION, uptime: Math.floor(process.uptime()), timestamp: Date.now() }));

// ═══════════════════════════════════════════════════════════════
//  AI
// ═══════════════════════════════════════════════════════════════
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
        if (!d.status && !d.success) throw new Error('xwolf failed');
        return ok(res, { result: d.result });
    } catch {
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

// ═══════════════════════════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
//  TOOLS
// ═══════════════════════════════════════════════════════════════
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

app.get('/api/tools/screenshot', async (req, res) => {
    const url = req.query.url || req.query.q;
    if (!url) return fail(res, 'Parameter url is required', 400);
    if (!/^https?:\/\//i.test(url)) return fail(res, 'URL must start with http:// or https://', 400);
    const w = Math.min(parseInt(req.query.width) || 1280, 1920);
    const h = Math.min(parseInt(req.query.height) || 720, 1080);
    const screenshotUrl = `https://image.thum.io/get/width/${w}/crop/${h}/${encodeURIComponent(url)}`;
    return ok(res, { result: screenshotUrl, width: w, height: h, url });
});

app.get('/api/tools/age', async (req, res) => {
    const dob = req.query.dob || req.query.date;
    if (!dob) return fail(res, 'Parameter dob is required (YYYY-MM-DD)', 400);
    const birth = new Date(dob);
    if (isNaN(birth)) return fail(res, 'Invalid date format. Use YYYY-MM-DD', 400);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();
    if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (months < 0) { years--; months += 12; }
    const totalDays = Math.floor((now - birth) / 86400000);
    return ok(res, { result: { years, months, days, total_days: totalDays, dob } });
});

app.get('/api/tools/countdown', async (req, res) => {
    const date = req.query.date || req.query.to;
    if (!date) return fail(res, 'Parameter date is required (YYYY-MM-DD)', 400);
    const target = new Date(date);
    if (isNaN(target)) return fail(res, 'Invalid date format. Use YYYY-MM-DD', 400);
    const now = new Date();
    const diff = target - now;
    const past = diff < 0;
    const absDiff = Math.abs(diff);
    const totalDays = Math.floor(absDiff / 86400000);
    const hours = Math.floor((absDiff % 86400000) / 3600000);
    const minutes = Math.floor((absDiff % 3600000) / 60000);
    return ok(res, { result: { target: date, past, total_days: totalDays, hours, minutes } });
});

// ═══════════════════════════════════════════════════════════════
//  STALK
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
//  DOWNLOADER
// ═══════════════════════════════════════════════════════════════
app.get('/api/downloader/ytmp3', async (req, res) => {
    const url = req.query.url || req.query.link || req.query.q;
    if (!url) return fail(res, 'Parameter url is required', 400);
    try {
        const d = await apiFetch(`https://apis.xwolf.space/download/mp3?url=${encodeURIComponent(url)}`, 35000);
        if (!d.success) throw new Error(d.error || 'Download failed');
        return ok(res, {
            title: d.title,
            quality: d.quality,
            thumbnail: d.thumbnail,
            download_url: d.downloadUrl || d.download_url,
            youtube_url: d.youtubeUrl
        });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/downloader/ytmp4', async (req, res) => {
    const url = req.query.url || req.query.link || req.query.q;
    if (!url) return fail(res, 'Parameter url is required', 400);
    try {
        const d = await apiFetch(`https://apis.xwolf.space/download/mp4?url=${encodeURIComponent(url)}`, 35000);
        if (!d.success) throw new Error(d.error || 'Download failed');
        return ok(res, {
            title: d.title,
            quality: d.quality,
            thumbnail: d.thumbnail,
            download_url: d.downloadUrl || d.download_url,
            youtube_url: d.youtubeUrl
        });
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

// ═══════════════════════════════════════════════════════════════
//  FUN
// ═══════════════════════════════════════════════════════════════
app.get('/api/fun/joke', async (req, res) => {
    const cat = req.query.category || 'Any';
    try {
        const d = await apiFetch(`https://v2.jokeapi.dev/joke/${encodeURIComponent(cat)}?safe-mode`);
        if (d.error) throw new Error('No joke found');
        const joke = d.type === 'twopart' ? `${d.setup}\n\n${d.delivery}` : d.joke;
        return ok(res, { joke, category: d.category, type: d.type });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/fun/dadjoke', async (req, res) => {
    try {
        const d = await apiFetch('https://icanhazdadjoke.com/', 10000, { Accept: 'application/json' });
        return ok(res, { joke: d.joke });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/fun/fact', async (req, res) => {
    try {
        const d = await apiFetch('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en');
        return ok(res, { fact: d.text, source: d.source_url });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/fun/advice', async (req, res) => {
    try {
        const d = await apiFetch('https://api.adviceslip.com/advice');
        return ok(res, { advice: d.slip.advice, id: d.slip.id });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/fun/affirmation', async (req, res) => {
    try {
        const d = await apiFetch('https://www.affirmations.dev/');
        return ok(res, { affirmation: d.affirmation });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/fun/insult', async (req, res) => {
    try {
        const d = await apiFetch('https://evilinsult.com/generate_insult.php?lang=en&type=json');
        return ok(res, { insult: d.insult });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/fun/chuck', async (req, res) => {
    try {
        const d = await apiFetch('https://api.chucknorris.io/jokes/random');
        return ok(res, { joke: d.value, icon: d.icon_url });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/fun/dog', async (req, res) => {
    try {
        const d = await apiFetch('https://dog.ceo/api/breeds/image/random');
        if (d.status !== 'success') throw new Error('No image');
        return ok(res, { image: d.message });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/fun/cat', async (req, res) => {
    try {
        const d = await apiFetch('https://api.thecatapi.com/v1/images/search');
        if (!Array.isArray(d) || !d[0]) throw new Error('No image');
        return ok(res, { image: d[0].url, width: d[0].width, height: d[0].height });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/fun/bored', async (req, res) => {
    try {
        const d = await apiFetch('https://bored-api.appbrewery.com/random');
        return ok(res, { activity: d.activity, type: d.type, participants: d.participants, price: d.price });
    } catch (e) { return fail(res, e.message); }
});

// ═══════════════════════════════════════════════════════════════
//  INFO
// ═══════════════════════════════════════════════════════════════
app.get('/api/info/dictionary', async (req, res) => {
    const word = req.query.word || req.query.q;
    if (!word) return fail(res, 'Parameter word is required', 400);
    try {
        const d = await apiFetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
        if (!Array.isArray(d) || !d[0]) throw new Error('Word not found');
        const entry = d[0];
        const meanings = entry.meanings?.slice(0, 3).map(m => ({
            part_of_speech: m.partOfSpeech,
            definitions: m.definitions?.slice(0, 2).map(df => ({ definition: df.definition, example: df.example }))
        }));
        const audio = entry.phonetics?.find(p => p.audio)?.audio;
        return ok(res, { word: entry.word, phonetic: entry.phonetic, audio, meanings });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/info/country', async (req, res) => {
    const name = req.query.name || req.query.q;
    if (!name) return fail(res, 'Parameter name is required', 400);
    try {
        const d = await apiFetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(name)}`);
        if (!Array.isArray(d) || !d[0]) throw new Error('Country not found');
        const c = d[0];
        return ok(res, { result: {
            name: c.name?.common,
            official: c.name?.official,
            capital: c.capital?.[0],
            region: c.region,
            subregion: c.subregion,
            population: c.population,
            languages: c.languages,
            currencies: c.currencies,
            flag: c.flags?.png,
            emoji: c.flag,
            timezones: c.timezones,
            code: c.cca2
        }});
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/info/currency', async (req, res) => {
    const from = (req.query.from || 'USD').toUpperCase();
    const to   = (req.query.to   || 'EUR').toUpperCase();
    const amount = parseFloat(req.query.amount) || 1;
    try {
        const d = await apiFetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
        if (!d.rates) throw new Error('Currency not found');
        const rate = d.rates[to];
        return ok(res, { from, to, amount, rate, converted: +(rate * amount).toFixed(4), date: d.date });
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/info/color', async (req, res) => {
    const hex = (req.query.hex || req.query.q || '3498db').replace('#','');
    try {
        const d = await apiFetch(`https://www.thecolorapi.com/id?hex=${hex}&format=json`);
        return ok(res, { result: {
            hex: d.hex?.value,
            name: d.name?.value,
            rgb: d.rgb?.value,
            hsl: d.hsl?.value,
            hsv: d.hsv?.value,
            image: d.image?.bare
        }});
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/info/time', async (req, res) => {
    const tz = req.query.timezone || req.query.tz || 'UTC';
    try {
        const d = await apiFetch(`https://worldtimeapi.org/api/timezone/${encodeURIComponent(tz)}`);
        if (d.error) throw new Error(d.error || 'Timezone not found');
        return ok(res, { result: {
            timezone: d.timezone,
            datetime: d.datetime,
            utc_offset: d.utc_offset,
            day_of_week: d.day_of_week,
            day_of_year: d.day_of_year,
            week_number: d.week_number
        }});
    } catch (e) { return fail(res, e.message); }
});

// ═══════════════════════════════════════════════════════════════
//  UTILS  (all self-built — no external API)
// ═══════════════════════════════════════════════════════════════
app.get('/api/utils/password', (req, res) => {
    const length    = Math.min(Math.max(parseInt(req.query.length) || 16, 4), 128);
    const symbols   = req.query.symbols !== 'false';
    const numbers   = req.query.numbers !== 'false';
    const uppercase = req.query.uppercase !== 'false';
    let chars = 'abcdefghijklmnopqrstuvwxyz';
    if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (numbers)   chars += '0123456789';
    if (symbols)   chars += '!@#$%^&*()-_=+[]{}|;:,.<>?';
    const bytes = crypto.randomBytes(length);
    const password = Array.from(bytes).map(b => chars[b % chars.length]).join('');
    return ok(res, { password, length, symbols, numbers, uppercase });
});

app.get('/api/utils/uuid', (req, res) => {
    const count = Math.min(parseInt(req.query.count) || 1, 20);
    const uuids = Array.from({ length: count }, () => crypto.randomUUID());
    return ok(res, { uuids: count === 1 ? undefined : uuids, uuid: count === 1 ? uuids[0] : undefined, count });
});

app.get('/api/utils/hash', (req, res) => {
    const text = req.query.text || req.query.q;
    if (!text) return fail(res, 'Parameter text is required', 400);
    const algo = (req.query.algo || 'sha256').toLowerCase();
    const supported = ['md5','sha1','sha256','sha512','sha224','sha384'];
    if (!supported.includes(algo)) return fail(res, `Supported algorithms: ${supported.join(', ')}`, 400);
    const hash = crypto.createHash(algo).update(text).digest('hex');
    return ok(res, { hash, algorithm: algo, input_length: text.length });
});

app.get('/api/utils/base64', (req, res) => {
    const text   = req.query.text || req.query.q;
    const action = (req.query.action || 'encode').toLowerCase();
    if (!text) return fail(res, 'Parameter text is required', 400);
    try {
        if (action === 'encode') {
            return ok(res, { result: Buffer.from(text,'utf8').toString('base64'), action });
        } else if (action === 'decode') {
            return ok(res, { result: Buffer.from(text,'base64').toString('utf8'), action });
        } else {
            return fail(res, 'action must be encode or decode', 400);
        }
    } catch (e) { return fail(res, 'Invalid input: ' + e.message); }
});

app.get('/api/utils/textcase', (req, res) => {
    const text = req.query.text || req.query.q;
    const mode = (req.query.case || req.query.mode || 'upper').toLowerCase();
    if (!text) return fail(res, 'Parameter text is required', 400);
    let result;
    switch (mode) {
        case 'upper':   result = text.toUpperCase(); break;
        case 'lower':   result = text.toLowerCase(); break;
        case 'title':   result = text.replace(/\b\w/g, c => c.toUpperCase()); break;
        case 'camel':   result = text.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()); break;
        case 'snake':   result = text.toLowerCase().replace(/\s+/g, '_'); break;
        case 'kebab':   result = text.toLowerCase().replace(/\s+/g, '-'); break;
        case 'reverse': result = text.split('').reverse().join(''); break;
        default: return fail(res, 'case must be: upper, lower, title, camel, snake, kebab, reverse', 400);
    }
    return ok(res, { result, case: mode, original: text });
});

app.get('/api/utils/wordcount', (req, res) => {
    const text = req.query.text || req.query.q;
    if (!text) return fail(res, 'Parameter text is required', 400);
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim()).length;
    return ok(res, { result: {
        characters: text.length,
        characters_no_spaces: text.replace(/\s/g,'').length,
        words,
        sentences,
        paragraphs,
        reading_time_sec: Math.ceil(words / 3.3)
    }});
});

app.get('/api/utils/morse', (req, res) => {
    const text   = req.query.text || req.query.q;
    const action = (req.query.action || 'encode').toLowerCase();
    if (!text) return fail(res, 'Parameter text is required', 400);
    const ENC = { A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',0:'-----',1:'.----',2:'..---',3:'...--',4:'....-',5:'.....',6:'-....',7:'--...',8:'---..',9:'----.','.':'.-.-.-',',':'--..--','?':'..--..' };
    const DEC = Object.fromEntries(Object.entries(ENC).map(([k,v])=>[v,k]));
    try {
        if (action === 'encode') {
            const result = text.toUpperCase().split('').map(c => c === ' ' ? '/' : (ENC[c] || '?')).join(' ');
            return ok(res, { result, action });
        } else {
            const result = text.split(' / ').map(word => word.split(' ').map(code => DEC[code] || '?').join('')).join(' ');
            return ok(res, { result, action });
        }
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/utils/roman', (req, res) => {
    const num    = req.query.number || req.query.q;
    const action = (req.query.action || 'to_roman').toLowerCase();
    if (!num) return fail(res, 'Parameter number is required', 400);
    try {
        if (action === 'to_roman' || action === 'toroman') {
            let n = parseInt(num);
            if (isNaN(n) || n < 1 || n > 3999) return fail(res, 'Number must be between 1 and 3999', 400);
            const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
            const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
            let result = '';
            vals.forEach((v,i) => { while(n >= v) { result += syms[i]; n -= v; } });
            return ok(res, { result, input: parseInt(num), action });
        } else {
            const str = num.toUpperCase();
            const map = {I:1,V:5,X:10,L:50,C:100,D:500,M:1000};
            let result = 0;
            for (let i = 0; i < str.length; i++) {
                const curr = map[str[i]], next = map[str[i+1]];
                if (!curr) return fail(res, 'Invalid Roman numeral', 400);
                result += next > curr ? -curr : curr;
            }
            return ok(res, { result, input: str, action });
        }
    } catch (e) { return fail(res, e.message); }
});

app.get('/api/utils/palindrome', (req, res) => {
    const text = req.query.text || req.query.q;
    if (!text) return fail(res, 'Parameter text is required', 400);
    const clean = text.toLowerCase().replace(/[^a-z0-9]/g,'');
    const is_palindrome = clean === clean.split('').reverse().join('');
    return ok(res, { text, is_palindrome, cleaned: clean });
});

app.get('/api/utils/slug', (req, res) => {
    const text = req.query.text || req.query.q;
    if (!text) return fail(res, 'Parameter text is required', 400);
    const slug = text.toLowerCase().trim()
        .replace(/[àáâãäå]/g,'a').replace(/[èéêë]/g,'e').replace(/[ìíîï]/g,'i')
        .replace(/[òóôõö]/g,'o').replace(/[ùúûü]/g,'u').replace(/[ñ]/g,'n')
        .replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
    return ok(res, { slug, original: text });
});

app.get('/api/utils/lorem', (req, res) => {
    const count = Math.min(parseInt(req.query.words) || 50, 500);
    const WORDS = ['lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do','eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua','enim','ad','minim','veniam','quis','nostrud','exercitation','ullamco','laboris','nisi','aliquip','ex','ea','commodo','consequat','duis','aute','irure','reprehenderit','voluptate','velit','esse','cillum','eu','fugiat','nulla','pariatur','excepteur','sint','occaecat','cupidatat','non','proident','sunt','in','culpa','qui','officia','deserunt','mollit','anim','id','est','laborum'];
    const words = Array.from({length: count}, () => WORDS[Math.floor(Math.random()*WORDS.length)]);
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    return ok(res, { result: words.join(' ') + '.', word_count: count });
});

app.get('/api/utils/binary', (req, res) => {
    const input  = req.query.input || req.query.q;
    const action = (req.query.action || 'to_binary').toLowerCase();
    if (!input) return fail(res, 'Parameter input is required', 400);
    try {
        if (action === 'to_binary') {
            const n = parseInt(input);
            if (!isNaN(n)) return ok(res, { result: n.toString(2), type: 'number', action });
            const result = input.split('').map(c => c.charCodeAt(0).toString(2).padStart(8,'0')).join(' ');
            return ok(res, { result, type: 'text', action });
        } else {
            const n = parseInt(input.replace(/\s/g,''), 2);
            if (isNaN(n)) return fail(res, 'Invalid binary input', 400);
            const asNum = n.toString(10);
            const asText = input.trim().split(/\s+/).map(b => String.fromCharCode(parseInt(b,2))).join('');
            return ok(res, { result_number: asNum, result_text: asText, action });
        }
    } catch(e) { return fail(res, e.message); }
});

// ══════════════════════════════════════════════════════════
// ── MOVIES (xcasper movie API proxy) ──────────────────────
// ══════════════════════════════════════════════════════════
const MOVIE_API = 'https://movieapi.xcasper.space';
const MOVIE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://movieapi.xcasper.space/',
    'Origin': 'https://movieapi.xcasper.space',
    'Accept': 'application/json'
};
async function movieFetch(path) {
    return apiFetch(`${MOVIE_API}${path}`, 20000, MOVIE_HEADERS);
}

app.get('/api/movies/search', async (req, res) => {
    const q = req.query.q || req.query.keyword;
    if (!q) return fail(res, 'Parameter q (movie title) is required', 400);
    const page = req.query.page || '1';
    const perPage = req.query.perPage || '12';
    const type = req.query.type || ''; // 1=movie, 2=tv
    let url = `/api/search?keyword=${encodeURIComponent(q)}&page=${page}&perPage=${perPage}`;
    if (type) url += `&subjectType=${type}`;
    try { return ok(res, await movieFetch(url)); }
    catch(e) { return fail(res, e.message); }
});

app.get('/api/movies/trending', async (req, res) => {
    const page = req.query.page || '0';
    const perPage = req.query.perPage || '18';
    try { return ok(res, await movieFetch(`/api/trending?page=${page}&perPage=${perPage}`)); }
    catch(e) { return fail(res, e.message); }
});

app.get('/api/movies/hot', async (req, res) => {
    try { return ok(res, await movieFetch('/api/hot')); }
    catch(e) { return fail(res, e.message); }
});

app.get('/api/movies/ranking', async (req, res) => {
    try { return ok(res, await movieFetch('/api/ranking')); }
    catch(e) { return fail(res, e.message); }
});

app.get('/api/movies/popular-search', async (req, res) => {
    try { return ok(res, await movieFetch('/api/popular-search')); }
    catch(e) { return fail(res, e.message); }
});

app.get('/api/movies/homepage', async (req, res) => {
    try { return ok(res, await movieFetch('/api/homepage')); }
    catch(e) { return fail(res, e.message); }
});

app.get('/api/movies/suggest', async (req, res) => {
    const q = req.query.q || req.query.keyword;
    if (!q) return fail(res, 'Parameter q (keyword) is required', 400);
    try { return ok(res, await movieFetch(`/api/search/suggest?keyword=${encodeURIComponent(q)}`)); }
    catch(e) { return fail(res, e.message); }
});

app.get('/api/movies/browse', async (req, res) => {
    const type = req.query.type || '1'; // 1=movie, 2=tv
    const genre = req.query.genre || '';
    const country = req.query.country || '';
    const page = req.query.page || '1';
    let url = `/api/browse?subjectType=${type}&page=${page}&perPage=12`;
    if (genre) url += `&genre=${encodeURIComponent(genre)}`;
    if (country) url += `&countryName=${encodeURIComponent(country)}`;
    try { return ok(res, await movieFetch(url)); }
    catch(e) { return fail(res, e.message); }
});

app.get('/api/movies/detail', async (req, res) => {
    const id = req.query.id || req.query.subjectId;
    if (!id) return fail(res, 'Parameter id (subjectId) is required', 400);
    try { return ok(res, await movieFetch(`/api/detail?subjectId=${id}`)); }
    catch(e) { return fail(res, e.message); }
});

app.get('/api/movies/rich-detail', async (req, res) => {
    const id = req.query.id || req.query.subjectId;
    if (!id) return fail(res, 'Parameter id (subjectId) is required', 400);
    try { return ok(res, await movieFetch(`/api/rich-detail?subjectId=${id}`)); }
    catch(e) { return fail(res, e.message); }
});

app.get('/api/movies/recommend', async (req, res) => {
    const id = req.query.id || req.query.subjectId;
    if (!id) return fail(res, 'Parameter id (subjectId) is required', 400);
    const page = req.query.page || '1';
    try { return ok(res, await movieFetch(`/api/recommend?subjectId=${id}&page=${page}&perPage=10`)); }
    catch(e) { return fail(res, e.message); }
});

app.get('/api/movies/play', async (req, res) => {
    const id = req.query.id || req.query.subjectId;
    if (!id) return fail(res, 'Parameter id (subjectId) is required', 400);
    try { return ok(res, await movieFetch(`/api/play?subjectId=${id}`)); }
    catch(e) { return fail(res, e.message); }
});

app.get('/api/movies/stream', async (req, res) => {
    const id = req.query.id || req.query.subjectId;
    const streamId = req.query.streamId;
    if (!id) return fail(res, 'Parameter id (subjectId) is required', 400);
    let url = `/api/bff/stream?subjectId=${id}`;
    if (streamId) url += `&streamId=${streamId}`;
    try { return ok(res, await movieFetch(url)); }
    catch(e) { return fail(res, e.message); }
});

app.get('/api/movies/captions', async (req, res) => {
    const id = req.query.id || req.query.subjectId;
    const streamId = req.query.streamId;
    if (!id || !streamId) return fail(res, 'Parameters id and streamId are required', 400);
    try { return ok(res, await movieFetch(`/api/captions?subjectId=${id}&streamId=${streamId}`)); }
    catch(e) { return fail(res, e.message); }
});

// ── ShowBox ──────────────────────────────────────────────
app.get('/api/movies/showbox/search', async (req, res) => {
    const q = req.query.q || req.query.keyword;
    if (!q) return fail(res, 'Parameter q (keyword) is required', 400);
    const type = req.query.type || 'movie'; // movie or tv
    const limit = req.query.limit || '10';
    try { return ok(res, await movieFetch(`/api/showbox/search?keyword=${encodeURIComponent(q)}&type=${type}&pagelimit=${limit}`)); }
    catch(e) { return fail(res, e.message); }
});

app.get('/api/movies/showbox/movie', async (req, res) => {
    const id = req.query.id;
    if (!id) return fail(res, 'Parameter id is required', 400);
    try { return ok(res, await movieFetch(`/api/showbox/movie?id=${id}`)); }
    catch(e) { return fail(res, e.message); }
});

app.get('/api/movies/showbox/tv', async (req, res) => {
    const id = req.query.id;
    if (!id) return fail(res, 'Parameter id is required', 400);
    try { return ok(res, await movieFetch(`/api/showbox/tv?id=${id}`)); }
    catch(e) { return fail(res, e.message); }
});

app.get('/api/movies/showbox/streams', async (req, res) => {
    const id = req.query.id;
    if (!id) return fail(res, 'Parameter id is required', 400);
    try { return ok(res, await movieFetch(`/api/showbox/streams?id=${id}`)); }
    catch(e) { return fail(res, e.message); }
});

// ── NewToxic ─────────────────────────────────────────────
app.get('/api/movies/newtoxic/search', async (req, res) => {
    const q = req.query.q || req.query.keyword;
    if (!q) return fail(res, 'Parameter q (keyword) is required', 400);
    try { return ok(res, await movieFetch(`/api/newtoxic/search?keyword=${encodeURIComponent(q)}`)); }
    catch(e) { return fail(res, e.message); }
});

app.get('/api/movies/newtoxic/latest', async (req, res) => {
    const page = req.query.page || '1';
    try { return ok(res, await movieFetch(`/api/newtoxic/latest?page=${page}`)); }
    catch(e) { return fail(res, e.message); }
});

app.get('/api/movies/newtoxic/featured', async (req, res) => {
    try { return ok(res, await movieFetch('/api/newtoxic/featured')); }
    catch(e) { return fail(res, e.message); }
});

app.get('/api/movies/newtoxic/detail', async (req, res) => {
    const path = req.query.path;
    if (!path) return fail(res, 'Parameter path is required', 400);
    try { return ok(res, await movieFetch(`/api/newtoxic/detail?path=${encodeURIComponent(path)}`)); }
    catch(e) { return fail(res, e.message); }
});

app.get('/api/movies/newtoxic/resolve', async (req, res) => {
    const fid = req.query.fid;
    if (!fid) return fail(res, 'Parameter fid is required', 400);
    try { return ok(res, await movieFetch(`/api/newtoxic/resolve?fid=${fid}`)); }
    catch(e) { return fail(res, e.message); }
});

// ── Staff ─────────────────────────────────────────────────
app.get('/api/movies/staff', async (req, res) => {
    const id = req.query.id || req.query.staffId;
    if (!id) return fail(res, 'Parameter id (staffId) is required', 400);
    try { return ok(res, await movieFetch(`/api/staff/detail?staffId=${id}`)); }
    catch(e) { return fail(res, e.message); }
});

app.get('/api/movies/staff/works', async (req, res) => {
    const id = req.query.id || req.query.staffId;
    if (!id) return fail(res, 'Parameter id (staffId) is required', 400);
    const page = req.query.page || '1';
    try { return ok(res, await movieFetch(`/api/staff/works?staffId=${id}&page=${page}&perPage=10`)); }
    catch(e) { return fail(res, e.message); }
});

// ── Trailer ───────────────────────────────────────────────
// Extracts trailer URL + cover from rich-detail and returns clean trailer object
app.get('/api/movies/trailer', async (req, res) => {
    const id = req.query.id || req.query.subjectId;
    if (!id) return fail(res, 'Parameter id (subjectId) is required', 400);
    try {
        const d = await movieFetch(`/api/rich-detail?subjectId=${id}`);
        const movie = (d && d.data) ? d.data : d;
        const trailerUrl = movie.trailerUrl || movie.trailer || null;
        const trailerCover = movie.trailerCover || movie.cover?.url || null;
        const ytCode = trailerUrl
            ? (trailerUrl.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1] || null)
            : null;
        return ok(res, {
            subjectId: movie.subjectId || id,
            title: movie.title || null,
            trailerUrl,
            trailerCover,
            youtubeId: ytCode,
            youtubeEmbed: ytCode ? `https://www.youtube.com/embed/${ytCode}` : null,
            youtubeWatch: ytCode ? `https://www.youtube.com/watch?v=${ytCode}` : null,
        });
    }
    catch(e) { return fail(res, e.message); }
});

// ── Live (live-streaming / broadcast movies) ──────────────
app.get('/api/movies/live', async (req, res) => {
    try { return ok(res, await movieFetch('/api/live')); }
    catch(e) { return fail(res, e.message); }
});

// ── NewToxic file listing ─────────────────────────────────
app.get('/api/movies/newtoxic/files', async (req, res) => {
    const path = req.query.path;
    if (!path) return fail(res, 'Parameter path is required (e.g. new/1/23390/Season-1/)', 400);
    try { return ok(res, await movieFetch(`/api/newtoxic/files?path=${encodeURIComponent(path)}`)); }
    catch(e) { return fail(res, e.message); }
});

// ══════════════════════════════════════════════════════════
// ── OWN MOVIE ENDPOINTS (YTS — no key, always available) ──
// ══════════════════════════════════════════════════════════
const YTS = 'https://yts.mx/api/v2';

// Helper — map YTS movie object to clean format
function ytsMovie(m) {
    return {
        id: m.id,
        title: m.title,
        year: m.year,
        rating: m.rating,
        runtime: m.runtime,
        genres: m.genres,
        summary: m.summary,
        language: m.language,
        mpa_rating: m.mpa_rating,
        large_cover: m.large_cover_image,
        medium_cover: m.medium_cover_image,
        slug: m.slug,
        imdb_code: m.imdb_code,
        yt_trailer: m.yt_trailer_code ? `https://www.youtube.com/watch?v=${m.yt_trailer_code}` : null,
        torrents: (m.torrents || []).map(t => ({
            url: t.url, quality: t.quality, type: t.type,
            size: t.size, seeds: t.seeds, peers: t.peers
        })),
        cast: (m.cast || []).slice(0, 5).map(c => ({ name: c.name, character: c.character_name, imdb: c.imdb_code })),
        background: m.background_image_original,
    };
}

app.get('/api/stream/search', async (req, res) => {
    const q = req.query.q || req.query.query;
    if (!q) return fail(res, 'Parameter q (movie title) is required', 400);
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const genre = req.query.genre || '';
    const rating = parseFloat(req.query.rating) || 0;
    const sort = req.query.sort || 'relevance'; // date_added, seeds, peers, rating, like_count, title, year
    try {
        let url = `${YTS}/list_movies.json?query_term=${encodeURIComponent(q)}&page=${page}&limit=${limit}&sort_by=${sort}`;
        if (genre) url += `&genre=${encodeURIComponent(genre)}`;
        if (rating > 0) url += `&minimum_rating=${rating}`;
        const d = await apiFetch(url);
        const movies = (d.data?.movies || []).map(ytsMovie);
        return ok(res, { total: d.data?.movie_count || 0, page, limit, movies });
    } catch(e) { return fail(res, e.message); }
});

app.get('/api/stream/trending', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    try {
        const d = await apiFetch(`${YTS}/list_movies.json?sort_by=seeds&limit=${limit}&page=${page}&minimum_rating=6`);
        return ok(res, { total: d.data?.movie_count || 0, page, limit, movies: (d.data?.movies || []).map(ytsMovie) });
    } catch(e) { return fail(res, e.message); }
});

app.get('/api/stream/latest', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    try {
        const d = await apiFetch(`${YTS}/list_movies.json?sort_by=date_added&limit=${limit}&page=${page}`);
        return ok(res, { total: d.data?.movie_count || 0, page, limit, movies: (d.data?.movies || []).map(ytsMovie) });
    } catch(e) { return fail(res, e.message); }
});

app.get('/api/stream/top-rated', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    try {
        const d = await apiFetch(`${YTS}/list_movies.json?sort_by=rating&limit=${limit}&page=${page}&minimum_rating=7`);
        return ok(res, { total: d.data?.movie_count || 0, page, limit, movies: (d.data?.movies || []).map(ytsMovie) });
    } catch(e) { return fail(res, e.message); }
});

app.get('/api/stream/by-genre', async (req, res) => {
    const genre = req.query.genre;
    if (!genre) return fail(res, 'Parameter genre is required (e.g. Action, Comedy, Horror, Drama)', 400);
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || 'rating';
    try {
        const d = await apiFetch(`${YTS}/list_movies.json?genre=${encodeURIComponent(genre)}&sort_by=${sort}&limit=20&page=${page}&minimum_rating=5`);
        return ok(res, { genre, total: d.data?.movie_count || 0, page, movies: (d.data?.movies || []).map(ytsMovie) });
    } catch(e) { return fail(res, e.message); }
});

app.get('/api/stream/detail', async (req, res) => {
    const id = parseInt(req.query.id);
    if (!id) return fail(res, 'Parameter id (YTS movie id) is required', 400);
    try {
        const d = await apiFetch(`${YTS}/movie_details.json?movie_id=${id}&with_images=true&with_cast=true`);
        if (!d.data?.movie) return fail(res, 'Movie not found');
        return ok(res, { movie: ytsMovie(d.data.movie) });
    } catch(e) { return fail(res, e.message); }
});

app.get('/api/stream/similar', async (req, res) => {
    const id = parseInt(req.query.id);
    if (!id) return fail(res, 'Parameter id (YTS movie id) is required', 400);
    try {
        const d = await apiFetch(`${YTS}/movie_suggestions.json?movie_id=${id}`);
        return ok(res, { movies: (d.data?.movies || []).map(ytsMovie) });
    } catch(e) { return fail(res, e.message); }
});

// ── 404 / SPA ──
app.use('/api/*', (_q, r) => r.status(404).json({ success: false, creator: CREATOR, error: 'Endpoint not found.' }));
app.get('*', (_q, r) => r.sendFile(join(__dirname, '..', 'public', 'index.html')));

app.listen(PORT, () => console.log(`Foxy Tech API v${VERSION} on port ${PORT} — ${Object.keys(app._router.stack.filter(l=>l.route)).length || '50+'} endpoints`));
