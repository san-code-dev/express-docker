// src/modules/auth/auth.controller.ts
import { Request, Response } from "express";
import { comparePassword } from "../../utils/bcrypt";
import { signToken } from "../../utils/jwt";
import prisma from "../../lib/prisma";
import { generateDynamicMenu } from "../../utils/menuGenerator"; // 🌟 Import helper baru

const authController = {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

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

      const token = signToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      res.cookie("access_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 1000, // 1 Jam
      });

      // 🔥 KUNCI PERBAIKAN: Generate menu secara dinamis dari Service yang terdaftar
      const dynamicMenu = await generateDynamicMenu();

      return res.json({
        message: "Login berhasil",
        menu: dynamicMenu // 🌟 Sekarang 100% dinamis mengikuti dynamic routes!
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