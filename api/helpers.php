<?php
// api/helpers.php - respons JSON, CORS, input body, JWT, dan autentikasi

function send_cors_headers(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = API_CORS_ORIGINS;
    if (in_array('*', $allowed, true)) {
        header('Access-Control-Allow-Origin: *');
    } elseif ($origin !== '' && in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    } else {
        return;
    }
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-HTTP-Method-Override');
    header('Access-Control-Max-Age: 600');
}

function json_response(int $status, $data, array $headers = []): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    foreach ($headers as $h) header($h);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function error_response(int $status, string $message, array $errors = [], array $headers = []): void {
    $body = ['error' => $message];
    if ($errors) $body['errors'] = $errors;
    json_response($status, $body, $headers);
}

// ---------- Input ----------

// Membaca body request: JSON (application/json) atau form (multipart / urlencoded).
function request_input(string $method): array {
    $ct = strtolower($_SERVER['CONTENT_TYPE'] ?? '');

    if (str_starts_with($ct, 'application/json')) {
        $raw = file_get_contents('php://input');
        if (trim($raw) === '') return [];
        $data = json_decode($raw, true);
        if (!is_array($data) || ($data !== [] && array_is_list($data))) {
            throw new ApiException(400, 'Body harus berupa JSON object yang valid.');
        }
        return $data;
    }

    if (str_starts_with($ct, 'multipart/form-data') || str_starts_with($ct, 'application/x-www-form-urlencoded')) {
        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') { // termasuk POST dengan method override
            $data = $_POST;
        } else { // PHP tidak mengisi $_POST untuk PUT/PATCH
            parse_str(file_get_contents('php://input'), $data);
        }
        unset($data['_method']);
        return $data;
    }

    $raw = file_get_contents('php://input');
    if (trim($raw) !== '') throw new ApiException(415, 'Content-Type harus application/json atau multipart/form-data.');
    return [];
}

function to_bool($v): bool {
    return $v === true || in_array(strtolower((string)$v), ['1', 'true', 'on', 'yes'], true);
}

// ---------- JWT (HS256) ----------

function b64url_encode(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function b64url_decode(string $s): string { return (string)base64_decode(strtr($s, '-_', '+/')); }

function jwt_encode(array $claims): string {
    $h = b64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $p = b64url_encode(json_encode($claims));
    $sig = b64url_encode(hash_hmac('sha256', "$h.$p", JWT_SECRET, true));
    return "$h.$p.$sig";
}

// Mengembalikan payload jika token valid, atau null.
function jwt_decode(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$h, $p, $s] = $parts;
    $header = json_decode(b64url_decode($h), true);
    if (!is_array($header) || ($header['alg'] ?? '') !== 'HS256') return null;
    $expected = b64url_encode(hash_hmac('sha256', "$h.$p", JWT_SECRET, true));
    if (!hash_equals($expected, $s)) return null;
    $payload = json_decode(b64url_decode($p), true);
    if (!is_array($payload) || ($payload['exp'] ?? 0) < time()) return null;
    return $payload;
}

function issue_token(array $user): string {
    $now = time();
    return jwt_encode(['sub' => (int)$user['id'], 'name' => $user['name'], 'iat' => $now, 'exp' => $now + JWT_TTL]);
}

function bearer_token(): ?string {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($h === '' && function_exists('apache_request_headers')) {
        foreach (apache_request_headers() as $k => $v) {
            if (strtolower($k) === 'authorization') { $h = $v; break; }
        }
    }
    return preg_match('/^Bearer\s+(\S+)$/i', $h, $m) ? $m[1] : null;
}

// Wajib login: mengembalikan ['id'=>..,'name'=>..] atau menjawab 401.
function require_auth(): array {
    $challenge = ['WWW-Authenticate: Bearer'];
    $token = bearer_token();
    if ($token === null) error_response(401, 'Autentikasi diperlukan. Kirim header Authorization: Bearer <token>.', [], $challenge);
    $payload = jwt_decode($token);
    if ($payload === null) error_response(401, 'Token tidak valid atau sudah kedaluwarsa.', [], $challenge);
    $user = find_user((int)$payload['sub']);
    if (!$user) error_response(401, 'User untuk token ini tidak ditemukan.', [], $challenge);
    return $user;
}
