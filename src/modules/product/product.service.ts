import prisma from '../../lib/prisma'

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
        { key: 'name', label: 'Product Name', type: 'text' },
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
        return await prisma.product.create({
            data: {
                name: "New Product",
                price: 0,
                status: "active",
                tanggalMasuk: new Date()
            }
        });
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
        const updateData = { ...data };
        if (updateData.price !== undefined) {
            updateData.price = Number(updateData.price);
        }
        if (updateData.tanggalMasuk) {
            updateData.tanggalMasuk = new Date(updateData.tanggalMasuk);
        }

        return await prisma.product.update({
            where: { id: id },
            data: updateData,
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

    async delete(id: number) {
        return await prisma.product.delete({
            where: { id: id }
        });
    }
};