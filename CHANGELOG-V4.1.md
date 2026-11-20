# StorySiap v4.1 — Windows Launcher & 404 Hotfix

- **Fixed:** Launcher v4 membuka `localhost:8000` sebelum proses server pasti berjalan. Jika port digunakan server lain, URL bisa mengarah ke server yang salah dan menampilkan 404.
- **Fixed:** Launcher kini memastikan file `dist/index.html` ada dan mengikat port sebelum membuka browser.
- **Fixed:** Menghindari konflik port dengan pemilihan otomatis 8000–8005 atau port bebas sistem.
- **Added:** PowerShell local static server sebagai fallback bawaan Windows (tidak wajib memasang Python).
- **Added:** `BUKA-STORYSIAP.bat` di folder luar untuk akses sekali klik.
- **Added:** Pesan URL aktual dan panduan jika port 8000 sibuk.
- **Unchanged:** UI, motion, auto-scroll, fitur Studio, aset, dan source pada v4; tidak ada pengurangan fitur.

PENTING: Setelah ekstraksi jalankan `BUKA-STORYSIAP.bat`. Alamat di browser **harus sama** dengan yang dicetak di CMD. Server hanya menerima koneksi dari komputer sendiri (`127.0.0.1`).
