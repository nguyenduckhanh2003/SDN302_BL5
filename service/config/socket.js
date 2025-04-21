const { Server } = require('socket.io');

let io;
const connectedUsers = {};

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    // console.log(`🔗 User connected: ${socket.id}`);

    socket.on('joinRoom', (employeeId) => {
      // console.log(`🔗 Employee ${employeeId} joined room: ${socket.id}`);
      socket.join(employeeId);
      socket.emit('joinedRoom', `Joined room: ${employeeId}`);
    });
 
    socket.on('disconnect', () => {
      // console.log(`❌ User disconnected: ${socket.id}`);
       
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.io chưa được khởi tạo!");
  return io;
};

module.exports = { initSocket, getIO };
