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
        { key: 'price', label: 'Price', type: 'currency' },
        { key: 'description', label: 'Description', type: 'textarea' },
    ],
    data: {},
};

export const ProductService = {

    // Tambahkan parameter 'where' dengan tipe data object default kosong
    async getAll(where: any = {}) {
        const query = await prisma.product.findMany({
            where: where, // <--- Filter dari frontend diterapkan di sini
            orderBy: { createdAt: 'asc' }
        });

        // Data yang mau ditampilkan di frontend
        const data = query.map(({ id, name, price, description }) => ({
            id,
            name,
            price,
            description,
        }));
        
        SCHEMA.data = data;
        return SCHEMA;
    },

    async create() {
        return await prisma.product.create({});
    }
};