<?php
// router.php - untuk PHP built-in server:  php -S localhost:8000 router.php
// Meneruskan setiap request /api/... ke api/index.php; file lain disajikan apa adanya.
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('#^/api(/|$)#', $path)) {
    require __DIR__ . '/api/index.php';
    return true;
}
return false;
