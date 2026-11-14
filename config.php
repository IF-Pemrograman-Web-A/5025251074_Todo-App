<?php

define('DB_HOST', 'localhost');
define('DB_NAME', 'todo_app');
define('DB_USER', 'root');
define('DB_PASS', '');

define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('UPLOAD_URL', 'uploads/');
define('MAX_UPLOAD_BYTES', 2 * 1024 * 1024);

// JWT (HS256). Ganti secret di server produksi, atau set environment variable TODO_JWT_SECRET.
define('JWT_SECRET', getenv('TODO_JWT_SECRET') ?: 'k9Xv2mQp7Lr4TnZ8wBj5YdHc3FsA6UeG1oVi0xRt');
define('JWT_TTL', 2 * 60 * 60); // masa berlaku token: 2 jam

// CORS: daftar origin yang boleh memanggil API dari browser. '*' = semua origin.
// Untuk produksi isi dengan domain frontend, mis. ['https://domain-a.com'].
define('API_CORS_ORIGINS', ['*']);

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER, DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );
    }
    return $pdo;
}

function e($v): string { return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); }
