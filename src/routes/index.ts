import { Router } from 'express'

import authRoutes from '../modules/auth/auth.routes'
import productRoutes from '../modules/product/product.routes'
import userRoutes from '../modules/user/user.routes'
import auditLogRoutes from'../modules/auditlog/auditlog.routes'
const router = Router()

router.use('/auth', authRoutes)
router.use('/product', productRoutes)
router.use('/user', userRoutes)
router.use('/audit-logs', auditLogRoutes)

export default router
