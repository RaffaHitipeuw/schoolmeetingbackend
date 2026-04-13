const { generateRoomCode } = require("./utils/generateId");

const rooms = new Map();

const MAX_PARTICIPANTS = 6;

function createRoom(hostSocketId, hostName) {
  let code;
  do {
    code = generateRoomCode();
  } while (rooms.has(code));

  rooms.set(code, {
    code,
    host: { id: hostSocketId, name: hostName },
    participants: new Map([[hostSocketId, { id: hostSocketId, name: hostName, isHost: true }]]),
    chat: [],
    createdAt: Date.now(),
  });
  return code;
}

function joinRoom(code, socketId, name) {
  const room = rooms.get(code);
  if (!room) return { error: "Room tidak ditemukan. Cek kodenya lagi ya." };
  if (room.participants.size >= MAX_PARTICIPANTS) return { error: "Room sudah penuh (maks 6 orang)." };
  room.participants.set(socketId, { id: socketId, name, isHost: false });
  return { room };
}

function getRoom(code) {
  return rooms.get(code) || null;
}

function getRoomBySocketId(socketId) {
  for (const room of rooms.values()) {
    if (room.participants.has(socketId)) return room;
  }
  return null;
}

function removeParticipant(socketId) {
  for (const [code, room] of rooms) {
    if (room.participants.has(socketId)) {
      const p = room.participants.get(socketId);
      const wasHost = p.isHost;
      room.participants.delete(socketId);
      if (wasHost || room.participants.size === 0) {
        rooms.delete(code);
        return { code, closed: true, name: p.name };
      }
      return { code, closed: false, name: p.name };
    }
  }
  return null;
}

function kickParticipant(code, hostSocketId, targetSocketId) {
  const room = rooms.get(code);
  if (!room) return { error: "Room tidak ditemukan." };
  if (room.host.id !== hostSocketId) return { error: "Hanya host yang bisa kick." };
  if (!room.participants.has(targetSocketId)) return { error: "Peserta tidak ditemukan." };
  const p = room.participants.get(targetSocketId);
  room.participants.delete(targetSocketId);
  return { ok: true, name: p.name };
}

function addChat(code, senderName, message) {
  const room = rooms.get(code);
  if (!room) return null;
  const entry = {
    id: Date.now() + Math.random().toString(36).slice(2, 6),
    senderName,
    message,
    time: Date.now(),
  };
  room.chat.push(entry);
  if (room.chat.length > 300) room.chat.shift();
  return entry;
}

function getPresence(room) {
  const list = Array.from(room.participants.values()).map((p) => ({
    id: p.id,
    name: p.name,
    isHost: p.isHost,
  }));
  return { participants: list, count: list.length };
}

module.exports = {
  createRoom,
  joinRoom,
  getRoom,
  getRoomBySocketId,
  removeParticipant,
  kickParticipant,
  addChat,
  getPresence,
};
