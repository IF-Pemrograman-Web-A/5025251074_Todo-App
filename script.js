// Initial Data
const defaultTodos = [
    {
        id: 1,
        title: "Ngerjain tugas pweb",
        description: "Menyelesaikan tugas modul JavaScript",
        status: "pending"
    },
    {
        id: 2,
        title: "Belajar kalkulus",
        description: "Latihan soal turunan dan integrasi",
        status: "completed"
    },
    {
        id: 3,
        title: "Ngerjain tugas pbo",
        description: "Implementasi class dan object",
        status: "pending"
    }
];

// Salin data default ke array kerja
let todos = [...defaultTodos];

// Seleksi Elemen DOM
const todoListEl = document.getElementById("todo-list");
const editorForm = document.getElementById("editor-form");
const editIdInput = document.getElementById("edit-id");
const editTitleInput = document.getElementById("edit-title");
const editDescInput = document.getElementById("edit-desc");
const editStatusInput = document.getElementById("edit-status");

const btnAdd = document.getElementById("btn-add");
const btnSave = document.getElementById("btn-save");
const btnDelete = document.getElementById("btn-delete");
const toggleThemeBtn = document.getElementById("toggle-theme-btn");

// Fungsi untuk Menampilkan Data Todo ke DOM
function renderTodos() {
    todoListEl.innerHTML = "";

    todos.forEach((todo) => {
        const li = document.createElement("li");
        li.className = `todo-item ${todo.status === "completed" ? "completed-item" : ""}`;

        // Event listener saat item diklik untuk memilih/mengedit todo
        li.addEventListener("click", (e) => {
            // Hindari trigger saat checkbox diklik langsung
            if (e.target.type !== "checkbox") {
                selectTodoForEdit(todo.id);
            }
        });

        // Checkbox elemen
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "todo-checkbox";
        checkbox.checked = todo.status === "completed";
        
        // Event handler ubah status checkbox
        checkbox.addEventListener("change", (e) => {
            e.stopPropagation();
            toggleTodoStatus(todo.id);
        });

        // Detail Todo
        const detailsDiv = document.createElement("div");
        detailsDiv.className = "todo-details";

        const titleSpan = document.createElement("span");
        titleSpan.className = "todo-title";
        titleSpan.textContent = todo.title;

        detailsDiv.appendChild(titleSpan);

        // Status Badge
        const badgeSpan = document.createElement("span");
        badgeSpan.className = `badge ${todo.status}`;
        badgeSpan.textContent = todo.status === "completed" ? "Selesai" : "Belum Selesai";

        // Gabungkan ke elemen li
        li.appendChild(checkbox);
        li.appendChild(detailsDiv);
        li.appendChild(badgeSpan);

        todoListEl.appendChild(li);
    });
}

// Menambahkan Todo Baru
editorForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const titleValue = editTitleInput.value.trim();
    const descValue = editDescInput.value.trim();
    const statusValue = editStatusInput.value;

    if (!titleValue) return;

    // Tambah Todo Baru jika tidak sedang dalam mode Edit ID
    if (!editIdInput.value) {
        const newTodo = {
            id: Date.now(), // Unique ID berdasarkan timestamp
            title: titleValue,
            description: descValue,
            status: statusValue
        };

        todos.push(newTodo); // Simpan sebagai Object
        renderTodos(); // Langsung tampilkan tanpa refresh
        resetForm();
    }
});

// Memilih Todo untuk Dimuat ke Form Editor
function selectTodoForEdit(id) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    editIdInput.value = todo.id;
    editTitleInput.value = todo.title;
    editDescInput.value = todo.description;
    editStatusInput.value = todo.status;

    // Tampilkan tombol Simpan & Hapus, sembunyikan Tambah
    btnAdd.style.display = "none";
    btnSave.style.display = "inline-block";
    btnDelete.style.display = "inline-block";
}

// Menyimpan Perubahan Edit Todo
btnSave.addEventListener("click", function () {
    const id = Number(editIdInput.value);
    const todoIndex = todos.findIndex((t) => t.id === id);

    if (todoIndex !== -1) {
        todos[todoIndex].title = editTitleInput.value.trim();
        todos[todoIndex].description = editDescInput.value.trim();
        todos[todoIndex].status = editStatusInput.value;

        renderTodos();
        resetForm();
    }
});

// Menghapus Todo
btnDelete.addEventListener("click", function () {
    const id = Number(editIdInput.value);
    todos = todos.filter((t) => t.id !== id);

    renderTodos();
    resetForm();
});

// Toggle Status Selesai / Belum Selesai lewat Checkbox
function toggleTodoStatus(id) {
    const todo = todos.find((t) => t.id === id);
    if (todo) {
        todo.status = todo.status === "completed" ? "pending" : "completed";
        
        // Jika todo ini sedang dimuat di editor, perbarui pilihan dropdown statusnya
        if (Number(editIdInput.value) === id) {
            editStatusInput.value = todo.status;
        }

        renderTodos();
    }
}

// Reset Mode Form ke Default
function resetForm() {
    editIdInput.value = "";
    editorForm.reset();
    btnAdd.style.display = "inline-block";
    btnSave.style.display = "none";
    btnDelete.style.display = "none";
}

// Toggle Appearance Light / Dark Mode
toggleThemeBtn.addEventListener("click", function () {
    document.body.classList.toggle("dark-mode");

    const isDarkMode = document.body.classList.contains("dark-mode");
    toggleThemeBtn.textContent = isDarkMode ? "Light Mode" : "Dark Mode";
});

// Inisialisasi tampilan pertama kali
renderTodos();