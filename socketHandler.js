const rm = require("./roomManager");

function registerHandlers(io, socket) {
  console.log(`[connect] ${socket.id}`);

  socket.on("create-room", ({ name }, cb) => {
    if (!name?.trim()) return cb({ error: "Nama tidak boleh kosong." });
    const code = rm.createRoom(socket.id, name.trim());
    socket.join(code);
    console.log(`[room:create] ${code} by ${name}`);
    cb({ code });
  });

  socket.on("join-room", ({ code, name }, cb) => {
    if (!name?.trim() || !code?.trim()) return cb({ error: "Nama dan kode harus diisi." });
    const result = rm.joinRoom(code.trim().toUpperCase(), socket.id, name.trim());
    if (result.error) return cb({ error: result.error });

    const room = result.room;
    socket.join(code.trim().toUpperCase());

    const presence = rm.getPresence(room);
    const existingPeers = Array.from(room.participants.keys()).filter((id) => id !== socket.id);

    cb({
      ok: true,
      presence,
      chat: room.chat,
      existingPeers,
    });

    socket.to(code.trim().toUpperCase()).emit("presence-update", presence);
    socket.to(code.trim().toUpperCase()).emit("peer-joined", {
      socketId: socket.id,
      name: name.trim(),
    });

    console.log(`[room:join] ${name} -> ${code}`);
  });

  socket.on("webrtc-offer", ({ targetId, offer }) => {
    io.to(targetId).emit("webrtc-offer", { fromId: socket.id, offer });
  });

  socket.on("webrtc-answer", ({ targetId, answer }) => {
    io.to(targetId).emit("webrtc-answer", { fromId: socket.id, answer });
  });

  socket.on("ice-candidate", ({ targetId, candidate }) => {
    io.to(targetId).emit("ice-candidate", { fromId: socket.id, candidate });
  });

  socket.on("chat-message", ({ code, name, message }) => {
    if (!message?.trim()) return;
    const entry = rm.addChat(code, name, message.trim());
    if (entry) io.to(code).emit("chat-message", entry);
  });

  socket.on("mute-all", ({ code }) => {
    const room = rm.getRoom(code);
    if (!room || room.host.id !== socket.id) return;
    socket.to(code).emit("force-mute");
  });

  socket.on("kick-user", ({ code, targetId }) => {
    const result = rm.kickParticipant(code, socket.id, targetId);
    if (result.error) return;
    io.to(targetId).emit("you-were-kicked");
    const room = rm.getRoom(code);
    if (room) {
      const presence = rm.getPresence(room);
      io.to(code).emit("presence-update", presence);
      io.to(code).emit("peer-left", { socketId: targetId });
    }
    console.log(`[room:kick] ${result.name} from ${code}`);
  });

  socket.on("speaking", ({ code, speaking }) => {
    socket.to(code).emit("peer-speaking", { socketId: socket.id, speaking });
  });

  socket.on("disconnect", () => {
    console.log(`[disconnect] ${socket.id}`);
    const result = rm.removeParticipant(socket.id);
    if (!result) return;

    if (result.closed) {
      io.to(result.code).emit("room-closed", { reason: "Host telah menutup room." });
      console.log(`[room:closed] ${result.code}`);
    } else {
      const room = rm.getRoom(result.code);
      if (room) {
        const presence = rm.getPresence(room);
        io.to(result.code).emit("presence-update", presence);
        io.to(result.code).emit("peer-left", { socketId: socket.id });
      }
      console.log(`[room:leave] ${result.name} from ${result.code}`);
    }
  });
}

module.exports = { registerHandlers };
