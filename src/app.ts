import express from "express";
import routes from "./routes/index";
import { initDynamicRoutes } from './routes/dynamic.router';
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

// 1. MIDDLEWARE GLOBAL (Wajib paling atas!)
const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:5173"; // Fallback port default Vue

app.use(cors({
  origin: allowedOrigin,
  credentials: true, // Wajib true karena menggunakan cookie-parser (JWT)
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json()); // Agar backend bisa membaca req.body JSON
app.use(cookieParser()); // Agar backend bisa membaca cookie

// 2. INISIALISASI ROUTE DINAMIS
const dynamicRouter = initDynamicRoutes();

// 3. DAFTAR RUTE API (Setelah semua middleware siap)
app.use("/api", routes);         // Rute manual (Auth, User)
app.use("/api", dynamicRouter);  // Rute otomatis ERP

app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

export default app;