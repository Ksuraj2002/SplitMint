import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });
    const user = await User.create({ email, password, name: name || '' });
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );
    res.status(201).json({
      user: { id: user._id, email: user.email, name: user.name },
      token,
    });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });
    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid email or password' });
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );
    res.json({
      user: { id: user._id, email: user.email, name: user.name },
      token,
    });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Login failed' });
  }
});

router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user });
});

export default router;
