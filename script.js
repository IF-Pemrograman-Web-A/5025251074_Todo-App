// --- INDEXEDDB SETUP (WEB STORAGE) ---
const DB_NAME = "TodoAppDB";
const DB_VERSION = 1;
const STORE_NAME = "todos";
let db = null;

// Membuka database IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };

        request.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };

        request.onerror = (e) => {
            console.error("IndexedDB Error:", e.target.error);
            reject(e.target.error);
        };
    });
}

// Mengambil semua Todo dari IndexedDB
function getAllTodosFromDB() {
    return new Promise((resolve) => {
        if (!db) return resolve([]);
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
    });
}

// Menyimpan atau Memperbarui Todo ke IndexedDB
function saveTodoToDB(todo) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(todo);

        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
}

// Menghapus Todo dari IndexedDB
function deleteTodoFromDB(id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
}

// --- STATE & DOM ELEMENTS ---
let todos = [];
let currentImageData = null; // Menyimpan Base64 Data Image
let mediaStream = null;

const todoListEl = document.getElementById("todo-list");
const editorForm = document.getElementById("editor-form");
const editIdInput = document.getElementById("edit-id");
const editTitleInput = document.getElementById("edit-title");
const editDescInput = document.getElementById("edit-desc");
const editStatusInput = document.getElementById("edit-status");
const editNotifyTimeInput = document.getElementById("edit-notify-time");
const editImageFileInput = document.getElementById("edit-image-file");

const btnAdd = document.getElementById("btn-add");
const btnSave = document.getElementById("btn-save");
const btnDelete = document.getElementById("btn-delete");
const btnCancel = document.getElementById("btn-cancel");
const toggleThemeBtn = document.getElementById("toggle-theme-btn");

// Media Elements
const btnStartCamera = document.getElementById("btn-start-camera");
const btnCapture = document.getElementById("btn-capture");
const cameraVideo = document.getElementById("camera-video");
const cameraCanvas = document.getElementById("camera-canvas");
const imagePreviewContainer = document.getElementById("image-preview-container");
const imagePreview = document.getElementById("image-preview");
const btnRemoveImage = document.getElementById("btn-remove-image");

// --- RENDER DOM ---
function renderTodos() {
    todoListEl.innerHTML = "";

    if (todos.length === 0) {
        todoListEl.innerHTML = `<li style="padding: 15px; text-align: center; color: var(--gunmetal);">Belum ada tugas. Silakan tambah tugas baru.</li>`;
        return;
    }

    todos.forEach((todo) => {
        const li = document.createElement("li");
        li.className = `todo-item ${todo.status === "completed" ? "completed-item" : ""}`;
        li.tabIndex = 0; // Accessibility: Keyboard Navigable
        li.setAttribute("role", "article");
        li.setAttribute("aria-label", `Tugas: ${todo.title}, Status: ${todo.status === "completed" ? "Selesai" : "Belum Selesai"}`);

        // Click & Keyboard Enter/Space event
        li.addEventListener("click", (e) => {
            if (e.target.type !== "checkbox" && e.target.tagName !== "BUTTON") {
                selectTodoForEdit(todo.id);
            }
        });
        li.addEventListener("keydown", (e) => {
            if ((e.key === "Enter" || e.key === " ") && e.target === li) {
                e.preventDefault();
                selectTodoForEdit(todo.id);
            }
        });

        // Checkbox
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "todo-checkbox";
        checkbox.checked = todo.status === "completed";
        checkbox.setAttribute("aria-label", `Tandai ${todo.title} sebagai ${todo.status === "completed" ? "belum selesai" : "selesai"}`);
        checkbox.addEventListener("change", (e) => {
            e.stopPropagation();
            toggleTodoStatus(todo.id);
        });

        // Detail
        const detailsDiv = document.createElement("div");
        detailsDiv.className = "todo-details";

        const titleSpan = document.createElement("span");
        titleSpan.className = "todo-title";
        titleSpan.textContent = todo.title;
        detailsDiv.appendChild(titleSpan);

        if (todo.notifyTime) {
            const notifySpan = document.createElement("span");
            notifySpan.className = "todo-notify-info";
            const formattedDate = new Date(todo.notifyTime).toLocaleString("id-ID");
            notifySpan.textContent = `⏰ Pengingat: ${formattedDate}`;
            detailsDiv.appendChild(notifySpan);
        }

        // Gambar Thumbnail jika ada
        if (todo.image) {
            const img = document.createElement("img");
            img.src = todo.image;
            img.alt = `Lampiran untuk ${todo.title}`;
            img.className = "todo-thumbnail";
            detailsDiv.appendChild(img);
        }

        // Status Badge
        const badgeSpan = document.createElement("span");
        badgeSpan.className = `badge ${todo.status}`;
        badgeSpan.textContent = todo.status === "completed" ? "Selesai" : "Belum Selesai";

        li.appendChild(checkbox);
        li.appendChild(detailsDiv);
        li.appendChild(badgeSpan);

        todoListEl.appendChild(li);
    });
}

// --- MEDIA CAPTURE & FILE HANDLING ---
btnStartCamera.addEventListener("click", async () => {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        cameraVideo.srcObject = mediaStream;
        cameraVideo.style.display = "block";
        btnCapture.style.display = "inline-block";
        btnStartCamera.style.display = "none";
    } catch (err) {
        alert("Gagal mengakses kamera. Pastikan izin kamera telah diberikan.");
        console.error(err);
    }
});

btnCapture.addEventListener("click", () => {
    if (!mediaStream) return;
    const context = cameraCanvas.getContext("2d");
    cameraCanvas.width = cameraVideo.videoWidth || 320;
    cameraCanvas.height = cameraVideo.videoHeight || 240;
    context.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);

    currentImageData = cameraCanvas.toDataURL("image/png");
    showImagePreview(currentImageData);
    stopCamera();
});

function stopCamera() {
    if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
    }
    cameraVideo.style.display = "none";
    btnCapture.style.display = "none";
    btnStartCamera.style.display = "inline-block";
}

editImageFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            currentImageData = event.target.result;
            showImagePreview(currentImageData);
        };
        reader.readAsDataURL(file);
    }
});

function showImagePreview(src) {
    imagePreview.src = src;
    imagePreviewContainer.style.display = "flex";
}

btnRemoveImage.addEventListener("click", () => {
    currentImageData = null;
    imagePreview.src = "";
    imagePreviewContainer.style.display = "none";
    editImageFileInput.value = "";
});

// --- FORM ACTIONS & EVENT LISTENERS ---
editorForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const titleValue = editTitleInput.value.trim();
    const descValue = editDescInput.value.trim();
    const statusValue = editStatusInput.value;
    const notifyTimeValue = editNotifyTimeInput.value;

    if (!titleValue) return;

    if (!editIdInput.value) {
        const newTodo = {
            id: Date.now(),
            title: titleValue,
            description: descValue,
            status: statusValue,
            notifyTime: notifyTimeValue || null,
            image: currentImageData || null
        };

        todos.push(newTodo);
        await saveTodoToDB(newTodo);
        scheduleNotification(newTodo);
        renderTodos();
        resetForm();
    }
});

function selectTodoForEdit(id) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    editIdInput.value = todo.id;
    editTitleInput.value = todo.title;
    editDescInput.value = todo.description;
    editStatusInput.value = todo.status;
    editNotifyTimeInput.value = todo.notifyTime || "";

    if (todo.image) {
        currentImageData = todo.image;
        showImagePreview(currentImageData);
    } else {
        btnRemoveImage.click();
    }

    btnAdd.style.display = "none";
    btnSave.style.display = "inline-block";
    btnDelete.style.display = "inline-block";
    btnCancel.style.display = "inline-block";
}

btnSave.addEventListener("click", async function () {
    const id = Number(editIdInput.value);
    const todoIndex = todos.findIndex((t) => t.id === id);

    if (todoIndex !== -1) {
        const updatedTodo = {
            ...todos[todoIndex],
            title: editTitleInput.value.trim(),
            description: editDescInput.value.trim(),
            status: editStatusInput.value,
            notifyTime: editNotifyTimeInput.value || null,
            image: currentImageData || null
        };

        todos[todoIndex] = updatedTodo;
        await saveTodoToDB(updatedTodo);
        scheduleNotification(updatedTodo);
        renderTodos();
        resetForm();
    }
});

btnDelete.addEventListener("click", async function () {
    const id = Number(editIdInput.value);
    todos = todos.filter((t) => t.id !== id);
    await deleteTodoFromDB(id);
    renderTodos();
    resetForm();
});

btnCancel.addEventListener("click", resetForm);

async function toggleTodoStatus(id) {
    const todo = todos.find((t) => t.id === id);
    if (todo) {
        todo.status = todo.status === "completed" ? "pending" : "completed";
        if (Number(editIdInput.value) === id) {
            editStatusInput.value = todo.status;
        }
        await saveTodoToDB(todo);
        renderTodos();
    }
}

function resetForm() {
    stopCamera();
    editIdInput.value = "";
    editorForm.reset();
    currentImageData = null;
    imagePreviewContainer.style.display = "none";
    btnAdd.style.display = "inline-block";
    btnSave.style.display = "none";
    btnDelete.style.display = "none";
    btnCancel.style.display = "none";
}

// --- LOCAL STORAGE (PREFERENSI TEMA) ---
function initTheme() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        toggleThemeBtn.textContent = "Light Mode";
        toggleThemeBtn.setAttribute("aria-label", "Beralih ke Mode Terang");
    }
}

toggleThemeBtn.addEventListener("click", function () {
    document.body.classList.toggle("dark-mode");
    const isDarkMode = document.body.classList.contains("dark-mode");

    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    toggleThemeBtn.textContent = isDarkMode ? "Light Mode" : "Dark Mode";
    toggleThemeBtn.setAttribute("aria-label", isDarkMode ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap");
});

// --- SERVICE WORKER & NOTIFICATION API ---
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const reg = await navigator.serviceWorker.register('./sw.js');
            console.log('Service Worker berhasil didaftarkan:', reg);
            requestNotificationPermission();
        } catch (err) {
            console.error('Pendaftaran Service Worker gagal:', err);
        }
    }
}

async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
    }
}

function scheduleNotification(todo) {
    if (!todo.notifyTime || Notification.permission !== 'granted') return;

    const targetTime = new Date(todo.notifyTime).getTime();
    const delay = targetTime - Date.now();

    if (delay > 0) {
        setTimeout(() => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then((reg) => {
                    reg.showNotification(`Pengingat Todo: ${todo.title}`, {
                        body: todo.description || "Saatnya menyelesaikan tugas kamu!",
                        icon: todo.image || undefined,
                        badge: todo.image || undefined
                    });
                });
            }
        }, delay);
    }
}

// --- INITIALIZATION ---
async function initApp() {
    initTheme();
    await initDB();
    todos = await getAllTodosFromDB();

    // Jika DB kosong, isi data default awal
    if (todos.length === 0) {
        const defaultTodos = [
            { id: 1, title: "Ngerjain tugas pweb", description: "Menyelesaikan tugas modul JavaScript", status: "pending", notifyTime: null, image: null },
            { id: 2, title: "Belajar kalkulus", description: "Latihan soal turunan dan integrasi", status: "completed", notifyTime: null, image: null },
            { id: 3, title: "Ngerjain tugas pbo", description: "Implementasi class dan object", status: "pending", notifyTime: null, image: null }
        ];
        for (const t of defaultTodos) {
            await saveTodoToDB(t);
        }
        todos = defaultTodos;
    }

    renderTodos();
    registerServiceWorker();
}

initApp();