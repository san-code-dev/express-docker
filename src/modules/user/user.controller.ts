import { Request, Response } from 'express'
import prisma from "../../lib/prisma";

const userController = {
  async getAll(req: Request, res: Response) {
    const users =  await prisma.user.findMany();
    res.json(users)
  },

  async getById(req: Request, res: Response) {
    res.json({ id: req.params.id })
  },

  async create(req: Request, res: Response) {
    const { name, email, password } = req.body;
    const query= await prisma.user.create({
      data: {
        name,
        email,
        password,
      },
    });
    if (query) {
      res.status(201).json({ message: 'User created' })
    } else {
      res.status(400).json({ message: 'Failed to create user' })
    }
  },
  

  async update(req: Request, res: Response) {
    res.json({ message: 'Product updated' })
  },

  async remove(req: Request, res: Response) {
    res.json({ message: 'Product deleted' })
  }
}

export default userController
