# STORYSIAP v4 — Cinematic Motion Experience

## Perubahan yang dilakukan

- Refactor pengalaman landing page dengan kinetic scroll marquee, animasi yang menanggapi posisi scroll (scrubbing), section parallax, depth, live pointer dan multi-layer hover treatments.
- Tambah rail navigasi perjalanan desktop untuk 9 bagian dan penanda bab aktif.
- Auto-scroll **OFF by default**, toggle ikon play/pause di kanan bawah tepat di atas tombol panah kembali ke atas, ring progres, mode Alir / Bab, opsi kecepatan Santai / Normal / Cepat, auto-pause saat interaksi manual atau pindah tab, preferensi lokal.
- Tombol **MOTION ON/OFF** untuk mematikan dekorasi animasi, dengan penghormatan terhadap preferensi reduced motion OS.
- Tambah segmen perbandingan warna swipe/drag/keyboard interaktif. Tidak mengklaim restorasi atau peningkatan resolusi.
- Tambah tiga fitur Creative Studio yang ikut ekspor: warmth, film grain, cinematic vignette. Kode sanitizer mengamankan nilai, preset dan undo/redo tetap terintegrasi.
- Semua file dapat dijalankan di hosting statis tanpa bundler, npm, API berbayar, atau CDN.

## Audit

- 43 tes Node.js lulus (43 pass, 0 fail).
- Chromium desktop 1440×900 dan mobile 390×844: 0 horizontal overflow, 0 JavaScript runtime error pada interaksi yang diuji.
- Tersimulasikan: start/pause auto-scroll, ganti mode/kecepatan, slider before/after, motion toggle, menu mobile.
- Studio diuji dengan foto contoh, ketiga kontrol finishing, lalu ekspor WebP sukses 936×1664.

## Menjalankan

Windows: ekstrak ZIP, jalankan `START-WINDOWS.bat`, buka `http://localhost:8000`.
Manual: `py -m http.server 8000 --directory dist` dan `node --test tests/*.test.mjs`.

## Batasan

WebGL perangkat fisik, ekspor video MP4/H.264/AAC, dan hasil unggahan WhatsApp/Instagram tidak diuji dalam paket ini. Kualitas unggahan tetap dipengaruhi platform dan sumber media.
