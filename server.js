const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

// Load environment variables
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
// Serve static files explicitly
app.get('/bundle.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'bundle.js'));
});

app.get('/payment.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'payment.html'));
});

app.get('/credit.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'credit.txt'));
});

// MongoDB connection
const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    console.log('URI:', process.env.MONGODB_URI ? 'URI loaded' : 'URI not found');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas');
    await initData();
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
  }
};

connectDB();

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  audienceType: { type: String, default: 'external' },
  badgeId: { type: Number, required: true },
  authId: { type: Number, required: true },
  enrolledCourses: [{ type: Number }]
});

const User = mongoose.model('User', userSchema);

const voucherSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  courseId: { type: Number, required: true },
  isUsed: { type: Boolean, default: false },
  usedBy: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  usedAt: { type: Date, default: null }
});

const Voucher = mongoose.model('Voucher', voucherSchema);

const courseSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  type: { type: String, required: true }, // 'free' or 'premium'
  price: { type: Number, default: 0 }
});

const Course = mongoose.model('Course', courseSchema);

// Initialize courses and admin
const initData = async () => {
  try {
    const courseCount = await Course.countDocuments();
    if (courseCount === 0) {
      await Course.insertMany([
        { id: 1001, title: 'Basic HTML', type: 'free', price: 0 },
        { id: 1002, title: 'Advanced React', type: 'premium', price: 99 },
        { id: 1003, title: 'Node.js Basics', type: 'free', price: 0 },
        { id: 1004, title: 'Cybersecurity Pro', type: 'premium', price: 199 }
      ]);
      console.log('Courses initialized');
    }
    
    // Create internal user (admin)
    const internalExists = await User.findOne({ audienceType: 'internal' });
    if (!internalExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const badgeId = 9999;
      
      await User.create({
        username: 'admin',
        password: hashedPassword,
        audienceType: 'internal',
        badgeId: badgeId,
        authId: badgeId
      });
      console.log('Admin user created');
    }
  } catch (error) {
    console.error('Init data error:', error);
  }
};

// Initialize data after a delay to ensure connection
// setTimeout(initData, 2000);

// Middleware
// Simple cookie-based auth middleware (VULNERABLE)
const auth = async (req, res, next) => {
  try {
    const audienceType = req.cookies.AudienceType;
    const badgeId = req.cookies.badgeid;
    const authId = req.cookies.authid;
    
    if (!audienceType || !badgeId || !authId) {
      return res.status(401).json({ error: 'Access denied' });
    }
    
    // Find user by cookies (VULNERABLE - can be manipulated)
    const user = await User.findOne({ 
      audienceType: audienceType,
      badgeId: parseInt(badgeId),
      authId: parseInt(authId)
    });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid authentication' });
  }
};

// Get all users (Admin only - VULNERABLE if you can become admin)
app.get('/api/users', auth, async (req, res) => {
  if (req.user.audienceType !== 'internal') {
    return res.status(403).json({ error: 'Access denied - Admin only' });
  }
  
  try {
    const users = await User.find({}, 'username audienceType badgeId authId');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
app.post('/api/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const badgeId = Math.floor(Math.random() * 9000) + 1000;
    
    const user = new User({
      username,
      password: hashedPassword,
      audienceType: 'external',
      badgeId,
      authId: badgeId
    });
    
    await user.save();
    res.json({ message: 'User created successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Username already exists' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Set authentication cookies (VULNERABLE)
    res.cookie('AudienceType', user.audienceType);
    res.cookie('badgeid', user.badgeId);
    res.cookie('authid', user.authId);
    
    // Add garbage cookies to obfuscate
    res.cookie('sessionToken', 'sk_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
    res.cookie('csrfToken', 'csrf_' + Math.random().toString(36).substring(2, 20));
    res.cookie('trackingId', 'GA1.2.' + Math.floor(Math.random() * 1000000000) + '.' + Math.floor(Date.now() / 1000));
    res.cookie('deviceFingerprint', Buffer.from(JSON.stringify({
      screen: '1920x1080',
      timezone: 'UTC',
      language: 'en-US',
      platform: 'Linux x86_64',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    })).toString('base64'));
    res.cookie('preferences', JSON.stringify({
      theme: 'dark',
      notifications: true,
      analytics: false,
      cookies: 'essential'
    }));
    res.cookie('lastActivity', Date.now().toString());
    res.cookie('browserSession', 'bs_' + Array(32).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''));
    res.cookie('apiVersion', 'v2.1.4');
    res.cookie('clientId', 'client_' + Math.random().toString(36).substring(2, 12));
    res.cookie('correlationId', 'corr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));
    
    res.json({ 
      message: 'Login successful', 
      audienceType: user.audienceType
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/courses', async (req, res) => {
  const courses = await Course.find({}, { _id: 0, __v: 0 });
  res.json(courses);
});

// VULNERABLE ENDPOINT - The main CTF vulnerability
app.post('/api/claim-courses-free', auth, async (req, res) => {
  try {
    const { course_id } = req.body;
    const course = await Course.findOne({ id: course_id });
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // VULNERABILITY: Only checks if course exists, not if it's actually free
    if (!req.user.enrolledCourses.includes(course_id)) {
      req.user.enrolledCourses.push(course_id);
      await req.user.save();
    }
    
    let message = `Successfully enrolled in ${course.title}`;
    
    // Flag revealed when premium course is claimed via free endpoint
    if (course.type === 'premium') {
      message += ' | Successfully enrolled';
    }
    
    res.json({ 
      message,
      course: course.title,
      type: course.type,
      courseId: course.id
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/premium-purchase', auth, async (req, res) => {
  try {
    const { course_id } = req.body;
    const course = await Course.findOne({ id: course_id });
    
    if (!course || course.type !== 'premium') {
      return res.status(404).json({ error: 'Premium course not found' });
    }
    
    if (!req.user.enrolledCourses.includes(course_id)) {
      req.user.enrolledCourses.push(course_id);
      await req.user.save();
    }
    
    res.json({ message: `Successfully purchased ${course.title} for $${course.price}` });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin panel (for internal users)
app.get('/api/admin/orders', auth, async (req, res) => {
  if (req.user.audienceType !== 'internal') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const users = await User.find({}, { password: 0 });
  const courses = await Course.find({});
  
  const orders = users.map(user => ({
    username: user.username,
    audienceType: user.audienceType,
    badgeId: user.badgeId,
    enrolledCourses: user.enrolledCourses.map(courseId => {
      const course = courses.find(c => c.id === courseId);
      return course ? { id: courseId, title: course.title, type: course.type } : null;
    }).filter(Boolean)
  }));
  
  res.json(orders);
});

// Generate voucher
app.post('/api/admin/generate-voucher', auth, async (req, res) => {
  if (req.user.audienceType !== 'internal') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    const { courseId } = req.body;
    const course = await Course.findOne({ id: courseId });
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    const voucherCode = 'VOUCHER' + Math.random().toString(36).substr(2, 8).toUpperCase();
    
    const voucher = new Voucher({
      code: voucherCode,
      courseId: courseId
    });
    
    await voucher.save();
    
    res.json({ 
      message: 'Voucher generated successfully',
      voucher: {
        code: voucherCode,
        courseId: courseId,
        courseTitle: course.title
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all vouchers
app.get('/api/admin/vouchers', auth, async (req, res) => {
  if (req.user.audienceType !== 'internal') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    const vouchers = await Voucher.find({});
    const courses = await Course.find({});
    
    const vouchersWithDetails = vouchers.map(voucher => {
      const course = courses.find(c => c.id === voucher.courseId);
      return {
        code: voucher.code,
        courseId: voucher.courseId,
        courseTitle: course ? course.title : 'Unknown Course',
        isUsed: voucher.isUsed,
        usedBy: voucher.usedBy,
        createdAt: voucher.createdAt,
        usedAt: voucher.usedAt
      };
    });
    
    res.json(vouchersWithDetails);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add course
app.post('/api/admin/add-course', auth, async (req, res) => {
  if (req.user.audienceType !== 'internal') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    const { title, type, price } = req.body;
    
    // Get next auto-increment ID
    const lastCourse = await Course.findOne().sort({ id: -1 });
    const courseId = lastCourse ? lastCourse.id + 1 : 1001;
    
    const course = new Course({
      id: courseId,
      title,
      type,
      price: price || 0
    });
    
    await course.save();
    
    res.json({ 
      message: 'Course added successfully',
      course: {
        id: courseId,
        title,
        type,
        price: price || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete course
app.delete('/api/admin/delete-course', auth, async (req, res) => {
  if (req.user.audienceType !== 'internal') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    const { courseId } = req.body;
    const result = await Course.deleteOne({ id: courseId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
app.post('/api/redeem-voucher', auth, async (req, res) => {
  try {
    const { voucherCode } = req.body;
    const voucher = await Voucher.findOne({ code: voucherCode });
    
    if (!voucher) {
      return res.status(404).json({ error: 'Invalid voucher code' });
    }
    
    if (voucher.isUsed) {
      return res.status(400).json({ error: 'Voucher already used' });
    }
    
    const course = await Course.findOne({ id: voucher.courseId });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // Add course to user's enrolled courses
    if (!req.user.enrolledCourses.includes(voucher.courseId)) {
      req.user.enrolledCourses.push(voucher.courseId);
      await req.user.save();
    }
    
    // Mark voucher as used
    voucher.isUsed = true;
    voucher.usedBy = req.user.username;
    voucher.usedAt = new Date();
    await voucher.save();
    
    res.json({ 
      message: `Successfully redeemed voucher for ${course.title}`,
      course: course.title,
      type: course.type
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/profile', auth, async (req, res) => {
  try {
    const courses = await Course.find({ id: { $in: req.user.enrolledCourses || [] } });
    res.json({
      username: req.user.username,
      audienceType: req.user.audienceType,
      badgeId: req.user.badgeId,
      enrolledCourses: courses
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  // Clear authentication cookies
  res.clearCookie('AudienceType');
  res.clearCookie('badgeid');
  res.clearCookie('authid');
  
  // Clear garbage cookies
  res.clearCookie('sessionToken');
  res.clearCookie('csrfToken');
  res.clearCookie('trackingId');
  res.clearCookie('deviceFingerprint');
  res.clearCookie('preferences');
  res.clearCookie('lastActivity');
  res.clearCookie('browserSession');
  res.clearCookie('apiVersion');
  res.clearCookie('clientId');
  res.clearCookie('correlationId');
  
  res.json({ message: 'Logged out successfully' });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`LMS CTF running on port ${PORT}`);
});
