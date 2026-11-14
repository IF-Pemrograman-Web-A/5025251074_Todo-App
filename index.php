<?php
// index.php - entry point halaman (shell HTML). Data todo diambil JavaScript lewat REST API (api/).
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

$page  = ($_GET['page'] ?? 'personal') === 'shared' ? 'shared' : 'personal';
$users = get_users(); // hanya untuk pilihan nama di form login

include __DIR__ . '/includes/header.php';
echo '<div class="layout">';
include __DIR__ . '/includes/menu-bar.php';
include __DIR__ . '/includes/content.php';
echo '</div>';
include __DIR__ . '/includes/footer.php';
