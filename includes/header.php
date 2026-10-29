<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>To do List</title>
    <meta name="theme-color" content="#5C415D">
    <link rel="manifest" href="manifest.json">
    <link rel="icon" type="image/png" href="icons/icon-192.png">
    <link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <a href="#main-content" class="skip-to-content">Langsung ke konten utama</a>

    <header class="app-header" role="banner">
        <button id="install-button" class="btn-install" type="button" hidden>Install Aplikasi</button>
        <h1>To do List</h1>
        <button id="toggle-theme-btn" class="btn-theme" aria-label="Beralih ke Mode Gelap">Dark Mode</button>
    </header>

    <div id="offline-banner" class="offline-banner" role="status" hidden>
        Anda sedang offline. Perubahan data (tambah, ubah, hapus) membutuhkan koneksi internet.
    </div>
