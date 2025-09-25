// api/upload.js  (Vercel serverless function)
import crypto from 'crypto';
import fetch from 'node-fetch';
import FormData from 'form-data';

const CLOUD = process.env.CLOUD_NAME;
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;
const FOLDER = 'zapier-buffer';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { videoUrl } = req.body || {};
    if (!videoUrl) return res.status(400).json({ error: 'missing videoUrl' });

    const timestamp = Math.floor(Date.now() / 1000);

    // sign (sorted params): folder + timestamp (we exclude upload_preset to keep simple)
    const parts = [`folder=${FOLDER}`, `timestamp=${timestamp}`];
    parts.sort();
    const toSign = parts.join('&') + API_SECRET;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');

    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD}/auto/upload`;

    const form = new FormData();
    form.append('file', videoUrl);
    form.append('timestamp', String(timestamp));
    form.append('api_key', API_KEY);
    form.append('signature', signature);
    form.append('folder', FOLDER);

    const r = await fetch(endpoint, { method: 'POST', body: form });
    const j = await r.json();

    if (!r.ok) return res.status(r.status).json({ ok: false, status: r.status, body: j });

    // return Cloudinary response (no eager processing here)
    return res.json({ ok: true, raw: j, public_id: j.public_id, secure_url: j.secure_url || j.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
