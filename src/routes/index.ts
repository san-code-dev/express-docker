import { Router } from 'express'

import authRoutes from './auth/auth.routes'
import productRoutes from './master/masters.product.routes'
import userRoutes from './master/masters.user.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/product', productRoutes)
router.use('/user', userRoutes)

export default router
