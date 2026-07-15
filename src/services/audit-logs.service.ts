import { MasterSchema, MasterService } from '../interface/base.interface';
import prisma from '../lib/prisma';
import { userContextStorage } from '../utils/context';


export const SCHEMA: MasterSchema = {
    key: 'audit-logs',
    label: 'Data audit',
    type: 'master' as const,
    icon: 'iconify:carbon:clock',
    permissions: { create: true, edit: true, delete: true },
    isMenuHidden:true,
    schema: [
        { key: 'id', label: 'Log ID', type: 'display', primary: true },
        { key: 'action', label: 'Aksi', type: 'text' },
        { key: 'user', label: 'Eksekutif (User)', type: 'text' },
        { key: 'createdAt', label: 'Waktu Kejadian', type: 'date' },
        { key: 'oldData', label: 'Data Lama', type: 'json' },
        { key: 'newData', label: 'Data Baru', type: 'json' }
    ],
    data: [] as any[],
};

export const AuditLogsService: MasterService = {
    getModuleSchema: (): MasterSchema => {
        return SCHEMA;
    },

    async getAll(params: any) {
                    console.log(params)

        const logs = await prisma.auditLog.findMany({
            where: {tableName:"product"},
            orderBy: { createdAt: 'desc' }
        })

        SCHEMA.data = logs
        return SCHEMA
    },

    async create(body?: any) {
        const user = userContextStorage.getStore()?.email || 'System/Unknown';
        await prisma.auditLog.create({
            data: {
                tableName: body.tableName,
                action: body.action,
                user: user,
                oldData: body.oldData,
                newData: body.newData,
            },
        });
        return user
    },






    update: function (id: number, body: any): Promise<any> {
        throw new Error('Function not implemented.');
    },
    delete: function (id: number): Promise<any> {
        throw new Error('Function not implemented.');
    }
};