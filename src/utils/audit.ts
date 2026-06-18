import prisma from '../lib/prisma';

interface AuditPayload {
  tableName: string;
  action: 'created' | 'update' | 'delete';
  user: string; // Diambil dari req.user.email saat controller memanggil service
  oldData?: any;
  newData?: any;
}

export const createAuditLog = async ({ tableName, action, user, oldData, newData }: AuditPayload) => {
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