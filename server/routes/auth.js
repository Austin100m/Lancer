import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = Router();

const sign = (u) =>
  jwt.sign({ id: u._id, username: u.username }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  if (await User.findOne({ username })) return res.status(409).json({ error: 'Username taken' });
  const user = await User.create({ username, password: await bcrypt.hash(password, 10) });
  res.json({ token: sign(user), user: { id: user._id, username } });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: sign(user), user: { id: user._id, username } });
});

export default router;