/**
 * Mengubah array filter mentah dari frontend (Pinia Store) 
 * menjadi objek "Where Input" yang valid untuk Prisma.
 */
export function parseFilterToPrisma(whereQuery: any): Record<string, any> {
  
  // 🟢 PERBAIKAN UTAMA: Jika input dikirim sebagai objek query Express { filter: "..." }
  // Kita ekstrak nilainya terlebih dahulu sebelum di-parse.
  if (whereQuery && typeof whereQuery === 'object' && 'filter' in whereQuery) {
    whereQuery = whereQuery.filter;
  }

  // Karena dikirim via JSON.stringify dari frontend, kita perlu parse kembali di sini
  if (typeof whereQuery === 'string') {
    try {
      whereQuery = JSON.parse(whereQuery);
    } catch (e) {
       console.log(`Invalid JSON in 'where' query parameter` );
       return {}; // Kembalikan objek kosong jika JSON rusak agar tidak crash
    }
  }

  // 1. Jika kosong atau tidak ada filter
  if (!whereQuery) return {};

  // 2. Jika ternyata data sudah berupa Objek Prisma matang (seperti hasil Quick Search)
  if (!Array.isArray(whereQuery) && typeof whereQuery === 'object') {
    return whereQuery;
  }

  // 3. Jika berbentuk Array Mentah dari Pinia Store, lakukan mapping
  const prismaWhere: Record<string, any> = {};

  if (Array.isArray(whereQuery)) {
    whereQuery.forEach((f: any) => {
      const { field, operator, value, valueTo } = f;

      // Lewati jika field atau value utama kosong agar tidak merusak query database
      if (!field || value === '' || value === null || value === undefined) return;

      // Kolom yang PASTI bertipe STRING di database Anda
      const stringFields = ['name', 'description', 'code', 'note', 'remarks', 'status'];

      // Anggap kolom bernilai angka jika dia kolom 'id' atau nama kolomnya TIDAK terdaftar di stringFields
      // DAN isi value-nya memang valid berupa angka.
      const isNumberField = field === 'id' || (!stringFields.includes(field.toLowerCase()) && !isNaN(Number(value)));

      switch (operator) {
        case 'contains':
          if (isNumberField) {
            prismaWhere[field] = { equals: Number(value) };
          } else {
            prismaWhere[field] = { contains: String(value), mode: 'insensitive' };
          }
          break;

        case 'equals':
          prismaWhere[field] = { equals: isNumberField ? Number(value) : String(value) };
          break;

        case 'greater_than':
          prismaWhere[field] = { gt: Number(value) };
          break;

        case 'less_than':
          prismaWhere[field] = { lt: Number(value) };
          break;

        case 'between':
          if (value && valueTo) {
            // Cek jika field mengandung format tanggal
            if (typeof value === 'string' && value.includes('-') && value.length === 10) {
              prismaWhere[field] = { gte: new Date(value), lte: new Date(valueTo) };
            } else {
              prismaWhere[field] = { gte: Number(value), lte: Number(valueTo) };
            }
          }
          break;
      }
    });
  }

  return prismaWhere;
}