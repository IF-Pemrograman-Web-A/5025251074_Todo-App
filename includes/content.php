<main id="main-content" class="container" tabindex="-1" data-page="<?= e($page) ?>">

    <section class="left-panel" aria-labelledby="heading-todo-list">
        <h2 id="heading-todo-list">Daftar Todo <?= $page === 'shared' ? 'Bersama' : 'Pribadi' ?></h2>

        <div id="flash" class="flash" role="status" hidden></div>

        <ul id="todo-list" class="todo-list" aria-live="polite">
            <li class="empty">Silakan masuk untuk melihat todo.</li>
        </ul>
    </section>

    <aside class="right-panel" aria-labelledby="form-title">
        <h2 id="form-title">Editor Todo</h2>

        <form id="editor-form" class="editor-form" enctype="multipart/form-data">
            <input type="hidden" id="edit-id" value="">

            <div class="form-group-vertical">
                <label for="edit-title">Judul Todo <span class="required">*</span></label>
                <input type="text" id="edit-title" name="title" maxlength="150" required aria-required="true"
                       placeholder="Masukkan judul tugas...">
            </div>

            <div class="form-group-vertical">
                <label for="edit-desc">Deskripsi</label>
                <textarea id="edit-desc" name="description" rows="3" placeholder="Masukkan deskripsi tugas..."></textarea>
            </div>

            <div class="form-group-vertical">
                <label for="edit-status">Status</label>
                <select id="edit-status" name="status">
                    <option value="pending">Belum Selesai</option>
                    <option value="completed">Selesai</option>
                </select>
            </div>

            <div class="form-group-vertical">
                <label for="edit-visibility">Kategori</label>
                <select id="edit-visibility" name="visibility">
                    <option value="personal">Personal (hanya saya)</option>
                    <option value="shared">Shared (terlihat semua)</option>
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

                <div id="image-preview-container" class="image-preview-container" style="display:none;">
                    <img id="image-preview" src="" alt="Pratinjau lampiran todo">
                    <button type="button" id="btn-remove-image" class="btn-danger-sm">Hapus Gambar</button>
                </div>
                <input type="hidden" name="remove_image" id="remove-image" value="">
            </div>

            <div class="form-group-vertical">
                <label for="edit-notify-time">Waktu Pengingat Notifikasi</label>
                <input type="datetime-local" id="edit-notify-time" name="notify_time">
            </div>

            <div class="button-group">
                <button type="submit" id="btn-submit" class="btn-add">+ Tambah Todo</button>
                <button type="button" id="btn-delete" class="btn-delete" hidden>Hapus</button>
                <button type="button" id="btn-cancel" class="btn-cancel" hidden>Batal</button>
            </div>
        </form>
    </aside>
</main>
