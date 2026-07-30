// server.ts
import http from 'http'
import { Server } from 'socket.io'
import app from './app'
import prisma from './lib/prisma'
import { setSocketInstance } from './lib/socket'

const PORT = parseInt(process.env.APP_PORT || '3000', 10)

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true
  }
})

// Simpan instance menggunakan fungsi setter
setSocketInstance(io)

io.on('connection', async (socket) => {
  console.log(`⚡ Client connected: ${socket.id}`)

  try {
    // 🔍 AMBIL USER ID DARI COOKIE / REQUEST HEADERS FRONTEND
    // Karena frontend menggunakan withCredentials: true, kita bisa membaca cookie request-nya
    const cookieHeader = socket.handshake.headers.cookie
    
    // Atau jika backend Anda menyimpan sesi/token, ekstrak userId di sini.
    // CONTOH: Jika Anda menyimpan userId di handshake auth atau query dari frontend:
    const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId

    if (userId) {
      const roomName = `user_${userId}`
      socket.join(roomName)
      console.log(`✅ Client ${socket.id} otomatis join ke room: ${roomName}`)
    } else {
      console.log(`⚠️ Client ${socket.id} terhubung tanpa userId di handshake.`)
    }
  } catch (err) {
    console.error('❌ Gagal memasukkan socket ke room:', err)
  }

  // Cadangan jika frontend ingin join manual lewat event
  socket.on('join_room', (room) => {
    socket.join(room)
    console.log(`Client ${socket.id} manual join ke room: ${room}`)
  })

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`)
  })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`)
})