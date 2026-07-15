// src/utils/menuGenerator.ts
import { MenuItem } from '../interface/base.interface';
import { ModuleRegistry } from '../services/index'; // 🌟 Import registry terpusat



export const generateDynamicMenu = async (): Promise<MenuItem[]> => {
    const menuList: MenuItem[] = [];

    // 1. Tambahkan menu statis inti (Dashboard)
    // menuList.push({
    //     key: 'Dashboard',
    //     icon: 'iconify:carbon:dashboard',
    //     label: 'Dashboard ERP',
    //     route: '/dashboard',
    //     api: '/api/dashboard',
    //     menuCategory: 'core',
    // });

    // 2. Loop secara instan dari registry terpusat
    for (const module of ModuleRegistry) {
        const schema = module.schema as any; // 🌟 Di-cast ke 'any' agar TS tidak rewel jika properti dinamis berubah

        if (schema && schema.key && !schema.isMenuHidden) {
            menuList.push({
                key: schema.key,
                icon: schema.icon || 'iconify:carbon:box', // Pakai fallback icon jika kosong
                label: schema.label || `Data ${schema.key}`,
                type:schema.type,
                route: `/${schema.key.toLowerCase()}`,
                api: `/api/${schema.key.toLowerCase()}`,
                menuCategory: schema.type || 'master',
            });
        }
    }

    return menuList;
};