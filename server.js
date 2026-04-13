const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const corsOptions = require("./config/cors");
const { registerHandlers } = require("./socketHandler");

const app = express();
app.use(cors(corsOptions));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.get("/health", (_, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

io.on("connection", (socket) => {
  registerHandlers(io, socket);
});


const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ School Meeting backend jalan di http://localhost:${PORT}`);
});
