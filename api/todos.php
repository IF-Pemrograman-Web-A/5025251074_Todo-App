<?php
// api/todos.php - resource /api/v1/todos
//
//   GET    /todos            daftar todo personal milik user login   (?status=pending|completed)
//   GET    /todos/shared     daftar semua todo shared                (?status=...)
//   GET    /todos/{id}       satu todo
//   POST   /todos            buat todo           -> 201 Created
//   PUT    /todos/{id}       ganti seluruh field -> 200
//   PATCH  /todos/{id}       ubah sebagian field -> 200
//   DELETE /todos/{id}       hapus               -> 200

function format_todo(array $t, int $uid, string $base): array {
    return [
        'id'          => (int)$t['id'],
        'user_id'     => (int)$t['user_id'],
        'owner'       => $t['owner'] ?? null,
        'title'       => $t['title'],
        'description' => $t['description'] ?? '',
        'status'      => $t['status'],
        'visibility'  => $t['visibility'],
        'notify_time' => $t['notify_time'],
        'image'       => $t['image'],
        'image_url'   => $t['image'] ? $base . '/' . UPLOAD_URL . $t['image'] : null,
        'created_at'  => $t['created_at'],
        'is_owner'    => (int)$t['user_id'] === $uid,
    ];
}

function handle_todos(string $method, array $parts, array $user, string $base): void {
    $uid = (int)$user['id'];
    $first = $parts[0] ?? null;

    // ----- Koleksi: /todos dan /todos/shared -----
    if ($first === null || $first === 'shared') {
        if (count($parts) > 1) error_response(404, 'Endpoint tidak ditemukan.');
        $scope = $first === 'shared' ? 'shared' : 'personal';

        if ($method === 'GET') {
            $status = $_GET['status'] ?? null;
            if ($status !== null && !in_array($status, ['pending', 'completed'], true)) {
                error_response(400, 'Parameter status tidak valid.', ['status' => 'Gunakan pending atau completed.']);
            }
            $rows = get_todos($scope, $uid, $status);
            json_response(200, array_map(fn($t) => format_todo($t, $uid, $base), $rows));
        }

        if ($method === 'POST' && $scope === 'personal') {
            $in = request_input($method);
            $fields = validate_todo_input($in, false) + [
                'description' => '', 'status' => 'pending', 'visibility' => 'personal', 'notify_time' => null,
            ];
            $image = save_upload($_FILES['image'] ?? null);
            try {
                db()->prepare('INSERT INTO todos (user_id, title, description, status, visibility, notify_time, image)
                               VALUES (?,?,?,?,?,?,?)')
                    ->execute([$uid, $fields['title'], $fields['description'], $fields['status'],
                               $fields['visibility'], $fields['notify_time'], $image]);
            } catch (Throwable $ex) {
                delete_image($image);
                throw $ex;
            }
            $id = (int)db()->lastInsertId();
            json_response(201, format_todo(get_todo($id), $uid, $base), ["Location: $base/api/v1/todos/$id"]);
        }

        error_response(405, 'Method tidak diizinkan.', [], [$scope === 'shared' ? 'Allow: GET' : 'Allow: GET, POST']);
    }

    // ----- Satu resource: /todos/{id} -----
    if (!ctype_digit($first) || count($parts) > 1) error_response(404, 'Endpoint tidak ditemukan.');
    $id = (int)$first;
    if (!in_array($method, ['GET', 'PUT', 'PATCH', 'DELETE'], true)) {
        error_response(405, 'Method tidak diizinkan.', [], ['Allow: GET, PUT, PATCH, DELETE']);
    }

    $todo = get_todo($id);
    if (!$todo) error_response(404, 'Todo tidak ditemukan.');

    $isOwner = (int)$todo['user_id'] === $uid;
    if ($method === 'GET') {
        if (!$isOwner && $todo['visibility'] !== 'shared') error_response(403, 'Todo personal milik user lain.');
        json_response(200, format_todo($todo, $uid, $base));
    }
    if (!$isOwner) error_response(403, 'Hanya pemilik yang boleh mengubah atau menghapus todo ini.');

    if ($method === 'DELETE') {
        db()->prepare('DELETE FROM todos WHERE id = ?')->execute([$id]);
        delete_image($todo['image']);
        json_response(200, ['message' => 'Todo berhasil dihapus.', 'id' => $id]);
    }

    // PUT / PATCH
    $in = request_input($method);
    $isPatch = $method === 'PATCH';
    $fields = validate_todo_input($in, $isPatch);
    if (!$isPatch) { // PUT = ganti penuh: field yang tidak dikirim kembali ke default
        $fields += ['description' => '', 'status' => 'pending', 'visibility' => 'personal', 'notify_time' => null];
    }

    $newImage = save_upload($_FILES['image'] ?? null);
    $imageChanged = false;
    $image = $todo['image'];
    if ($newImage !== null) { $image = $newImage; $imageChanged = true; }
    elseif (to_bool($in['remove_image'] ?? false)) { $image = null; $imageChanged = true; }

    if (!$fields && !$imageChanged) error_response(400, 'Tidak ada field yang diubah.');
    if ($imageChanged) $fields['image'] = $image;

    $sets = implode(', ', array_map(fn($k) => "$k = ?", array_keys($fields)));
    try {
        db()->prepare("UPDATE todos SET $sets WHERE id = ?")->execute([...array_values($fields), $id]);
    } catch (Throwable $ex) {
        delete_image($newImage);
        throw $ex;
    }
    if ($imageChanged) delete_image($todo['image']);

    json_response(200, format_todo(get_todo($id), $uid, $base));
}
