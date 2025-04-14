require('dotenv').config();
const express = require('express');
const cors = require('cors');
const initRoutes = require('./routes/index.route');
const connectDB = require('./config/mongo');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 9000;
const http = require('http');
const server = http.createServer(app);
app.use(cors(
  {
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Disposition'],
  }
));

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

connectDB();
initRoutes(app);

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});