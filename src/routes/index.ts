import { Router } from 'express'

import authRoutes from '../modules/auth/auth.routes'
import userRoutes from '../modules/user/user.routes'
const router = Router()

router.use('/auth', authRoutes)
router.use('/user', userRoutes)

export default router
