<?php
// api/auth.php - POST /api/v1/auth/login, GET /api/v1/auth/me

function handle_auth(string $method, array $parts): void {
    $action = $parts[0] ?? '';

    if ($action === 'login') {
        if ($method !== 'POST') error_response(405, 'Method tidak diizinkan.', [], ['Allow: POST']);
        $in = request_input($method);
        $errors = [];
        $name = is_string($in['name'] ?? null) ? trim($in['name']) : '';
        $password = is_string($in['password'] ?? null) ? $in['password'] : '';
        if ($name === '') $errors['name'] = 'Nama user wajib diisi.';
        if ($password === '') $errors['password'] = 'Password wajib diisi.';
        if ($errors) error_response(400, 'Data tidak valid.', $errors);

        $user = find_user_by_name($name);
        // Pesan sama untuk user tidak ada / password salah agar tidak membocorkan daftar user
        if (!$user || !password_verify($password, $user['password_hash'])) {
            error_response(401, 'Nama atau password salah.');
        }
        json_response(200, [
            'token' => issue_token($user),
            'token_type' => 'Bearer',
            'expires_in' => JWT_TTL,
            'user' => ['id' => (int)$user['id'], 'name' => $user['name']],
        ]);
    }

    if ($action === 'me' && count($parts) === 1) {
        if ($method !== 'GET') error_response(405, 'Method tidak diizinkan.', [], ['Allow: GET']);
        $u = require_auth();
        json_response(200, ['id' => (int)$u['id'], 'name' => $u['name']]);
    }

    error_response(404, 'Endpoint tidak ditemukan.');
}
