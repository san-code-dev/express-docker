import express from "express";
import routes from "./routes";
import cookieParser from "cookie-parser";
import cors from "cors"

const app = express();

app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}))

app.use(cookieParser());

app.use("/api", routes);
app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

export default app;

