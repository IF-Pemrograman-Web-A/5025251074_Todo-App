<?php
// api/index.php - satu pintu masuk (router) untuk semua endpoint REST API
//
// URL: /api/v1/... (atau /api/... tanpa versi). Method HTTP menentukan aksi, path menentukan resource.
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../functions.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/todos.php';

ini_set('display_errors', '0'); // jangan bocorkan warning PHP ke body JSON
send_cors_headers();

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS') { http_response_code(204); exit; } // preflight CORS

try {
    // Pecah path: <base>/api/<rest>. <base> = folder aplikasi (bisa kosong)
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (!preg_match('#^(.*?)/api(?:/(.*))?$#', $path, $m)) throw new ApiException(404, 'Endpoint tidak ditemukan.');
    $base = rtrim($m[1], '/');
    $parts = array_values(array_filter(explode('/', trim($m[2] ?? '', '/')), 'strlen'));
    if (($parts[0] ?? '') === 'v1') array_shift($parts);

    // Method override: form multipart hanya bisa POST, jadi PUT/PATCH/DELETE bisa "dititipkan"
    // lewat header X-HTTP-Method-Override atau field _method.
    if ($method === 'POST') {
        $override = strtoupper($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? ($_POST['_method'] ?? ''));
        if (in_array($override, ['PUT', 'PATCH', 'DELETE'], true)) $method = $override;
    }

    $resource = $parts[0] ?? '';
    $rest = array_slice($parts, 1);

    switch ($resource) {
        case '':
            json_response(200, ['name' => 'Todo App REST API', 'version' => 'v1',
                                'endpoints' => ['POST /api/v1/auth/login', 'GET /api/v1/auth/me',
                                                'GET|POST /api/v1/todos', 'GET /api/v1/todos/shared',
                                                'GET|PUT|PATCH|DELETE /api/v1/todos/{id}']]);
        case 'auth':
            handle_auth($method, $rest);
            break;
        case 'todos':
            $user = require_auth();
            handle_todos($method, $rest, $user, $base);
            break;
        default:
            throw new ApiException(404, 'Endpoint tidak ditemukan.');
    }
} catch (ApiException $ex) {
    error_response($ex->getCode(), $ex->getMessage(), $ex->errors);
} catch (Throwable $ex) {
    error_log($ex->getMessage());
    error_response(500, 'Terjadi kesalahan pada server.');
}
