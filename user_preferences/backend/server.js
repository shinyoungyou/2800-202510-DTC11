// backend/server.js

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

// Increase payload size limits to allow Base64 images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve your static front‑end
app.use(express.static(path.join(__dirname, '..', 'public')));

// Data file paths
const DATA_DIR              = path.join(__dirname, '..', 'data');
const ALLERGEN_FILE         = path.join(DATA_DIR, 'food_allergens_curated.json');
const USER_ALLERGENS_FILE   = path.join(DATA_DIR, 'user_allergens.json');
const USER_PREFERENCES_FILE = path.join(DATA_DIR, 'user_preferences.json');

// ── Allergens Endpoints ──────────────────────────

// GET master list of allergens
app.get('/api/allergens', (req, res) => {
  fs.readFile(ALLERGEN_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Cannot read allergen database.' });
    let list;
    try { list = JSON.parse(data).map(item => item.name); }
    catch { return res.status(500).json({ error: 'Allergen database is corrupt.' }); }
    res.json(list);
  });
});

// GET the user’s saved allergens
app.get('/api/user-allergens', (req, res) => {
  fs.readFile(USER_ALLERGENS_FILE, 'utf8', (err, data) => {
    if (err && err.code === 'ENOENT') return res.json([]);
    if (err) return res.status(500).json({ error: 'Cannot read user allergens.' });
    let arr;
    try { arr = JSON.parse(data); } catch { arr = []; }
    res.json(arr);
  });
});

// POST a new allergen for the user
app.post('/api/user-allergens', (req, res) => {
  const { allergen } = req.body;
  if (!allergen) return res.status(400).json({ error: 'No allergen provided.' });

  fs.readFile(USER_ALLERGENS_FILE, 'utf8', (err, data) => {
    let arr = [];
    if (!err) {
      try { arr = JSON.parse(data); } catch {}
    }
    if (!arr.includes(allergen)) arr.push(allergen);
    fs.writeFile(USER_ALLERGENS_FILE, JSON.stringify(arr, null, 2), err2 => {
      if (err2) return res.status(500).json({ error: 'Cannot save user allergens.' });
      res.json({ success: true, list: arr });
    });
  });
});

// ── Preferences Endpoints ────────────────────────

// GET current user preferences
app.get('/api/user-preferences', (req, res) => {
  fs.readFile(USER_PREFERENCES_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Cannot read preferences.' });
    let prefs;
    try { prefs = JSON.parse(data); }
    catch { return res.status(500).json({ error: 'Preferences file is corrupt.' }); }
    res.json(prefs);
  });
});

// POST a single preference update
app.post('/api/user-preferences', (req, res) => {
  const { key, value } = req.body;
  if (typeof key !== 'string') return res.status(400).json({ error: 'Invalid preference key.' });

  fs.readFile(USER_PREFERENCES_FILE, 'utf8', (err, data) => {
    let prefs = {};
    if (!err) {
      try { prefs = JSON.parse(data); } catch {}
    }
    prefs[key] = value;
    fs.writeFile(USER_PREFERENCES_FILE, JSON.stringify(prefs, null, 2), err2 => {
      if (err2) return res.status(500).json({ error: 'Cannot save preferences.' });
      res.json(prefs);
    });
  });
});

// ── Start Server ─────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
