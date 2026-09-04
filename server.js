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
}).fields([
  { name: 'photo', maxCount: 1 },
  { name: 'companyLogo', maxCount: 1 }
]);

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
app.post('/api/profiles', upload, async (req, res) => {
  try {
    const content = (req.body.content || '').replace(/\r\n/g, '\n');
    if (!content.trim()) {
      return res.status(400).json({ error: 'Employee content/text is required.' });
    }

    const id = generateUniqueId();
    let photoUrl = '/assets/default-avatar.svg';
    let companyLogoUrl = '/assets/isdd-logo-dark.jpg';

    const photoFile = req.files && req.files['photo'] ? req.files['photo'][0] : null;
    const companyLogoFile = req.files && req.files['companyLogo'] ? req.files['companyLogo'][0] : null;

    // 1. Upload Employee Photo
    if (photoFile) {
      if (supabase) {
        try {
          const ext = path.extname(photoFile.originalname) || '.jpg';
          const fileName = `photo-${id}-${Date.now()}${ext}`;
          
          const { error: uploadError } = await supabase.storage
            .from('employee-photos')
            .upload(fileName, photoFile.buffer, {
              contentType: photoFile.mimetype || 'image/jpeg',
              upsert: true
            });

          if (uploadError) {
            console.warn('Supabase photo upload warning:', uploadError.message);
            photoUrl = `data:${photoFile.mimetype};base64,${photoFile.buffer.toString('base64')}`;
          } else {
            const { data: publicUrlData } = supabase.storage
              .from('employee-photos')
              .getPublicUrl(fileName);
            photoUrl = publicUrlData.publicUrl;
          }
        } catch (e) {
          console.error('Supabase Storage Exception (photo):', e);
          photoUrl = `data:${photoFile.mimetype};base64,${photoFile.buffer.toString('base64')}`;
        }
      } else {
        const mimeType = photoFile.mimetype || 'image/jpeg';
        photoUrl = `data:${mimeType};base64,${photoFile.buffer.toString('base64')}`;
      }
    } else if (req.body.photoBase64) {
      photoUrl = req.body.photoBase64;
    }

    // 2. Upload Company Logo (if uploaded)
    if (companyLogoFile) {
      if (supabase) {
        try {
          const ext = path.extname(companyLogoFile.originalname) || '.png';
          const fileName = `logo-${id}-${Date.now()}${ext}`;
          
          const { error: logoUploadError } = await supabase.storage
            .from('employee-photos')
            .upload(fileName, companyLogoFile.buffer, {
              contentType: companyLogoFile.mimetype || 'image/png',
              upsert: true
            });

          if (logoUploadError) {
            console.warn('Supabase logo upload warning:', logoUploadError.message);
            companyLogoUrl = `data:${companyLogoFile.mimetype};base64,${companyLogoFile.buffer.toString('base64')}`;
          } else {
            const { data: publicUrlData } = supabase.storage
              .from('employee-photos')
              .getPublicUrl(fileName);
            companyLogoUrl = publicUrlData.publicUrl;
          }
        } catch (e) {
          console.error('Supabase Storage Exception (company logo):', e);
          companyLogoUrl = `data:${companyLogoFile.mimetype};base64,${companyLogoFile.buffer.toString('base64')}`;
        }
      } else {
        const mimeType = companyLogoFile.mimetype || 'image/png';
        companyLogoUrl = `data:${mimeType};base64,${companyLogoFile.buffer.toString('base64')}`;
      }
    } else if (req.body.companyLogoBase64) {
      companyLogoUrl = req.body.companyLogoBase64;
    }

    const newProfile = {
      id,
      photoUrl,
      companyLogoUrl,
      content,
      createdAt: new Date().toISOString()
    };

    // 3. Save Profile
    if (supabase) {
      const { error: dbError } = await supabase
        .from('employee_profiles')
        .insert([{
          id,
          photo_url: photoUrl,
          company_logo_url: companyLogoUrl,
          content,
          created_at: newProfile.createdAt
        }]);

      if (dbError) {
        console.error('Supabase DB Insert Error:', dbError.message);
        // Fallback save in memory
        memoryProfiles[id] = newProfile;
      }
    } else {
      memoryProfiles[id] = newProfile;
      try {
        fs.writeFileSync(PROFILES_FILE, JSON.stringify(memoryProfiles, null, 2), 'utf8');
      } catch (e) {}
    }

    const hostHeader = req.get('host') || `${getLocalNetworkIp()}:${PORT}`;
    const protocol = req.headers['x-forwarded-proto'] || (IS_VERCEL ? 'https' : req.protocol || 'http');
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
          companyLogoUrl: data.company_logo_url || '/assets/isdd-logo-dark.jpg',
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

  if (!profile.companyLogoUrl) {
    profile.companyLogoUrl = '/assets/isdd-logo-dark.jpg';
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
  function startServer(targetPort) {
    const server = app.listen(targetPort, '0.0.0.0', () => {
      const localIp = getLocalNetworkIp();
      console.log(`====================================================`);
      console.log(`Employee Profile Link Generator running at:`);
      console.log(`Local:   http://localhost:${targetPort}`);
      console.log(`Network: http://${localIp}:${targetPort}`);
      console.log(`Supabase Integration: ${supabase ? 'ACTIVE ⚡' : 'INACTIVE (Set keys in .env)'}`);
      console.log(`====================================================`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        const nextPort = Number(targetPort) + 1;
        console.log(`⚠️ Port ${targetPort} in use, trying port ${nextPort}...`);
        startServer(nextPort);
      } else {
        console.error('Server error:', err);
      }
    });
  }

  startServer(PORT);
}

module.exports = app;
