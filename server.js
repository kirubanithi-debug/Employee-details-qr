const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Determine environment and writeable storage paths
const IS_VERCEL = !!process.env.VERCEL;

// On Vercel serverless, filesystem is read-only except /tmp
const BASE_DIR = IS_VERCEL ? os.tmpdir() : __dirname;
const DATA_DIR = path.join(BASE_DIR, 'data');
const UPLOADS_DIR = path.join(BASE_DIR, 'uploads');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');

// In-memory fallback for Serverless invocations
let memoryProfiles = {};

function initStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    if (!fs.existsSync(PROFILES_FILE)) {
      fs.writeFileSync(PROFILES_FILE, JSON.stringify({}), 'utf8');
    }
  } catch (err) {
    console.warn('Filesystem init warning (using memory storage):', err.message);
  }
}

initStorage();

// Helper to get local IP (for local dev)
function getLocalNetworkIp() {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  } catch (e) {}
  return 'localhost';
}

// Generate unique 6-character short code
function generateUniqueId() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const profiles = getProfiles();
  let code;
  let attempts = 0;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    attempts++;
  } while (profiles[code] && attempts < 1000);
  return code;
}

// Read profiles with fallback to memory
function getProfiles() {
  try {
    if (fs.existsSync(PROFILES_FILE)) {
      const raw = fs.readFileSync(PROFILES_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      return { ...memoryProfiles, ...parsed };
    }
  } catch (e) {}
  return memoryProfiles;
}

// Save profiles safely
function saveProfiles(profiles) {
  memoryProfiles = { ...memoryProfiles, ...profiles };
  try {
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(memoryProfiles, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not write to profiles file:', err.message);
  }
}

// Multer Memory Storage (Best for Serverless & Vercel)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));
if (fs.existsSync(UPLOADS_DIR)) {
  app.use('/uploads', express.static(UPLOADS_DIR));
}

// API Endpoint: Network info
app.get('/api/network-info', (req, res) => {
  const hostIp = getLocalNetworkIp();
  const hostHeader = req.get('host') || `${hostIp}:${PORT}`;
  const protocol = req.protocol || 'http';
  res.json({
    hostIp,
    port: PORT,
    baseUrl: `${protocol}://${hostHeader}`
  });
});

// API Endpoint: Create profile
app.post('/api/profiles', upload.single('photo'), (req, res) => {
  try {
    const content = (req.body.content || '').replace(/\r\n/g, '\n');
    if (!content.trim()) {
      return res.status(400).json({ error: 'Employee content/text is required.' });
    }

    let photoUrl = '/assets/default-avatar.svg';

    if (req.file) {
      // Store photo as Base64 Data URI for serverless compatibility
      const mimeType = req.file.mimetype || 'image/jpeg';
      const base64Str = req.file.buffer.toString('base64');
      photoUrl = `data:${mimeType};base64,${base64Str}`;

      // Optionally save to disk if writable
      try {
        const ext = path.extname(req.file.originalname) || '.jpg';
        const filename = `photo-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        const filepath = path.join(UPLOADS_DIR, filename);
        fs.writeFileSync(filepath, req.file.buffer);
      } catch (e) {
        // Disk write fallback fine (Base64 URL is used)
      }
    } else if (req.body.photoBase64) {
      photoUrl = req.body.photoBase64;
    }

    const id = generateUniqueId();
    const profiles = getProfiles();

    const newProfile = {
      id,
      photoUrl,
      content,
      createdAt: new Date().toISOString()
    };

    profiles[id] = newProfile;
    saveProfiles(profiles);

    const hostHeader = req.get('host') || `${getLocalNetworkIp()}:${PORT}`;
    const protocol = req.protocol || 'http';
    const shareableUrl = `${protocol}://${hostHeader}/e/${id}`;

    res.json({
      success: true,
      id,
      shareableUrl,
      profile: newProfile
    });
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ error: 'Failed to create employee profile: ' + error.message });
  }
});

// API Endpoint: Fetch profile by ID
app.get('/api/profiles/:id', (req, res) => {
  const id = req.params.id.toUpperCase();
  const profiles = getProfiles();
  const profile = profiles[id];

  if (!profile) {
    return res.status(404).json({ error: 'Employee profile not found.' });
  }

  res.json(profile);
});

// Route for profile view page
app.get('/e/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// Root fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server locally if not required as a module (Vercel serverless requirement)
if (require.main === module && !IS_VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalNetworkIp();
    console.log(`====================================================`);
    console.log(`Employee Profile Link Generator running at:`);
    console.log(`Local:   http://localhost:${PORT}`);
    console.log(`Network: http://${localIp}:${PORT}`);
    console.log(`====================================================`);
  });
}

// Export for Vercel Serverless Function
module.exports = app;
