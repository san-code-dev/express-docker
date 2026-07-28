# Backend Express Starter with Docker, Prisma & PostgreSQL

Starter pack backend Express menggunakan Docker, Prisma ORM, dan PostgreSQL yang dikonfigurasi aman untuk lintas OS (Windows/macOS/Linux) serta mendukung deployment offline ke komputer client.

---

## DEVELOPMENT ENVIRONMENT

Alur kerja development saat ini sudah otomatis penuh. Docker secara mandiri mengisolasi `node_modules` untuk OS Linux Alpine di dalam container, namun tetap sinkron dengan library baru yang Anda tambahkan dari lokal.

### 1. Inisialisasi Pertama Kali
```bash
# 1. Salin konfigurasi environment variabel
cp .env.example .env

# 2. Install di lokal (Wajib untuk kebutuhan Autocomplete/IntelliSense di VS Code)
npm install

# 3. Pembuatan tipe data Prisma di komputer lokal Anda agar IntelliSense VS Code berjalan normal
npx prisma generate

# 4. Nyalakan Docker container
docker compose up
```
---
### 2. Cheat Sheet Alur Kerja Harian (PENTING)
> Menambahkan Library Baru (Misal: express, open):

1. Jalankan npm install <nama-library> di terminal laptop Anda (agar VS Code mengenali library tersebut).

2. Restart container dengan menekan Ctrl + C lalu ketik docker compose up.

3. Docker akan otomatis mendeteksi perubahan package.json dan menginstall library tersebut ke dalam container saat startup. TIDAK PERLU docker compose down -v.

> Mengubah Skema Prisma (schema.prisma):

1. Jalankan npx prisma generate di terminal laptop Anda (agar VS Code tidak memunculkan error garis merah).

1. Restart container Docker.

1. Docker secara aman akan melakukan db push (jika aman) dan meng-generate Prisma client versi Linux di dalam containernya sendiri.

> Kapan Harus Menggunakan docker compose down -v?

Hanya gunakan perintah ini jika terjadi error konfigurasi Docker yang parah atau Anda ingin melakukan reset total (clear cache volume). Jangan gunakan ini untuk alur harian karena akan menghapus volume data.

## PRODUCTION & OFFLINE DEPLOYMENT (CLIENT ENVIRONMENT)
Gunakan metode Docker Save & Load jika komputer client tidak memiliki koneksi internet (offline).

> Skenario A: Deploy Lewat Laptop Anda (Offline Deployment Ke Client)

### 1. Build & Ekspor di Laptop Anda (Ada Internet)


1. Build image versi production bawaan Dockerfile
`docker build -t nama-aplikasi-client:v1 .`

2. Bungkus image menjadi file arsip .tar
`docker save -o nama-aplikasi-client-v1.tar nama-aplikasi-client:v1`

3. Pindahkan file nama-aplikasi-client-v1.tar, docker-compose.prod.yml, dan .env ke Flashdisk.

### 2. Eksekusi di Komputer Client (Offline)

1. Colok flashdisk ke komputer client yang sudah terpasang Docker Runtime.

2. Buka terminal di dalam flashdisk tersebut, lalu masukkan image:
`docker load -i nama-aplikasi-client-v1.tar`
3. Nyalakan aplikasi menggunakan compose khusus production 
`docker compose -f docker-compose.prod.yml up -d`


### 3. SEEDING & TESTING API
1. Add User (Manual)
Tambahkan user baru ke DBMS PostgreSQL Anda (baik lokal maupun cloud) menggunakan password ter-enkripsi bcrypt (10 rounds).

2. Authentication (Get Token as Cookies)
```
Method: POST 
URL: http://localhost:3000/api/auth/login
Headers: Content-Type: application/json
Body (JSON):
{
  "email": "admin@email.com",
  "password": "123"
}
```
3. Testing Protected API
```
Method: GET
URL: http://localhost:3000/api/master/users
```