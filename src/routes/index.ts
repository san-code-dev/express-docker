import { Router } from 'express'

import authRoutes from './auth/auth.routes'
import productRoutes from './master/masters.product.routes'
import userRoutes from './master/masters.user.routes'
import builderRoutes from './builder/builder.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/master/products', productRoutes)
router.use('/master/users', userRoutes)
router.use('/builder/schema', builderRoutes)

export default router
