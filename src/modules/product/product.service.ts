import prisma from '../../lib/prisma'
import { userContextStorage } from '../../utils/context'
import { createAuditLog } from '../../utils/audit';

const PERMISSION = {
    create: true,
    edit: true,
    delete: true,
    update: true,
};

const SCHEMA = {
    key: 'Product',
    label: 'Data product',
    type: 'master',
    permissions: PERMISSION,
    schema: [
        { key: 'id', label: 'Product ID', type: 'display', primary: true, readonly: true },
        { key: 'name', label: 'Product Name', type: 'text', required: true },
        { key: 'price', label: 'Price', type: 'currency' }, // 🌟 Akan di-map ke 'decimal' di Vue loadComponentData
        { key: 'description', label: 'Description', type: 'textarea' },
        {
            "key": "status",
            "label": "Status",
            "type": "select",
            "options": [
                { "label": "Aktif", "value": "active" },
                { "label": "Non-Aktif", "value": "inactive" }
            ]
        },
        // 🌟 Sesuaikan key ke 'tanggalMasuk' agar match dengan properti database
        { "key": "tanggalMasuk", "label": "Tanggal", "type": "date" },
    ],
    data: [] as any,
};
export const ProductService = {

    _getCurrentUserEmail() {
        const store = userContextStorage.getStore();
        return store?.email || 'System/Unknown'; // Mengambil properti email dari CustomJwtPayload secara otomatis
    },

    async getAll(where: any = {}) {
        const query = await prisma.product.findMany({
            where: where,
            orderBy: { createdAt: 'asc' }
        });

        const data = query.map(({ id, name, price, description, status, tanggalMasuk }) => ({
            id,
            name,
            price: Number(price),
            description,
            status,
            tanggalMasuk: tanggalMasuk.toISOString().split('T')[0]
        }));

        SCHEMA.data = data;
        return SCHEMA;
    },

    async create() {
        const newData = await prisma.product.create({
            data: {
                name: "New Product",
                price: 0,
                status: "active",
                tanggalMasuk: new Date()
            }
        });

        await createAuditLog({
            tableName: 'Product',
            action: 'created',
            user: this._getCurrentUserEmail(),
            oldData: null,
            newData: newData
        });

        return newData;
    },

    // 🌟 PASTIKAN METHOD INI ADA DI DALAM BLOK PRODUCTSERVICE
    async getById(id: number) {
        return await prisma.product.findUnique({
            where: { id: id },
            select: {
                id: true,
                name: true,
                price: true,
                description: true,
                status: true,
                tanggalMasuk: true
            }
        });
    },

    async update(id: number, data: any) {
        const oldData = await this.getById(id);
        const newData = { ...data };
        if (newData.price !== undefined) {
            newData.price = Number(newData.price);
        }
        if (newData.tanggalMasuk) {
            newData.tanggalMasuk = new Date(newData.tanggalMasuk);
        }

        const updatedData = await prisma.product.update({
            where: { id: id },
            data: newData,
            select: {
                id: true,
                name: true,
                price: true,
                description: true,
                status: true,
                tanggalMasuk: true
            }
        });

        await createAuditLog({
            tableName: 'Product',
            action: 'update',
            user: this._getCurrentUserEmail(),
            oldData: oldData,
            newData: newData
        });

        return updatedData;
    },

    async delete(id: number) {
        const oldData = await this.getById(id)
        const deletedData = await prisma.product.delete({
            where: { id: id }
        });

        await createAuditLog({
            tableName: 'Product', // Sesuai nama skema atau SCHEMA.key
            action: 'delete',
            user: this._getCurrentUserEmail(),
            oldData: oldData,
            newData: null // Null karena datanya sudah tidak ada lagi setelah dihapus
        });
        return deletedData;
    }
};