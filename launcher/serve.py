#!/usr/bin/env python3
"""StorySiap local development server. No external dependencies required."""
from __future__ import annotations

import functools
import http.server
import os
from pathlib import Path
import sys
import threading
import webbrowser

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
HOST = '127.0.0.1'


class StorySiapHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.mjs': 'text/javascript; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
    }

    def end_headers(self):
        # Avoid stale files after updates, particularly 404s from a different site.
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        try:
            super().log_message(fmt, *args)
        except UnicodeError:
            pass


def launch():
    if not (DIST / 'index.html').is_file():
        print('[ERROR] File dist/index.html tidak ditemukan.', flush=True)
        print(f'Lokasi yang diperiksa: {DIST}', flush=True)
        print('Ekstrak ZIP seluruhnya, jangan menjalankan dari dalam ZIP.', flush=True)
        return 2

    handler = functools.partial(StorySiapHandler, directory=str(DIST))
    server = None
    for port in (8000, 8001, 8002, 8003, 8004, 8005, 0):
        try:
            server = http.server.ThreadingHTTPServer((HOST, port), handler)
            break
        except OSError:
            print(f'[INFO] Port {port} tidak tersedia, mencoba port lain...', flush=True)

    if server is None:
        print('[ERROR] Tidak berhasil membuka server lokal. Periksa firewall / antivirus.', flush=True)
        return 3

    chosen_port = server.server_address[1]
    url = f'http://{HOST}:{chosen_port}/'
    print('\n' + '=' * 52, flush=True)
    print(' STORYSIAP — SERVER BERHASIL DIJALANKAN', flush=True)
    print('=' * 52, flush=True)
    print(f' Folder web : {DIST}', flush=True)
    print(f' BUKA ALAMAT INI : {url}', flush=True)
    print(' Studio      : ' + url + 'studio.html', flush=True)
    print(' Tekan Ctrl+C di jendela ini untuk menghentikan server.', flush=True)
    print('=' * 52 + '\n', flush=True)

    # The port has already been bound; opening the browser cannot hit an
    # unrelated process holding the same port (the v4 launcher bug).
    if os.environ.get('STORYSIAP_NO_BROWSER') != '1':
        threading.Timer(0.35, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever(poll_interval=0.15)
    except KeyboardInterrupt:
        print('\nStorySiap dihentikan.', flush=True)
    finally:
        server.server_close()
    return 0


if __name__ == '__main__':
    sys.exit(launch())
