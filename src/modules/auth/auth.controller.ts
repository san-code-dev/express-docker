import { Request, Response } from "express";
import { comparePassword } from "../../utils/bcrypt";
import { signToken } from "../../utils/jwt";
import prisma from "../../lib/prisma";
import { AccessMenu } from "../../utils/mock-data";

const authController = {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Validasi input kosong
      if (!email || !password) {
        return res.status(400).json({ message: "Email dan password wajib diisi" });
      }

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(401).json({ message: "Email atau password salah" });
      }

      const isMatch = await comparePassword(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Email atau password salah" });
      }

      // Pastikan payload sesuai dengan interface CustomJwtPayload
      const token = signToken({
        id: user.id,
        email: user.email,
        role: user.role, // Enum Role dari Prisma otomatis terbaca sebagai string di sini
      });

      res.cookie("access_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Otomatis true jika di production
        sameSite: "lax",
        maxAge: 15 * 60 * 1000, // 15 Menit
      });

      return res.json({
        message: "Login berhasil",
        menu: AccessMenu
      });
      
    } catch (error) {
      console.error("Login Error:", error);
      return res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async logout(req: Request, res: Response) {
    try {
      res.clearCookie("access_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      return res.status(200).json({ 
        message: "Logout berhasil, sesi telah berakhir" 
      });
    } catch (error) {
      console.error("Logout Error:", error);
      return res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  }
};

export default authController;