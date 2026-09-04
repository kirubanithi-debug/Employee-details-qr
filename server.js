const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure directories exist
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(PROFILES_FILE)) {
  fs.writeFileSync(PROFILES_FILE, JSON.stringify({}), 'utf8');
}

// Helper: Helper function to get host local IP address
function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Generate unique 6-character short code (e.g., 8F72KQ)
function generateUniqueId() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude visually ambiguous chars like 0, O, I, 1
  let profiles = {};
  try {
    const raw = fs.readFileSync(PROFILES_FILE, 'utf8');
    profiles = JSON.parse(raw);
  } catch (err) {
    profiles = {};
  }

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

// Read profiles from JSON file
function getProfiles() {
  try {
    const raw = fs.readFileSync(PROFILES_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

// Save profiles to JSON file
function saveProfiles(profiles) {
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2), 'utf8');
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'photo-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
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

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// API Endpoint to get server host network info
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

// API Endpoint to create employee profile
app.post('/api/profiles', upload.single('photo'), (req, res) => {
  try {
    const content = (req.body.content || '').replace(/\r\n/g, '\n');
    if (!content.trim()) {
      return res.status(400).json({ error: 'Employee content/text is required.' });
    }

    let photoUrl = '/assets/default-avatar.svg';
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.photoBase64) {
      // Handle base64 fallback if provided
      const base64Data = req.body.photoBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `photo-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
      const filepath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filepath, buffer);
      photoUrl = `/uploads/${filename}`;
    }

    const id = generateUniqueId();
    const profiles = getProfiles();

    const newProfile = {
      id,
      photoUrl,
      content, // exact text as entered
      createdAt: new Date().toISOString()
    };

    profiles[id] = newProfile;
    saveProfiles(profiles);

    // Compute shareable link
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
    res.status(500).json({ error: 'Failed to create employee profile.' });
  }
});

// API Endpoint to fetch profile data by ID
app.get('/api/profiles/:id', (req, res) => {
  const id = req.params.id.toUpperCase();
  const profiles = getProfiles();
  const profile = profiles[id];

  if (!profile) {
    return res.status(404).json({ error: 'Employee profile not found.' });
  }

  res.json(profile);
});

// Route for shareable link: /e/:id
app.get('/e/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// Fallback to index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalNetworkIp();
  console.log(`====================================================`);
  console.log(`Employee Profile Link Generator running at:`);
  console.log(`Local:   http://localhost:${PORT}`);
  console.log(`Network: http://${localIp}:${PORT} (Use this link for mobile devices)`);
  console.log(`====================================================`);
});
