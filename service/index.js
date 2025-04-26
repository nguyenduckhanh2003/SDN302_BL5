require('dotenv').config();
const express = require('express');
const cors = require('cors');
const initRoutes = require('./routes/index.route');
const connectDB = require('./config/mongo');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const app = express();
const { uploadErrorHandler } = require('./middleware/errorHandle.middleware');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const initSocketServer = require('./utils/socket.chat');
const { redisHealthCheck } = require('./middleware/cache.middleware');
const fs = require('fs');
const https = require('https');
const { setupArchiveSchedule } = require('./utils/chat-archive-system');

const options = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'private-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'certificate.pem'))
};
const server = https.createServer(options, app);
app.use(cors(
  {
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Disposition'],
  }
));

app.use(cookieParser());
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


app.use(morgan('dev'));
connectDB();

// Khởi tạo socket.io
const io = initSocketServer(server);
// Middleware để truyền io instance qua req
app.use((req, res, next) => {
  req.io = io;
  next();
});

initRoutes(app);
// Redis health check middleware
app.use(redisHealthCheck);

// Serve uploads directory for local file storage (as fallback)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use((err, req, res, next) => {
  console.error(err.stack);

  // First apply the upload error handler
  uploadErrorHandler(err, req, res, next);

  // If the error wasn't handled by uploadErrorHandler, handle it here
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
// Start message archiving scheduler if enabled
if (process.env.ENABLE_MESSAGE_ARCHIVING === 'true') {
  // Lấy cấu hình từ biến môi trường
  const archiveInterval = parseInt(process.env.ARCHIVE_DAYS_OLD || '90');
  const cronSchedule = process.env.ARCHIVE_CRON_SCHEDULE || '0 3 * * 0';

  // Thiết lập lịch lưu trữ
  setupArchiveSchedule({
    daysOld: archiveInterval,
    cronSchedule: cronSchedule,
  });
}
server.listen(8443, () => {
  console.log(`Server is running on https://localhost:${8443}`);
});