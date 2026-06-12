import { Router } from 'express'

import authRoutes from '../modules/auth/auth.routes'
import productRoutes from '../modules/product/product.routes'
import userRoutes from '../modules/user/user.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/product', productRoutes)
router.use('/user', userRoutes)

export default router
