// backend/server.js

import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── ESM __dirname Shim ───────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── App & Middleware ──────────────────────────────────
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(session({
  secret: 'your‑very‑strong‑secret‑here',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, sameSite: 'lax' }
}));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Paths ─────────────────────────────────────────────
const DATA_DIR            = path.join(__dirname, '..', 'data');
const USERS_FILE          = path.join(DATA_DIR, 'users.json');
const PREFS_FILE          = path.join(DATA_DIR, 'user_preferences.json');
const ALLERGENS_FILE      = path.join(DATA_DIR, 'food_allergens_curated.json');
const USER_ALLERGENS_FILE = path.join(DATA_DIR, 'user_allergens.json');

// ── Helpers ───────────────────────────────────────────
function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  console.log(`WROTE ${file}:`, data);
}

// ── Auth Middleware ───────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session.user) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ── Authentication Endpoints ──────────────────────────
app.post('/api/auth/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email & password required.' });
  }
  const users = readJSON(USERS_FILE) || [];
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already used.' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const user = { id: Date.now(), name, email, hash };
  users.push(user);
  writeJSON(USERS_FILE, users);

  // seed preferences
  const prefsMap = readJSON(PREFS_FILE) || {};
  prefsMap[user.id] = {
    notifications:     true,
    vibration:         true,
    scanNotifications: true,
    scanHistory:       '30 Days',
    camera:            true,
    location:          true,
    name, email,
    allergens:         []
  };
  writeJSON(PREFS_FILE, prefsMap);

  res.json({ success: true });
});

app.post('/api/auth/signin', (req, res) => {
  const { email, password } = req.body;
  const users = readJSON(USERS_FILE) || [];
  const user = users.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.hash)) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  req.session.user = { id: user.id, name: user.name, email: user.email };
  res.json({ success: true });
});

app.post('/api/auth/signout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Logout failed.' });
    res.json({ success: true });
  });
});

app.get('/api/auth/status', (req, res) => {
  res.json({ authenticated: !!req.session.user, user: req.session.user || null });
});

// ── Preferences Endpoints ─────────────────────────────
app.get('/api/user-preferences', requireAuth, (req, res) => {
  const prefsMap = readJSON(PREFS_FILE) || {};
  const prefs = prefsMap[req.session.user.id] || {};
  res.json(prefs);
});

app.post('/api/user-preferences', requireAuth, (req, res) => {
  const { key, value } = req.body;
  const prefsMap = readJSON(PREFS_FILE) || {};
  const prefs = prefsMap[req.session.user.id] || {};
  prefs[key] = value;
  prefsMap[req.session.user.id] = prefs;
  writeJSON(PREFS_FILE, prefsMap);
  res.json(prefs);
});

// ── Master Allergen List ──────────────────────────────
app.get('/api/allergens', requireAuth, (req, res) => {
  const data = readJSON(ALLERGENS_FILE);
  if (!data) return res.status(500).json({ error: 'Allergen DB missing.' });
  res.json(data.map(item => item.name));
});

// ── User Allergens Endpoints ──────────────────────────
// GET
app.get('/api/user-allergens', requireAuth, (req, res) => {
  const map = readJSON(USER_ALLERGENS_FILE) || {};
  const arr = map[req.session.user.id] || [];
  res.json(arr);
});

// POST (add)
app.post('/api/user-allergens', requireAuth, (req, res) => {
  const { allergen } = req.body;
  const userId = req.session.user.id;

  // Update user_allergens.json
  const map = readJSON(USER_ALLERGENS_FILE) || {};
  const arr = map[userId] || [];
  if (!arr.includes(allergen)) {
    arr.push(allergen);
    map[userId] = arr;
    writeJSON(USER_ALLERGENS_FILE, map);
  }

  // Sync into preferences
  const prefsMap = readJSON(PREFS_FILE) || {};
  const prefs = prefsMap[userId] || {};
  prefs.allergens = prefs.allergens || [];
  if (!prefs.allergens.includes(allergen)) {
    prefs.allergens.push(allergen);
    prefsMap[userId] = prefs;
    writeJSON(PREFS_FILE, prefsMap);
  }

  res.json({ success: true, list: arr });
});

// DELETE (remove)
app.delete('/api/user-allergens', requireAuth, (req, res) => {
  const { allergen } = req.body;
  const userId = req.session.user.id;

  // Update user_allergens.json
  const map = readJSON(USER_ALLERGENS_FILE) || {};
  let arr = map[userId] || [];
  arr = arr.filter(a => a !== allergen);
  map[userId] = arr;
  writeJSON(USER_ALLERGENS_FILE, map);

  // Sync into preferences
  const prefsMap = readJSON(PREFS_FILE) || {};
  const prefs = prefsMap[userId] || {};
  prefs.allergens = (prefs.allergens || []).filter(a => a !== allergen);
  prefsMap[userId] = prefs;
  writeJSON(PREFS_FILE, prefsMap);

  res.json({ success: true, list: arr });
});

// ── Start Server ───────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
