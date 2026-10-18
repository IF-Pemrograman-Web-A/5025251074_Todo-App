<?php
// index.php - entry point & router sederhana (Personal / Shared)
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

$page  = ($_GET['page'] ?? 'personal') === 'shared' ? 'shared' : 'personal';
$uid   = current_user_id();
$users = get_users();
$todos = get_todos($page, $uid);

$editTodo = null;
if (isset($_GET['edit'])) {
    $t = get_todo((int)$_GET['edit']);
    if ($t && (int)$t['user_id'] === $uid) $editTodo = $t;
}
$flash = pull_flash();

include __DIR__ . '/includes/header.php';
echo '<div class="layout">';
include __DIR__ . '/includes/menu-bar.php';
include __DIR__ . '/includes/content.php';
echo '</div>';
include __DIR__ . '/includes/footer.php';
