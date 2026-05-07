require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN || '*' },
});

// Make io available to controllers via app.locals
app.set('io', io);

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  socket.on('disconnect', () => logger.info(`Socket disconnected: ${socket.id}`));
});

(async () => {
  try {
    await connectDB();
    server.listen(PORT, () => logger.info(`NOVA NEXUS API running on :${PORT}`));
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
})();
