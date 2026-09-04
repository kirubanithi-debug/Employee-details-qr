require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase Client if credentials are provided
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.startsWith('http')) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('⚡ Supabase database & storage client initialized!');
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err.message);
  }
} else {
  console.log('ℹ️ Supabase keys not set. Running in Local Memory / JSON mode.');
}

// Local Storage Fallbacks for Dev/Offline Mode
const IS_VERCEL = !!process.env.VERCEL;
const BASE_DIR = IS_VERCEL ? os.tmpdir() : __dirname;
const DATA_DIR = path.join(BASE_DIR, 'data');
const UPLOADS_DIR = path.join(BASE_DIR, 'uploads');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');

let memoryProfiles = {};

function initStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    if (!fs.existsSync(PROFILES_FILE)) fs.writeFileSync(PROFILES_FILE, JSON.stringify({}), 'utf8');
  } catch (e) {}
}
initStorage();

function getLocalNetworkIp() {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name]) {
        if (net.family === 'IPv4' && !net.internal) return net.address;
      }
    }
  } catch (e) {}
  return 'localhost';
}

function generateUniqueId() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Multer memory storage (Ideal for Supabase & Serverless)
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
app.use(express.static(path.join(__dirname, 'public')));

if (fs.existsSync(UPLOADS_DIR)) {
  app.use('/uploads', express.static(UPLOADS_DIR));
}

// API Endpoint: Network Info
app.get('/api/network-info', (req, res) => {
  const hostIp = getLocalNetworkIp();
  const hostHeader = req.get('host') || `${hostIp}:${PORT}`;
  const protocol = req.protocol || 'http';
  res.json({
    hostIp,
    port: PORT,
    baseUrl: `${protocol}://${hostHeader}`,
    supabaseActive: !!supabase
  });
});

// API Endpoint: Create Profile
app.post('/api/profiles', upload.single('photo'), async (req, res) => {
  try {
    const content = (req.body.content || '').replace(/\r\n/g, '\n');
    if (!content.trim()) {
      return res.status(400).json({ error: 'Employee content/text is required.' });
    }

    const id = generateUniqueId();
    let photoUrl = '/assets/default-avatar.svg';

    // 1. Upload Photo (Supabase Bucket vs Memory/Base64 Fallback)
    if (req.file) {
      if (supabase) {
        try {
          const ext = path.extname(req.file.originalname) || '.jpg';
          const fileName = `${id}-${Date.now()}${ext}`;
          
          const { error: uploadError } = await supabase.storage
            .from('employee-photos')
            .upload(fileName, req.file.buffer, {
              contentType: req.file.mimetype || 'image/jpeg',
              upsert: true
            });

          if (uploadError) {
            console.warn('Supabase photo upload warning:', uploadError.message);
            // Fallback to Base64
            photoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
          } else {
            const { data: publicUrlData } = supabase.storage
              .from('employee-photos')
              .getPublicUrl(fileName);
            photoUrl = publicUrlData.publicUrl;
          }
        } catch (e) {
          console.error('Supabase Storage Exception:', e);
          photoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }
      } else {
        // Base64 Fallback for local/serverless
        const mimeType = req.file.mimetype || 'image/jpeg';
        photoUrl = `data:${mimeType};base64,${req.file.buffer.toString('base64')}`;
      }
    } else if (req.body.photoBase64) {
      photoUrl = req.body.photoBase64;
    }

    const newProfile = {
      id,
      photoUrl,
      content,
      createdAt: new Date().toISOString()
    };

    // 2. Save Profile (Supabase Database vs Local Memory Fallback)
    if (supabase) {
      const { error: dbError } = await supabase
        .from('employee_profiles')
        .insert([{
          id,
          photo_url: photoUrl,
          content,
          created_at: newProfile.createdAt
        }]);

      if (dbError) {
        console.error('Supabase DB Insert Error:', dbError.message);
        // Save to memory as backup
        memoryProfiles[id] = newProfile;
      }
    } else {
      memoryProfiles[id] = newProfile;
      try {
        fs.writeFileSync(PROFILES_FILE, JSON.stringify(memoryProfiles, null, 2), 'utf8');
      } catch (e) {}
    }

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

// API Endpoint: Fetch Profile by ID
app.get('/api/profiles/:id', async (req, res) => {
  const id = req.params.id.toUpperCase();

  // Try fetching from Supabase first
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (data && !error) {
        return res.json({
          id: data.id,
          photoUrl: data.photo_url || '/assets/default-avatar.svg',
          content: data.content,
          createdAt: data.created_at
        });
      }
    } catch (e) {
      console.warn('Supabase fetch exception:', e.message);
    }
  }

  // Fallback to local memory / file profiles
  let profile = memoryProfiles[id];
  if (!profile) {
    try {
      if (fs.existsSync(PROFILES_FILE)) {
        const raw = fs.readFileSync(PROFILES_FILE, 'utf8');
        const profiles = JSON.parse(raw);
        profile = profiles[id];
      }
    } catch (e) {}
  }

  if (!profile) {
    return res.status(404).json({ error: 'Employee profile not found.' });
  }

  res.json(profile);
});

// Route for Profile View page
app.get('/e/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// Root fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Local Dev Listener
if (require.main === module && !IS_VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalNetworkIp();
    console.log(`====================================================`);
    console.log(`Employee Profile Link Generator running at:`);
    console.log(`Local:   http://localhost:${PORT}`);
    console.log(`Network: http://${localIp}:${PORT}`);
    console.log(`Supabase Integration: ${supabase ? 'ACTIVE ⚡' : 'INACTIVE (Set keys in .env)'}`);
    console.log(`====================================================`);
  });
}

module.exports = app;
