import { Router } from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import Message from '../models/Message.js';

const router = Router();

router.get('/users', auth, async (req, res) => {
  res.json(await User.find({ _id: { $ne: req.user.id } }).select('username'));
});

router.get('/:userId', auth, async (req, res) => {
  const me = req.user.id, other = req.params.userId;
  const msgs = await Message.find({
    $or: [{ sender: me, receiver: other }, { sender: other, receiver: me }],
  }).sort('createdAt');
  res.json(msgs);
});

export default router;