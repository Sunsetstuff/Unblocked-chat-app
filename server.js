const express = require('express');
const path = require('path');
const multer = require('multer');
const app = express();
const port = 5000;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

// Separate storage for profile pictures
const profilePictureStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/profile-pictures/')
  },
  filename: function (req, file, cb) {
    cb(null, 'profile-' + Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ storage: storage });
const uploadProfilePicture = multer({ storage: profilePictureStorage });

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files (HTML, CSS, JS)
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));

// In-memory storage for profiles, videos, friends, and messages
let profiles = [];
let videos = [];
let friendships = []; // Store friend relationships
let messages = []; // Store chat messages

// Handle profile creation
app.post('/addprofile', (req, res) => {
  const { name, email, password } = req.body;

  // Basic validation
  if (!name || !email || !password) {
    return res.send(`
      <h1>Error</h1>
      <p>All fields are required!</p>
      <a href="addprofile.html">Go back</a>
    `);
  }

  // Check if email already exists
  const existingProfile = profiles.find(profile => profile.email === email);
  if (existingProfile) {
    return res.send(`
      <h1>Error</h1>
      <p>Email already exists!</p>
      <a href="addprofile.html">Go back</a>
    `);
  }

  // Add new profile
  const newProfile = { name, email, password };
  profiles.push(newProfile);

  console.log('New profile created:', newProfile);

  // Send success response
  res.send(`
    <h1>Profile Created Successfully!</h1>
    <p>Welcome, ${name}!</p>
    <p>Your profile has been created with email: ${email}</p>
    <a href="home.html">Go to Home</a>
    <a href="login.html">Login</a>
  `);
});

// Handle login
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const profile = profiles.find(p => p.email === email && p.password === password);

  if (profile) {
    res.send(`
      <h1>Login Successful!</h1>
      <p>Welcome back, ${profile.name}!</p>
      <a href="home.html">Go to Home</a>
    `);
  } else {
    res.send(`
      <h1>Login Failed</h1>
      <p>Invalid email or password!</p>
      <a href="login.html">Try again</a>
      <a href="addprofile.html">Create account</a>
    `);
  }
});

// Handle video upload
app.post('/upload-video', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.send(`
      <h1>Error</h1>
      <p>No video file uploaded!</p>
      <a href="videos.html">Go back</a>
    `);
  }

  const { title } = req.body;
  const videoData = {
    id: Date.now(),
    title: title,
    filename: req.file.filename,
    originalName: req.file.originalname,
    path: `/uploads/${req.file.filename}`
  };

  videos.push(videoData);

  res.send(`
    <h1>Video Uploaded Successfully!</h1>
    <p>Title: ${title}</p>
    <p>File: ${req.file.originalname}</p>
    <video width="400" controls>
      <source src="/uploads/${req.file.filename}" type="${req.file.mimetype}">
      Your browser does not support the video tag.
    </video>
    <br><br>
    <a href="videos.html">Back to Videos</a>
    <a href="home.html">Go to Home</a>
  `);
});

// Get all videos API
app.get('/api/videos', (req, res) => {
  res.json(videos);
});

// Handle profile picture upload
app.post('/upload-profile-picture', uploadProfilePicture.single('profilePicture'), (req, res) => {
  if (!req.file) {
    return res.send(`
      <h1>Error</h1>
      <p>No profile picture uploaded!</p>
      <a href="profile-pictures.html">Go back</a>
    `);
  }

  const { email } = req.body;
  
  // Find the profile and update with profile picture
  const profileIndex = profiles.findIndex(profile => profile.email === email);
  
  if (profileIndex === -1) {
    return res.send(`
      <h1>Error</h1>
      <p>Profile not found! Please make sure you entered the correct email.</p>
      <a href="profile-pictures.html">Go back</a>
    `);
  }

  const profilePicturePath = `/uploads/profile-pictures/${req.file.filename}`;
  profiles[profileIndex].profilePicture = profilePicturePath;

  res.send(`
    <h1>Profile Picture Uploaded Successfully!</h1>
    <p>Profile picture for: ${email}</p>
    <img src="${profilePicturePath}" width="150" height="150" style="border-radius: 50%; object-fit: cover;">
    <br><br>
    <a href="profile-pictures.html">Back to Profile Pictures</a>
    <a href="home.html">Go to Home</a>
  `);
});

// Get all profiles API
app.get('/api/profiles', (req, res) => {
  res.json(profiles);
});

// Add friend API
app.post('/api/add-friend', (req, res) => {
  const { userEmail, friendEmail } = req.body;
  
  // Check if both users exist
  const user = profiles.find(p => p.email === userEmail);
  const friend = profiles.find(p => p.email === friendEmail);
  
  if (!user || !friend) {
    return res.json({ success: false, message: 'User not found' });
  }
  
  if (userEmail === friendEmail) {
    return res.json({ success: false, message: 'Cannot add yourself as friend' });
  }
  
  // Check if friendship already exists
  const existingFriendship = friendships.find(f => 
    (f.user1 === userEmail && f.user2 === friendEmail) ||
    (f.user1 === friendEmail && f.user2 === userEmail)
  );
  
  if (existingFriendship) {
    return res.json({ success: false, message: 'Already friends' });
  }
  
  // Add friendship
  friendships.push({
    user1: userEmail,
    user2: friendEmail,
    createdAt: new Date()
  });
  
  res.json({ success: true, message: 'Friend added successfully' });
});

// Get friends list API
app.get('/api/friends/:userEmail', (req, res) => {
  const userEmail = req.params.userEmail;
  
  const userFriends = friendships.filter(f => 
    f.user1 === userEmail || f.user2 === userEmail
  ).map(f => {
    const friendEmail = f.user1 === userEmail ? f.user2 : f.user1;
    const friendProfile = profiles.find(p => p.email === friendEmail);
    return friendProfile;
  }).filter(Boolean);
  
  res.json(userFriends);
});

// Send message API
app.post('/api/send-message', (req, res) => {
  const { fromEmail, toEmail, message } = req.body;
  
  // Check if users are friends
  const areFriends = friendships.some(f => 
    (f.user1 === fromEmail && f.user2 === toEmail) ||
    (f.user1 === toEmail && f.user2 === fromEmail)
  );
  
  if (!areFriends) {
    return res.json({ success: false, message: 'Can only message friends' });
  }
  
  const newMessage = {
    id: Date.now(),
    from: fromEmail,
    to: toEmail,
    message: message,
    timestamp: new Date()
  };
  
  messages.push(newMessage);
  res.json({ success: true, message: 'Message sent' });
});

// Get messages API
app.get('/api/messages/:user1/:user2', (req, res) => {
  const { user1, user2 } = req.params;
  
  const conversation = messages.filter(m => 
    (m.from === user1 && m.to === user2) ||
    (m.from === user2 && m.to === user1)
  ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  res.json(conversation);
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});