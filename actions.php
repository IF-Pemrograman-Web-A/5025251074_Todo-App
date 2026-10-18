<?php
// actions.php - handler CRUD (Create, Update, Delete, toggle status) & ganti pengguna
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') redirect('index.php');

$page = ($_POST['page'] ?? 'personal') === 'shared' ? 'shared' : 'personal';

if (!hash_equals(csrf_token(), $_POST['csrf'] ?? '')) {
    flash('error', 'Sesi tidak valid. Muat ulang halaman lalu coba lagi.');
    redirect("index.php?page=$page");
}

$uid = current_user_id();
$action = $_POST['action'] ?? '';

// Ambil todo milik user saat ini (hanya pemilik yang boleh mengubah)
function owned_todo(int $id, int $uid): array {
    $t = get_todo($id);
    if (!$t || (int)$t['user_id'] !== $uid) throw new RuntimeException('Todo tidak ditemukan atau bukan milik Anda.');
    return $t;
}

try {
    switch ($action) {
        case 'switch_user':
            $newId = (int)($_POST['user_id'] ?? 0);
            $st = db()->prepare('SELECT id FROM users WHERE id = ?');
            $st->execute([$newId]);
            if ($st->fetch()) $_SESSION['user_id'] = $newId;
            break;

        case 'create':
        case 'update':
            $title = trim($_POST['title'] ?? '');
            if ($title === '') throw new RuntimeException('Judul todo wajib diisi.');
            $desc = trim($_POST['description'] ?? '');
            $status = ($_POST['status'] ?? '') === 'completed' ? 'completed' : 'pending';
            $vis = ($_POST['visibility'] ?? '') === 'shared' ? 'shared' : 'personal';
            $notify = trim($_POST['notify_time'] ?? '');
            $notify = $notify !== '' ? str_replace('T', ' ', $notify) . ':00' : null;
            if ($notify && !strtotime($notify)) $notify = null;

            if ($action === 'create') {
                $image = save_upload($_FILES['image'] ?? []);
                db()->prepare('INSERT INTO todos (user_id, title, description, status, visibility, notify_time, image)
                               VALUES (?,?,?,?,?,?,?)')
                    ->execute([$uid, $title, $desc, $status, $vis, $notify, $image]);
                flash('success', 'Todo berhasil ditambahkan.');
            } else {
                $old = owned_todo((int)($_POST['id'] ?? 0), $uid);
                $image = $old['image'];
                $new = save_upload($_FILES['image'] ?? []);
                if ($new) { delete_image($old['image']); $image = $new; }
                elseif (!empty($_POST['remove_image'])) { delete_image($old['image']); $image = null; }

                db()->prepare('UPDATE todos SET title=?, description=?, status=?, visibility=?, notify_time=?, image=? WHERE id=?')
                    ->execute([$title, $desc, $status, $vis, $notify, $image, $old['id']]);
                flash('success', 'Perubahan berhasil disimpan.');
            }
            break;

        case 'delete':
            $old = owned_todo((int)($_POST['id'] ?? 0), $uid);
            delete_image($old['image']);
            db()->prepare('DELETE FROM todos WHERE id = ?')->execute([$old['id']]);
            flash('success', 'Todo berhasil dihapus.');
            break;

        case 'toggle':
            $old = owned_todo((int)($_POST['id'] ?? 0), $uid);
            $newStatus = $old['status'] === 'completed' ? 'pending' : 'completed';
            db()->prepare('UPDATE todos SET status = ? WHERE id = ?')->execute([$newStatus, $old['id']]);
            break;
    }
} catch (RuntimeException $ex) {
    flash('error', $ex->getMessage());
} catch (Throwable $ex) {
    error_log($ex->getMessage());
    flash('error', 'Terjadi kesalahan pada server.');
}

redirect("index.php?page=$page");
