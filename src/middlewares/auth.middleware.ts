import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt"
import { CustomJwtPayload } from "../utils/jwt";

export interface AuthenticatedRequest extends Request {
  user?: CustomJwtPayload;
}

const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies?.access_token;

  if (!token) {
    return res.status(401).json({ message: "Cookies tidak ditemukan" });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Cookies ada tapi token tidak valid" });
  }
};

export default authMiddleware;
