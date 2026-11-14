<nav class="sidebar" aria-label="Menu utama">
    <ul class="menu">
        <li><a href="index.php?page=personal" class="<?= $page === 'personal' ? 'active' : '' ?>"
               <?= $page === 'personal' ? 'aria-current="page"' : '' ?>>Personal</a></li>
        <li><a href="index.php?page=shared" class="<?= $page === 'shared' ? 'active' : '' ?>"
               <?= $page === 'shared' ? 'aria-current="page"' : '' ?>>Shared</a></li>
    </ul>

    <!-- Belum login: form login (POST /api/v1/auth/login) -->
    <form id="login-form" class="user-switch" autocomplete="off">
        <label for="login-name">Masuk sebagai</label>
        <select id="login-name" name="name">
            <?php foreach ($users as $u): ?>
                <option value="<?= e($u['name']) ?>"><?= e($u['name']) ?></option>
            <?php endforeach; ?>
        </select>
        <label for="login-password">Password</label>
        <input type="password" id="login-password" name="password" required autocomplete="current-password">
        <button type="submit" class="btn-save">Masuk</button>
    </form>

    <!-- Sudah login -->
    <div id="user-box" class="user-switch" hidden>
        <span>Masuk sebagai</span>
        <strong id="user-name"></strong>
        <button type="button" id="btn-logout" class="btn-secondary">Keluar</button>
    </div>
</nav>
