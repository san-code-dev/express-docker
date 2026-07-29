// server.ts
import http from 'http'
import { Server } from 'socket.io'
import app from './app'
import prisma from './lib/prisma'
import { setSocketInstance } from './lib/socket' // <--- Import ini

const PORT = parseInt(process.env.APP_PORT || '3000', 10)

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true
  }
})

// Simpan instance menggunakan fungsi setter
setSocketInstance(io) // <--- Set di sini

io.on('connection', (socket) => {
  console.log(`⚡ Client connected: ${socket.id}`)
  
  socket.on('join_room', (room) => {
    socket.join(room)
  })

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`)
  })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`)
})

// ... (kode graceful shutdown tetap sama)