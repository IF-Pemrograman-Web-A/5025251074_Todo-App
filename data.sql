CREATE DATABASE IF NOT EXISTS todo_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE todo_app;

DROP TABLE IF EXISTS todos;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE todos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  status ENUM('pending','completed') NOT NULL DEFAULT 'pending',
  visibility ENUM('personal','shared') NOT NULL DEFAULT 'personal',
  notify_time DATETIME NULL,
  image VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_todos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO users (id, name) VALUES
  (1, 'Galih'), (2, 'Rina'), (3, 'Dimas');

INSERT INTO todos (user_id, title, description, status, visibility, notify_time) VALUES
  (1, 'Ngerjain tugas pweb', 'Menyelesaikan tugas modul PHP', 'pending', 'personal', NULL),
  (1, 'Belajar kalkulus', 'Latihan soal turunan dan integral', 'completed', 'personal', NULL),
  (1, 'Ngerjain tugas pbo', 'Implementasi class dan object', 'pending', 'personal', NULL),
  (1, 'Rapat organisasi', 'Siapkan notulen rapat mingguan', 'pending', 'shared', NULL),
  (2, 'Desain poster kegiatan', 'Poster untuk acara bulan depan', 'pending', 'shared', NULL),
  (3, 'Booking ruang kelas', 'Pinjam ruang untuk workshop', 'completed', 'shared', NULL),
  (2, 'Catatan pribadi Rina', 'Hanya terlihat oleh Rina', 'pending', 'personal', NULL);
