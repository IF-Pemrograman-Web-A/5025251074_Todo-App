<nav class="sidebar" aria-label="Menu utama">
    <ul class="menu">
        <li><a href="index.php?page=personal" class="<?= $page === 'personal' ? 'active' : '' ?>"
               <?= $page === 'personal' ? 'aria-current="page"' : '' ?>>Personal</a></li>
        <li><a href="index.php?page=shared" class="<?= $page === 'shared' ? 'active' : '' ?>"
               <?= $page === 'shared' ? 'aria-current="page"' : '' ?>>Shared</a></li>
    </ul>

    <form method="post" action="actions.php" class="user-switch">
        <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
        <input type="hidden" name="page" value="<?= e($page) ?>">
        <input type="hidden" name="action" value="switch_user">
        <label for="user-select">Masuk sebagai</label>
        <select id="user-select" name="user_id" onchange="this.form.submit()">
            <?php foreach ($users as $u): ?>
                <option value="<?= (int)$u['id'] ?>" <?= (int)$u['id'] === $uid ? 'selected' : '' ?>><?= e($u['name']) ?></option>
            <?php endforeach; ?>
        </select>
    </form>
</nav>
