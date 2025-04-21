require('dotenv').config();
const express = require('express');
const cors = require('cors');
const initRoutes = require('./routes/index.route');
const connectDB = require('./config/mongo');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 9000;
const http = require('http');
const { uploadErrorHandler } = require('./middleware/errorHandle.middleware');
const path = require('path');
const initSocketServer = require('./utils/socket.chat');
const server = http.createServer(app);

app.use(cors(
  {
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Disposition'],
  }
));

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

connectDB();
// Khởi tạo socket.io
const io = initSocketServer(server);
// Middleware để truyền io instance qua req
app.use((req, res, next) => {
  req.io = io;
  next();
});

initRoutes(app);
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

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});