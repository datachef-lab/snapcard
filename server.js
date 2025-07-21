const { Server } = require("socket.io");
const http = require("http");

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: "*" }
});

let onlineUsers = new Set();

io.on("connection", (socket) => {
  socket.on("user:join", (user) => {
    if (user?.email) onlineUsers.add(user.email);
    io.emit("activeUsers:update", Array.from(onlineUsers));
  });

  socket.on("disconnect", () => {
    // Optionally remove user by socket id/email
    io.emit("activeUsers:update", Array.from(onlineUsers));
  });

  // Example: emit stats update (call this from your backend logic after DB change)
  // io.emit("stats:update", { ...newStats });
  // io.emit("hourly:update", { ...newHourly });
});

server.listen(4001, () => {
  console.log("Socket.IO server running on port 4001");
}); 