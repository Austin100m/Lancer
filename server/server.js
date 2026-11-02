import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import messageRoutes from './routes/messages.js';
import Message from './models/Message.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());
app.get('/', (req, res) => res.send('Lancer API is running'));
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL } });

io.use((socket, next) => {
  try {
    const payload = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET);
    socket.userId = payload.id;
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.join(socket.userId);

  socket.on('private_message', async ({ to, text }) => {
    if (!text?.trim()) return;
    const msg = await Message.create({ sender: socket.userId, receiver: to, text });
    io.to(to).to(socket.userId).emit('private_message', msg);
  });
});

mongoose.connect(process.env.MONGO_URI).then(() => {
  server.listen(process.env.PORT, () => console.log('Server running on', process.env.PORT));
});