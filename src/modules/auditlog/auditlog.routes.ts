import { Router } from 'express';
import { AuditLogController } from './auditlog.controller';
import authMiddleware from '../../middlewares/auth.middleware';

const router = Router();
router.get('/', authMiddleware, AuditLogController.getAllLogs);
export default router;