<?php
$isEdit = $editTodo !== null;
$f = $editTodo ?? ['id' => '', 'title' => '', 'description' => '', 'status' => 'pending',
                   'visibility' => $page, 'notify_time' => null, 'image' => null];
$notifyVal = $f['notify_time'] ? date('Y-m-d\TH:i', strtotime($f['notify_time'])) : '';
?>
<main id="main-content" class="container" tabindex="-1">

    <section class="left-panel" aria-labelledby="heading-todo-list">
        <h2 id="heading-todo-list">Daftar Todo <?= $page === 'shared' ? 'Bersama' : 'Pribadi' ?></h2>

        <?php if ($flash): ?>
            <div class="flash <?= e($flash[0]) ?>" role="status"><?= e($flash[1]) ?></div>
        <?php endif; ?>

        <ul id="todo-list" class="todo-list" aria-live="polite">
        <?php if (!$todos): ?>
            <li class="empty">Belum ada tugas. Tambahkan tugas baru di panel editor.</li>
        <?php endif; ?>

        <?php foreach ($todos as $t):
            $mine = (int)$t['user_id'] === $uid;
            $done = $t['status'] === 'completed'; ?>
            <li class="todo-item <?= $done ? 'completed-item' : '' ?> <?= $mine ? '' : 'readonly' ?>"
                <?php if ($t['notify_time']): ?>data-notify="<?= e($t['notify_time']) ?>" data-title="<?= e($t['title']) ?>" data-desc="<?= e($t['description']) ?>"<?php endif; ?>>

                <?php if ($mine): ?>
                <form method="post" action="actions.php" class="toggle-form">
                    <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                    <input type="hidden" name="page" value="<?= e($page) ?>">
                    <input type="hidden" name="action" value="toggle">
                    <input type="hidden" name="id" value="<?= (int)$t['id'] ?>">
                    <input type="checkbox" class="todo-checkbox" <?= $done ? 'checked' : '' ?> onchange="this.form.submit()"
                           aria-label="Tandai <?= e($t['title']) ?> sebagai <?= $done ? 'belum selesai' : 'selesai' ?>">
                </form>
                <?php else: ?>
                <input type="checkbox" class="todo-checkbox" <?= $done ? 'checked' : '' ?> disabled
                       aria-label="Status <?= e($t['title']) ?> (hanya pemilik yang dapat mengubah)">
                <?php endif; ?>

                <div class="todo-details">
                    <?php if ($mine): ?>
                        <a class="todo-title" href="index.php?page=<?= e($page) ?>&edit=<?= (int)$t['id'] ?>#form-title"><?= e($t['title']) ?></a>
                    <?php else: ?>
                        <span class="todo-title"><?= e($t['title']) ?></span>
                    <?php endif; ?>

                    <?php if ($page === 'shared'): ?>
                        <span class="todo-notify-info">Oleh <?= e($t['owner']) ?></span>
                    <?php endif; ?>
                    <?php if ($t['description']): ?>
                        <span class="todo-notify-info"><?= e($t['description']) ?></span>
                    <?php endif; ?>
                    <?php if ($t['notify_time']): ?>
                        <span class="todo-notify-info">⏰ Pengingat: <?= e(date('d/m/Y H.i', strtotime($t['notify_time']))) ?></span>
                    <?php endif; ?>
                    <?php if ($t['image']): ?>
                        <img src="<?= e(UPLOAD_URL . $t['image']) ?>" alt="Lampiran untuk <?= e($t['title']) ?>" class="todo-thumbnail">
                    <?php endif; ?>
                </div>

                <span class="badge <?= e($t['status']) ?>"><?= $done ? 'Selesai' : 'Belum Selesai' ?></span>
            </li>
        <?php endforeach; ?>
        </ul>
    </section>

    <aside class="right-panel" aria-labelledby="form-title">
        <h2 id="form-title"><?= $isEdit ? 'Edit Todo' : 'Editor Todo' ?></h2>

        <form id="editor-form" class="editor-form" method="post" action="actions.php" enctype="multipart/form-data">
            <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
            <input type="hidden" name="page" value="<?= e($page) ?>">
            <input type="hidden" name="id" value="<?= (int)$f['id'] ?>">

            <div class="form-group-vertical">
                <label for="edit-title">Judul Todo <span class="required">*</span></label>
                <input type="text" id="edit-title" name="title" maxlength="150" required aria-required="true"
                       placeholder="Masukkan judul tugas..." value="<?= e($f['title']) ?>">
            </div>

            <div class="form-group-vertical">
                <label for="edit-desc">Deskripsi</label>
                <textarea id="edit-desc" name="description" rows="3" placeholder="Masukkan deskripsi tugas..."><?= e($f['description']) ?></textarea>
            </div>

            <div class="form-group-vertical">
                <label for="edit-status">Status</label>
                <select id="edit-status" name="status">
                    <option value="pending" <?= $f['status'] === 'pending' ? 'selected' : '' ?>>Belum Selesai</option>
                    <option value="completed" <?= $f['status'] === 'completed' ? 'selected' : '' ?>>Selesai</option>
                </select>
            </div>

            <div class="form-group-vertical">
                <label for="edit-visibility">Kategori</label>
                <select id="edit-visibility" name="visibility">
                    <option value="personal" <?= $f['visibility'] === 'personal' ? 'selected' : '' ?>>Personal (hanya saya)</option>
                    <option value="shared" <?= $f['visibility'] === 'shared' ? 'selected' : '' ?>>Shared (terlihat semua)</option>
                </select>
            </div>

            <div class="form-group-vertical media-section">
                <label>Lampiran Gambar / Ambil Foto</label>
                <div class="camera-controls">
                    <button type="button" id="btn-start-camera" class="btn-secondary">Buka Kamera</button>
                    <button type="button" id="btn-capture" class="btn-secondary" style="display:none;">Ambil Foto</button>
                </div>
                <video id="camera-video" autoplay playsinline style="display:none;" title="Pratinjau Kamera"></video>
                <canvas id="camera-canvas" style="display:none;"></canvas>

                <div class="file-fallback">
                    <label for="edit-image-file" class="file-label">Atau unggah file gambar (maks. 2 MB):</label>
                    <input type="file" id="edit-image-file" name="image" accept="image/*">
                </div>

                <div id="image-preview-container" class="image-preview-container" style="display:<?= $f['image'] ? 'flex' : 'none' ?>;">
                    <img id="image-preview" src="<?= $f['image'] ? e(UPLOAD_URL . $f['image']) : '' ?>" alt="Pratinjau lampiran todo">
                    <button type="button" id="btn-remove-image" class="btn-danger-sm">Hapus Gambar</button>
                </div>
                <input type="hidden" name="remove_image" id="remove-image" value="">
            </div>

            <div class="form-group-vertical">
                <label for="edit-notify-time">Waktu Pengingat Notifikasi</label>
                <input type="datetime-local" id="edit-notify-time" name="notify_time" value="<?= e($notifyVal) ?>">
            </div>

            <div class="button-group">
                <?php if ($isEdit): ?>
                    <button type="submit" name="action" value="update" class="btn-save">Simpan Perubahan</button>
                    <button type="submit" name="action" value="delete" class="btn-delete" formnovalidate
                            onclick="return confirm('Hapus todo ini?')">Hapus</button>
                    <a href="index.php?page=<?= e($page) ?>" class="btn-cancel">Batal</a>
                <?php else: ?>
                    <button type="submit" name="action" value="create" class="btn-add">+ Tambah Todo</button>
                <?php endif; ?>
            </div>
        </form>
    </aside>
</main>
