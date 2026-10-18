<?php
// functions.php - query database & file handling

function get_users(): array {
    return db()->query('SELECT id, name FROM users ORDER BY id')->fetchAll();
}

function get_todos(string $page, int $uid): array {
    if ($page === 'shared') {
        $sql = "SELECT t.*, u.name AS owner FROM todos t JOIN users u ON u.id = t.user_id
                WHERE t.visibility = 'shared' ORDER BY t.created_at DESC, t.id DESC";
        return db()->query($sql)->fetchAll();
    }
    $st = db()->prepare("SELECT t.*, u.name AS owner FROM todos t JOIN users u ON u.id = t.user_id
                         WHERE t.visibility = 'personal' AND t.user_id = ? ORDER BY t.created_at DESC, t.id DESC");
    $st->execute([$uid]);
    return $st->fetchAll();
}

function get_todo(int $id): ?array {
    $st = db()->prepare('SELECT * FROM todos WHERE id = ?');
    $st->execute([$id]);
    return $st->fetch() ?: null;
}

// Validasi & simpan file upload. Mengembalikan nama file, atau null jika tidak ada file.
function save_upload(array $file): ?string {
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) return null;
    if ($file['error'] !== UPLOAD_ERR_OK) throw new RuntimeException('Upload gambar gagal.');
    if ($file['size'] > MAX_UPLOAD_BYTES) throw new RuntimeException('Ukuran gambar maksimal 2 MB.');

    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif', 'image/webp' => 'webp'];
    if (!isset($allowed[$mime])) throw new RuntimeException('Format gambar harus JPG, PNG, GIF, atau WebP.');

    if (!is_dir(UPLOAD_DIR)) mkdir(UPLOAD_DIR, 0755, true);
    $name = bin2hex(random_bytes(8)) . '.' . $allowed[$mime];
    if (!move_uploaded_file($file['tmp_name'], UPLOAD_DIR . $name)) {
        throw new RuntimeException('Gagal menyimpan gambar.');
    }
    return $name;
}

function delete_image(?string $name): void {
    if ($name && preg_match('/^[a-f0-9]{16}\.(jpg|png|gif|webp)$/', $name)) {
        $path = UPLOAD_DIR . $name;
        if (is_file($path)) unlink($path);
    }
}
