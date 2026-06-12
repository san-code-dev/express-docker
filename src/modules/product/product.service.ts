import prisma from '../../lib/prisma'


const PERMISSION = {
  create: true,
  edit: true,
  delete: false,
  update: true,
};

const SCHEMA = {
  key: 'Product',
  label: 'Data product',
  type: 'master',
  permissions:PERMISSION,
  schema: [
    { key: 'id', label: 'Product ID', type: 'display', primary: true, readonly: true },
    { key: 'name', label: 'Product Name', type: 'text' },
    { key: 'price', label: 'Price', type: 'currency' },
    { key: 'description', label: 'Description', type: 'textarea' },
  ],
  data:{},
};


export const ProductService = {

    async getAll() {
        const query = await prisma.product.findMany({
            orderBy: { createdAt: 'desc' }
        });

        // data yang mau ditampilkan di frontend
        const data = query.map(({ id, name, price, description }) => ({
            id,
            name,
            price,
            description,
        }));
        SCHEMA.data = data;
        return SCHEMA;
    },

    async create(data: any) {
        return await prisma.product.create({data});
    }
};