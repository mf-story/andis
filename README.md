# Profil & Ruang Tulisan — Prof. Dr. H. Andi Sukri Syamsuri, S.Pd., M.Hum.

Situs profil akademik sekaligus media tulisan (pandangan, opini, dan gagasan).
Dibangun dengan **HTML/CSS/JS murni + server Node.js bawaan** (tanpa dependensi npm),
serta panel admin untuk menyunting seluruh konten dan mengelola tulisan.

## Menjalankan

1. Pastikan **Node.js** terpasang (https://nodejs.org).
2. Klik dua kali **`Jalankan Server.bat`**.
3. Buka di browser:
   - Situs   : http://localhost:5533
   - Tulisan : http://localhost:5533/tulisan.html
   - Admin   : http://localhost:5533/admin.html

Untuk membuka dari **HP** pada WiFi yang sama, jalankan **`Buka Akses HP.bat`**
(akan meminta izin administrator untuk membuka port 5533 di firewall).

## Login Admin

- Password default: **`admin123`** → **wajib diganti** lewat menu **Keamanan** di panel admin.

## Struktur

| Berkas | Fungsi |
| --- | --- |
| `index.html` / `main.js` | Halaman utama (profil) |
| `tulisan.html` / `tulisan.js` | Daftar semua tulisan + pencarian & filter |
| `artikel.html` / `artikel.js` | Halaman baca satu tulisan (`?slug=`) |
| `admin.html` / `admin.js` / `admin.css` | Panel admin (edit profil + kelola tulisan) |
| `style.css` | Tema tampilan (editorial: navy + emas, serif) |
| `server.js` | Server statis + API |
| `data/content.json` | Sumber konten profil |
| `data/articles.json` | Kumpulan tulisan |
| `uploads/` | Gambar yang diunggah dari admin |

## Fitur Panel Admin

- **Profil**: menyunting seluruh bagian (hero, tentang, perjalanan, pendidikan,
  keilmuan & karya, kontak) termasuk foto profil dan editor teks kaya.
- **Tulisan**: membuat, menyunting, menerbitkan/menyimpan sebagai draf, dan
  menghapus tulisan; setiap tulisan punya halaman baca sendiri.
- **Sinkron Scholar** (opsional): mengambil jumlah publikasi/sitasi/h-index bila
  URL Google Scholar diisi pada bagian Karya.
- **Keamanan**: mengganti password admin.

## Catatan

Sebagian data profil masih berupa **contoh** dan sebaiknya disunting melalui panel
admin agar sesuai dengan biodata resmi.

## Deploy ke Railway (online)

Server sudah siap untuk Railway: mengikat ke `0.0.0.0`, membaca `process.env.PORT`,
tanpa dependensi npm, dan mendukung **Volume** agar konten & foto tetap tersimpan.

### 1. Siapkan kode di GitHub
1. Buat akun/GitHub repo baru (mis. `profil-andi-sukri`).
2. Dari folder proyek, unggah kode:
   ```powershell
   git init
   git add .
   git commit -m "Profil Prof. Andi Sukri Syamsuri"
   git branch -M main
   git remote add origin https://github.com/USERNAME/profil-andi-sukri.git
   git push -u origin main
   ```
   (Berkas pribadi seperti CV `.pdf`, `.docx`, dan foto asli `DSC00202.jpg` sudah
   diabaikan lewat `.gitignore` sehingga tidak ikut terunggah.)

### 2. Buat proyek di Railway
1. Masuk ke https://railway.app → **New Project** → **Deploy from GitHub repo** →
   pilih repo tadi. Railway otomatis mendeteksi Node.js dan menjalankan `node server.js`.
2. Tunggu proses build & deploy selesai.

### 3. Tambahkan Volume (agar data tidak hilang saat deploy ulang) — PENTING
1. Di service Railway → tab **Variables**, tambahkan:
   - `DATA_DIR` = `/data`
   - `UPLOADS_DIR` = `/data/uploads`
2. Di tab **Settings → Volumes** (atau **+ Volume**), buat Volume dengan
   **Mount path** = `/data`.
3. Deploy ulang. Saat pertama jalan, server menyalin konten awal (`content.json`,
   `articles.json`) dan foto profil ke Volume. Selanjutnya semua perubahan lewat
   panel admin (teks, foto, tulisan, password) **tersimpan permanen**.

### 4. Selesai
- Railway memberi domain publik (mis. `namaproyek.up.railway.app`).
- Buka `https://domain-anda/` untuk situs dan `https://domain-anda/admin.html`
  untuk admin. **Segera ganti password** admin (default `admin123`) di menu Keamanan.

> Tanpa Volume, situs tetap tampil dengan konten awal, tetapi perubahan lewat admin
> akan hilang setiap kali aplikasi di-deploy ulang. Karena itu Volume sangat disarankan.

### Alternatif: Railway CLI
```powershell
npm i -g @railway/cli
railway login
railway init
railway up
```
Lalu tetap tambahkan Variables + Volume seperti langkah 3 di atas.

