import prisma from '../lib/prisma';
import { userContextStorage } from '../utils/context';

interface AuditPayload {
  tableName: string;
  action: 'created' | 'update' | 'delete';
  oldData?: any;
  newData?: any;
}

export const createAuditLog = async ({ tableName, action, oldData, newData }: AuditPayload) => {
  const user = userContextStorage.getStore()?.email || 'System/Unknown';

  try {
    await prisma.auditLog.create({
      data: {
        tableName,
        action,
        user,
        // Format payload sesuai permintaan Anda di dalam kolom JSON prisma
        oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
        newData: newData ? JSON.parse(JSON.stringify(newData)) : null,
      },
    });
  } catch (error) {
    // Kita tangkap error agar kegagalan log tidak merusak transaksi utama bisnis data
    console.error(`[Audit Log Error] Gagal mencatat log untuk ${tableName}:`, error);
  }
};