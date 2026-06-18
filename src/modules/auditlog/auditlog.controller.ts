import { Response } from 'express';
import prisma from '../../lib/prisma';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

export const AuditLogController = {
    async getAllLogs(req: AuthenticatedRequest, res: Response) {
        try {
            // Tangkap filter tableName jika dikirim oleh komponen Vue master
            const { tableName } = req.query;

            const whereCondition: any = {};
            if (tableName) {
                whereCondition.tableName = String(tableName); // Menyaring log khusus tabel tertentu
            }

            const logs = await prisma.auditLog.findMany({
                where: whereCondition,
                orderBy: { date: 'desc' }
            });

            const schemaFields = [
                { key: 'id', label: 'Log ID', type: 'display', primary: true },
                { key: 'action', label: 'Aksi', type: 'text' },
                { key: 'user', label: 'Eksekutif (User)', type: 'text' },
                { key: 'date', label: 'Waktu Kejadian', type: 'date' },
                { key: 'oldData', label: 'Data Lama', type: 'json' },
                { key: 'newData', label: 'Data Baru', type: 'json' }
            ];

            return res.json({
                schema: {
                    key: 'AuditLog',
                    label: 'Audit Trail Log',
                    permissions: { create: false, edit: false, delete: false, update: false },
                    schema: schemaFields,
                    data: logs
                }
            });
        } catch (error: any) {
            return res.status(500).json({ message: error.message || 'Gagal mengambil data' });
        }
    }
};