<?php
// functions.php - akses database, validasi, & penanganan file (dipakai oleh API)

// Exception yang membawa HTTP status code; ditangkap di api/index.php
class ApiException extends RuntimeException {
    public array $errors;
    public function __construct(int $status, string $message, array $errors = []) {
        parent::__construct($message, $status);
        $this->errors = $errors;
    }
}

function get_users(): array {
    return db()->query('SELECT id, name FROM users ORDER BY id')->fetchAll();
}

function find_user(int $id): ?array {
    $st = db()->prepare('SELECT id, name FROM users WHERE id = ?');
    $st->execute([$id]);
    return $st->fetch() ?: null;
}

function find_user_by_name(string $name): ?array {
    $st = db()->prepare('SELECT id, name, password_hash FROM users WHERE name = ?');
    $st->execute([$name]);
    return $st->fetch() ?: null;
}

// $scope: 'personal' (milik user) atau 'shared' (semua todo yang dibagikan). $status: filter opsional.
function get_todos(string $scope, int $uid, ?string $status = null): array {
    $params = [];
    if ($scope === 'shared') {
        $where = "t.visibility = 'shared'";
    } else {
        $where = "t.visibility = 'personal' AND t.user_id = ?";
        $params[] = $uid;
    }
    if ($status !== null) {
        $where .= ' AND t.status = ?';
        $params[] = $status;
    }
    $st = db()->prepare("SELECT t.*, u.name AS owner FROM todos t JOIN users u ON u.id = t.user_id
                         WHERE $where ORDER BY t.created_at DESC, t.id DESC");
    $st->execute($params);
    return $st->fetchAll();
}

function get_todo(int $id): ?array {
    $st = db()->prepare('SELECT t.*, u.name AS owner FROM todos t JOIN users u ON u.id = t.user_id WHERE t.id = ?');
    $st->execute([$id]);
    return $st->fetch() ?: null;
}

// Validasi & normalisasi input todo. $partial=true -> hanya field yang dikirim (PATCH).
// Mengembalikan array field DB yang valid; melempar ApiException(400) jika ada yang salah.
function validate_todo_input(array $in, bool $partial): array {
    $errors = [];
    $out = [];

    if (array_key_exists('title', $in)) {
        $title = is_string($in['title']) ? trim($in['title']) : '';
        if ($title === '') $errors['title'] = 'Judul todo wajib diisi.';
        elseif (mb_strlen($title) > 150) $errors['title'] = 'Judul maksimal 150 karakter.';
        else $out['title'] = $title;
    } elseif (!$partial) {
        $errors['title'] = 'Judul todo wajib diisi.';
    }

    if (array_key_exists('description', $in)) {
        if ($in['description'] !== null && !is_string($in['description'])) $errors['description'] = 'Deskripsi harus berupa teks.';
        else $out['description'] = trim((string)$in['description']);
    }

    foreach (['status' => ['pending', 'completed'], 'visibility' => ['personal', 'shared']] as $field => $allowed) {
        if (array_key_exists($field, $in)) {
            if (!is_string($in[$field]) || !in_array($in[$field], $allowed, true)) {
                $errors[$field] = "$field harus salah satu dari: " . implode(', ', $allowed) . '.';
            } else {
                $out[$field] = $in[$field];
            }
        }
    }

    if (array_key_exists('notify_time', $in)) {
        $raw = $in['notify_time'];
        if ($raw === null || $raw === '') {
            $out['notify_time'] = null;
        } else {
            $dt = false;
            if (is_string($raw)) {
                foreach (['Y-m-d\TH:i', 'Y-m-d\TH:i:s', 'Y-m-d H:i', 'Y-m-d H:i:s'] as $fmt) {
                    $dt = DateTime::createFromFormat('!' . $fmt, $raw);
                    if ($dt && $dt->format($fmt) === $raw) break;
                    $dt = false;
                }
            }
            if (!$dt) $errors['notify_time'] = 'Format notify_time tidak valid (gunakan YYYY-MM-DD HH:MM).';
            else $out['notify_time'] = $dt->format('Y-m-d H:i:s');
        }
    }

    if ($errors) throw new ApiException(400, 'Data tidak valid.', $errors);
    return $out;
}

// Validasi & simpan file upload. Mengembalikan nama file, atau null jika tidak ada file.
function save_upload(?array $file): ?string {
    if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) return null;
    if (in_array($file['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
        throw new ApiException(413, 'Ukuran gambar maksimal 2 MB.', ['image' => 'Ukuran gambar maksimal 2 MB.']);
    }
    if ($file['error'] !== UPLOAD_ERR_OK) throw new ApiException(400, 'Upload gambar gagal.', ['image' => 'Upload gambar gagal.']);
    if ($file['size'] > MAX_UPLOAD_BYTES) {
        throw new ApiException(413, 'Ukuran gambar maksimal 2 MB.', ['image' => 'Ukuran gambar maksimal 2 MB.']);
    }

    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif', 'image/webp' => 'webp'];
    if (!isset($allowed[$mime])) {
        throw new ApiException(415, 'Format gambar harus JPG, PNG, GIF, atau WebP.', ['image' => 'Format gambar tidak didukung.']);
    }

    if (!is_dir(UPLOAD_DIR)) mkdir(UPLOAD_DIR, 0755, true);
    $name = bin2hex(random_bytes(8)) . '.' . $allowed[$mime];
    if (!move_uploaded_file($file['tmp_name'], UPLOAD_DIR . $name)) {
        throw new ApiException(500, 'Gagal menyimpan gambar.');
    }
    return $name;
}

function delete_image(?string $name): void {
    if ($name && preg_match('/^[a-f0-9]{16}\.(jpg|png|gif|webp)$/', $name)) {
        $path = UPLOAD_DIR . $name;
        if (is_file($path)) unlink($path);
    }
}
