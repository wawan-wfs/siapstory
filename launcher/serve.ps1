# StorySiap native Windows fallback when Python is not installed.
# Uses .NET TCP loopback only; requires no administrator permission or modules.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$webRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'dist'))
$index = Join-Path $webRoot 'index.html'

if (-not (Test-Path -LiteralPath $index -PathType Leaf)) {
  Write-Host '[ERROR] dist\index.html tidak ditemukan!' -ForegroundColor Red
  Write-Host "Lokasi yang diperiksa: $index"
  Write-Host 'Ekstrak seluruh ZIP terlebih dahulu, lalu jalankan START-WINDOWS.bat.'
  exit 2
}

$listener = $null
$port = $null
foreach ($candidate in @(8000, 8001, 8002, 8003, 8004, 8005, 0)) {
  $possible = $null
  try {
    $possible = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, [int]$candidate)
    $possible.Start()
    $listener = $possible
    $port = $listener.LocalEndpoint.Port
    break
  } catch {
    if ($null -ne $possible) { try { $possible.Stop() } catch {} }
    Write-Host "[INFO] Port $candidate tidak tersedia, mencoba port lain..."
  }
}
if ($null -eq $listener) {
  Write-Host '[ERROR] Tidak bisa menjalankan server lokal.' -ForegroundColor Red
  exit 3
}

$url = "http://127.0.0.1:$port/"
Write-Host ''
Write-Host '====================================================='
Write-Host ' STORYSIAP — SERVER BERHASIL DIJALANKAN'
Write-Host '====================================================='
Write-Host " Folder web       : $webRoot"
Write-Host " BUKA ALAMAT INI : $url" -ForegroundColor Green
Write-Host " Studio           : ${url}studio.html"
Write-Host ' Tekan Ctrl+C untuk menghentikan server.'
Write-Host '====================================================='
Write-Host ''

if ($env:STORYSIAP_NO_BROWSER -ne '1') {
  try { Start-Process $url } catch { Write-Host "Buka alamat ini secara manual: $url" }
}

$types = @{
 '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8';
 '.mjs'='text/javascript; charset=utf-8'; '.js'='text/javascript; charset=utf-8';
 '.json'='application/json'; '.svg'='image/svg+xml'; '.webp'='image/webp';
 '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg';
 '.ico'='image/x-icon'; '.woff'='font/woff'; '.woff2'='font/woff2';
 '.mp4'='video/mp4'; '.webm'='video/webm'
}
$rootPrefix = $webRoot.TrimEnd([char[]]@('\','/')) + [System.IO.Path]::DirectorySeparatorChar

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $client.ReceiveTimeout = 10000
      $client.SendTimeout = 10000
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $line = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($line)) { continue }
      # Read headers until blank line; keep-alive requests are handled as separate connections.
      while ($true) {
        $header = $reader.ReadLine()
        if ([string]::IsNullOrEmpty($header)) { break }
      }
      $parts = $line -split ' '
      $method = $parts[0]
      $pathPart = $parts[1].Split('?')[0]
      $pathPart = [Uri]::UnescapeDataString($pathPart)
      if ($pathPart -eq '/') { $pathPart = '/index.html' }
      $relativePath = $pathPart.TrimStart([char[]]@('/','\')).Replace('/', [System.IO.Path]::DirectorySeparatorChar)
      $resolved = [System.IO.Path]::GetFullPath((Join-Path $webRoot $relativePath))
      $safe = $resolved.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)
      $status = '200 OK'
      $file = $null
      if ($method -ne 'GET' -and $method -ne 'HEAD') { $status = '405 Method Not Allowed' }
      elseif (-not $safe) { $status = '403 Forbidden' }
      elseif (-not [System.IO.File]::Exists($resolved)) { $status = '404 Not Found' }
      else { $file = $resolved }

      $bytes = [byte[]]@()
      $mime = 'text/plain; charset=utf-8'
      if ($file) {
        $ext = [System.IO.Path]::GetExtension($file).ToLowerInvariant()
        if ($types.ContainsKey($ext)) { $mime = $types[$ext] }
        else { $mime = 'application/octet-stream' }
        $bytes = [System.IO.File]::ReadAllBytes($file)
      } else {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes("StorySiap local server: $status")
      }
      $responseHeaders = "HTTP/1.1 $status`r`nContent-Type: $mime`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`nCache-Control: no-store`r`nX-Content-Type-Options: nosniff`r`n`r`n"
      $headBytes = [System.Text.Encoding]::ASCII.GetBytes($responseHeaders)
      $stream.Write($headBytes, 0, $headBytes.Length)
      if ($method -ne 'HEAD' -and $bytes.Length -gt 0) { $stream.Write($bytes, 0, $bytes.Length) }
      $stream.Flush()
      Write-Host "$method $pathPart — $status"
    } catch {
      Write-Host "[WARN] Koneksi ditutup: $($_.Exception.Message)"
    } finally {
      if ($null -ne $client) { $client.Close() }
    }
  }
} finally {
  $listener.Stop()
}
