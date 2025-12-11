require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const passport = require('passport');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

const db = require('./config/db');
const sequelize = require('./sequelize');

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swaggerConfig');


// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Optional: Serve swagger spec as JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ... r

// Middleware
app.use(cookieParser());
app.use(cookieSession({
  name: 'session',
  keys: ['mimche'],
  maxAge: 24 * 60 * 60 * 1000
}));

app.use(passport.initialize());
app.use(passport.session());

const credentials = require("./middlewares/credentials");
app.use(credentials);

const corsOptions = {
  credentials: true,
  origin: 'https://mimlyricstest5.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
};
app.use(cors(corsOptions));

app.use("/public", express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// DB initialization
(async () => {
  await db.createDatabase();

  //const sequelizeInstance = await sequelize; 
  // Load all models BEFORE syncing
  //require("./models/User")(sequelizeInstance);
  await sequelize.sync({ force: false});
  await seedDatabase();
  console.log("All models synced (force: )");
})();

// Passport config
require('./utils/passport-google');

const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const laboratoryRoutes = require('./routes/laboratoryRoutes');
const accessRoutes = require('./routes/accessRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
// Use routes
app.use('/api/v1', userRoutes)
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/doctors', doctorRoutes);
app.use('/api/v1/laboratories', laboratoryRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1', accessRoutes);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    credentials: true,
    origin: function(origin, callback) {
      const allowedOrigins = ['http://localhost:3001'];
      if (!origin || allowedOrigins.indexOf(origin) !== -1) callback(null, true);
      else callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
  }
});

let users = [];

const addUser = ({ id, phone, room, avatar, username }) => {
  const existingUser = users.find(u => u.room === room && u.phone === phone);
  if (existingUser) return { error: 'Username is taken' };
  const user = { id, phone, room, avatar, username };
  users.push(user);
  return { user };
};

const removeUser = (id) => users = users.filter(user => user.id !== id);
const getUser = (id) => users.find(user => user.id === id);
const getUsersInRoom = (room) => users.filter(user => user.room === room);

io.on("connection", (socket) => {
  socket.on('join', ({ phone, room, avatar, username }, callback) => {
    const id = socket.id;
    const { error, user } = addUser({ id, phone, room, avatar, username });
    io.emit("getUser", { users, user });
    if (error) return callback(error);
    socket.emit('message', { user: 'admin', text: `Welcome ${phone} !` });
    socket.broadcast.to(room).emit('message', { user: 'admin', text: `${username} has joined` });
    socket.join(room);
    callback();
  });

  socket.on("sendMessage", ({ from, text, avatar, username }, callback) => {
    const user = getUser(socket.id);
    if (user) io.to(user.room).emit('message', { user: from, text, avatar, username });
    callback();
  });

  socket.on("disconnect", () => {
    removeUser(socket.id);
    io.emit("getUsers", users);
  });
});

// Error middlewares
const { notFound, errorHandler } = require("./middlewares/errorMiddleware");
const { createAdmin, seedDatabase } = require('./db/init');

app.use(notFound);
app.use(errorHandler);

// Start server
const port = process.env.PORT || 5175;
httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
