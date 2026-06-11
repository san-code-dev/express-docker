import { Request, Response } from "express";
import { comparePassword } from "../utils/bcrypt";
import { signToken } from "../utils/jwt";
import prisma from "../lib/prisma";
import { AccessMenu } from "../mock-data";

const authController = {
  async login(req: Request, res: Response) {
    const { email, password } = req.body;

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
      secure: false, // localhost
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    res.json({
      message: "Login berhasil",
      menu: AccessMenu
    });
  },

  /* ======================
      BACKEND LOGOUT
     ====================== */
  async logout(req: Request, res: Response) {
    // 1. Bersihkan cookie 'access_token'
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: false, // Samakan dengan konfigurasi saat login (false untuk localhost)
      sameSite: "lax",
    });

    // 2. Kirim response sukses ke client
    return res.status(200).json({ 
      message: "Logout berhasil, sesi telah berakhir" 
    });
  }
};

export default authController;