import { Router } from 'express'

import authRoutes from '../modules/auth/auth.routes'
import auditLogRoutes from '../modules/auditlog/auditlog.routes'
const router = Router()

router.use('/auth', authRoutes)
router.use('/audit-logs', auditLogRoutes)

export default router
