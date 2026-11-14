// script.js - sisi klien: tema, kamera, preview gambar, REST API (fetch + JWT), notifikasi, service worker, install PWA, status offline
const toggleThemeBtn = document.getElementById("toggle-theme-btn");

// --- TEMA (localStorage) ---
function applyThemeLabel() {
    const dark = document.body.classList.contains("dark-mode");
    toggleThemeBtn.textContent = dark ? "Light Mode" : "Dark Mode";
    toggleThemeBtn.setAttribute("aria-label", dark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap");
}
if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark-mode");
applyThemeLabel();
toggleThemeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
    applyThemeLabel();
});

// --- KAMERA & PREVIEW GAMBAR ---
const fileInput = document.getElementById("edit-image-file");
const btnStart = document.getElementById("btn-start-camera");
const btnCapture = document.getElementById("btn-capture");
const video = document.getElementById("camera-video");
const canvas = document.getElementById("camera-canvas");
const previewBox = document.getElementById("image-preview-container");
const preview = document.getElementById("image-preview");
const btnRemove = document.getElementById("btn-remove-image");
const removeFlag = document.getElementById("remove-image");
let stream = null;

function showPreview(src) {
    preview.src = src;
    previewBox.style.display = "flex";
    removeFlag.value = "";
}

function stopCamera() {
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    video.style.display = "none";
    btnCapture.style.display = "none";
    btnStart.style.display = "inline-block";
}

btnStart.addEventListener("click", async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        video.srcObject = stream;
        video.style.display = "block";
        btnCapture.style.display = "inline-block";
        btnStart.style.display = "none";
    } catch (err) {
        alert("Gagal mengakses kamera. Pastikan izin kamera telah diberikan.");
    }
});

// Foto dari kamera dimasukkan ke input file agar ikut terkirim ke PHP
btnCapture.addEventListener("click", () => {
    if (!stream) return;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
        const file = new File([blob], "foto-kamera.jpg", { type: "image/jpeg" });
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        showPreview(URL.createObjectURL(blob));
        stopCamera();
    }, "image/jpeg", 0.85);
});

fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (file) showPreview(URL.createObjectURL(file));
});

btnRemove.addEventListener("click", () => {
    fileInput.value = "";
    preview.src = "";
    previewBox.style.display = "none";
    removeFlag.value = "1"; // server menghapus gambar lama saat update
});

// ================= REST API CLIENT =================
const API = "api/v1";          // relatif terhadap index.php -> berfungsi di sub-folder juga
const TOKEN_KEY = "todo_token";

class ApiError extends Error {
    constructor(status, message, errors) { super(message); this.status = status; this.errors = errors || null; }
}

const getToken = () => localStorage.getItem(TOKEN_KEY);

// Satu fungsi untuk semua request: pasang header, kirim JSON/FormData, baca status + JSON body
async function api(path, { method = "GET", json, form, headers = {} } = {}) {
    const h = { Accept: "application/json", ...headers };
    const token = getToken();
    if (token) h.Authorization = "Bearer " + token;
    let body;
    if (form) body = form;                                   // multipart: browser mengisi Content-Type + boundary
    else if (json !== undefined) { h["Content-Type"] = "application/json"; body = JSON.stringify(json); }

    let res;
    try {
        res = await fetch(`${API}${path}`, { method, headers: h, body });
    } catch (err) {
        throw new ApiError(0, "Tidak dapat terhubung ke server. Anda mungkin sedang offline.");
    }
    let data = null;
    try { data = await res.json(); } catch (err) { /* body kosong */ }

    if (!res.ok) {
        if (res.status === 401 && token) logoutLocal("Sesi berakhir, silakan masuk lagi.");
        throw new ApiError(res.status, (data && data.error) || `Terjadi kesalahan (${res.status}).`, data && data.errors);
    }
    return data;
}

// ================= ELEMEN & STATE =================
const PAGE = document.getElementById("main-content").dataset.page; // personal | shared
const listEl = document.getElementById("todo-list");
const flashEl = document.getElementById("flash");
const form = document.getElementById("editor-form");
const editId = document.getElementById("edit-id");
const fTitle = document.getElementById("edit-title");
const fDesc = document.getElementById("edit-desc");
const fStatus = document.getElementById("edit-status");
const fVis = document.getElementById("edit-visibility");
const fNotify = document.getElementById("edit-notify-time");
const btnSubmit = document.getElementById("btn-submit");
const btnDelete = document.getElementById("btn-delete");
const btnCancel = document.getElementById("btn-cancel");
const formTitle = document.getElementById("form-title");
const loginForm = document.getElementById("login-form");
const userBox = document.getElementById("user-box");
const userNameEl = document.getElementById("user-name");
let currentUser = null;

function showFlash(type, msg, errors) {
    let text = msg;
    if (errors) text += " " + Object.values(errors).join(" ");
    flashEl.className = "flash " + type;
    flashEl.textContent = text;
    flashEl.hidden = false;
}
function clearFlash() { flashEl.hidden = true; flashEl.textContent = ""; }
function showError(err) {
    showFlash("error", err instanceof ApiError ? err.message : "Terjadi kesalahan.", err instanceof ApiError ? err.errors : null);
}

function setListMessage(msg) {
    listEl.replaceChildren();
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = msg;
    listEl.appendChild(li);
    scheduleNotifications();
}

// ================= RENDER =================
function formatNotify(s) { // "2026-11-16 20:00:00" -> "16/11/2026 20.00"
    const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(s || "");
    return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}.${m[5]}` : s;
}

function span(text) {
    const s = document.createElement("span");
    s.className = "todo-notify-info";
    s.textContent = text;
    return s;
}

function renderTodos(todos) {
    listEl.replaceChildren();
    if (!todos.length) { setListMessage("Belum ada tugas. Tambahkan tugas baru di panel editor."); return; }

    for (const t of todos) {
        const done = t.status === "completed";
        const li = document.createElement("li");
        li.className = "todo-item" + (done ? " completed-item" : "") + (t.is_owner ? "" : " readonly");
        if (t.notify_time) {
            li.dataset.notify = t.notify_time;
            li.dataset.title = t.title;
            li.dataset.desc = t.description || "";
        }

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "todo-checkbox";
        cb.checked = done;
        if (t.is_owner) {
            cb.setAttribute("aria-label", `Tandai ${t.title} sebagai ${done ? "belum selesai" : "selesai"}`);
            cb.addEventListener("change", () => toggleTodo(t, cb));
        } else {
            cb.disabled = true;
            cb.setAttribute("aria-label", `Status ${t.title} (hanya pemilik yang dapat mengubah)`);
        }
        li.appendChild(cb);

        const details = document.createElement("div");
        details.className = "todo-details";
        if (t.is_owner) {
            const a = document.createElement("a");
            a.className = "todo-title";
            a.href = "#form-title";
            a.textContent = t.title;
            a.addEventListener("click", (e) => { e.preventDefault(); startEdit(t.id); });
            details.appendChild(a);
        } else {
            const s = document.createElement("span");
            s.className = "todo-title";
            s.textContent = t.title;
            details.appendChild(s);
        }
        if (PAGE === "shared") details.appendChild(span("Oleh " + t.owner));
        if (t.description) details.appendChild(span(t.description));
        if (t.notify_time) details.appendChild(span("⏰ Pengingat: " + formatNotify(t.notify_time)));
        if (t.image_url) {
            const img = document.createElement("img");
            img.src = t.image_url;
            img.alt = "Lampiran untuk " + t.title;
            img.className = "todo-thumbnail";
            details.appendChild(img);
        }
        li.appendChild(details);

        const badge = document.createElement("span");
        badge.className = "badge " + t.status;
        badge.textContent = done ? "Selesai" : "Belum Selesai";
        li.appendChild(badge);

        listEl.appendChild(li);
    }
    scheduleNotifications();
}

// ================= CRUD lewat API =================
async function loadTodos() {
    if (!currentUser) return;
    try {
        const todos = await api(PAGE === "shared" ? "/todos/shared" : "/todos");   // GET
        renderTodos(todos);
    } catch (err) {
        if (err.status !== 401) setListMessage("Tidak bisa memuat todo.");
        showError(err);
    }
}

async function toggleTodo(t, cb) {
    try {
        await api(`/todos/${t.id}`, { method: "PATCH", json: { status: cb.checked ? "completed" : "pending" } });
        clearFlash();
        loadTodos();
    } catch (err) {
        cb.checked = !cb.checked; // kembalikan tampilan jika gagal
        showError(err);
    }
}

async function startEdit(id) {
    try {
        const t = await api(`/todos/${id}`);                                        // GET one
        resetForm();
        editId.value = t.id;
        fTitle.value = t.title;
        fDesc.value = t.description || "";
        fStatus.value = t.status;
        fVis.value = t.visibility;
        fNotify.value = t.notify_time ? t.notify_time.slice(0, 16).replace(" ", "T") : "";
        if (t.image_url) showPreview(t.image_url);
        formTitle.textContent = "Edit Todo";
        btnSubmit.textContent = "Simpan Perubahan";
        btnSubmit.className = "btn-save";
        btnDelete.hidden = false;
        btnCancel.hidden = false;
        clearFlash();
        fTitle.focus();
    } catch (err) { showError(err); }
}

function resetForm() {
    stopCamera();
    form.reset();
    editId.value = "";
    fVis.value = PAGE;
    fileInput.value = "";
    preview.src = "";
    previewBox.style.display = "none";
    removeFlag.value = "";
    formTitle.textContent = "Editor Todo";
    btnSubmit.textContent = "+ Tambah Todo";
    btnSubmit.className = "btn-add";
    btnDelete.hidden = true;
    btnCancel.hidden = true;
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) { showFlash("error", "Silakan masuk terlebih dahulu."); return; }
    const id = editId.value;
    const file = fileInput.files[0];
    const fields = {
        title: fTitle.value, description: fDesc.value, status: fStatus.value,
        visibility: fVis.value, notify_time: fNotify.value || null,
    };
    try {
        if (file) {
            // Ada gambar -> multipart/form-data. Update memakai POST + header override PATCH.
            const fd = new FormData();
            for (const [k, v] of Object.entries(fields)) fd.append(k, v === null ? "" : v);
            fd.append("image", file);
            if (id) await api(`/todos/${id}`, { method: "POST", form: fd, headers: { "X-HTTP-Method-Override": "PATCH" } });
            else await api("/todos", { method: "POST", form: fd });
        } else if (id) {
            if (removeFlag.value === "1") fields.remove_image = true;
            await api(`/todos/${id}`, { method: "PATCH", json: fields });          // PATCH JSON
        } else {
            await api("/todos", { method: "POST", json: fields });                  // POST JSON -> 201
        }
        showFlash("success", id ? "Perubahan berhasil disimpan." : "Todo berhasil ditambahkan.");
        resetForm();
        loadTodos();
    } catch (err) { showError(err); }
});

btnDelete.addEventListener("click", async () => {
    if (!editId.value || !confirm("Hapus todo ini?")) return;
    try {
        await api(`/todos/${editId.value}`, { method: "DELETE" });
        showFlash("success", "Todo berhasil dihapus.");
        resetForm();
        loadTodos();
    } catch (err) { showError(err); }
});

btnCancel.addEventListener("click", () => { resetForm(); clearFlash(); });

// ================= AUTH (JWT) =================
function tokenPayload() {
    try {
        const p = getToken().split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        return JSON.parse(atob(p));
    } catch (err) { return null; }
}

function setUser(user) {
    currentUser = user;
    loginForm.hidden = !!user;
    userBox.hidden = !user;
    userNameEl.textContent = user ? user.name : "";
}

function logoutLocal(message) {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    resetForm();
    setListMessage("Silakan masuk untuk melihat todo.");
    if (message) showFlash("error", message); else clearFlash();
}

async function initSession() {
    if (!getToken()) { setUser(null); return; }
    try {
        setUser(await api("/auth/me"));
    } catch (err) {
        if (err.status === 0) { // offline: pakai data dari token, list tidak bisa dimuat
            const p = tokenPayload();
            if (p) { setUser({ id: p.sub, name: p.name }); setListMessage("Anda offline. Todo tidak dapat dimuat."); }
            return;
        }
        return; // 401 sudah ditangani di api()
    }
    resetForm();
    loadTodos();
}

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pwd = document.getElementById("login-password");
    try {
        const res = await api("/auth/login", {
            method: "POST",
            json: { name: document.getElementById("login-name").value, password: pwd.value },
        });
        localStorage.setItem(TOKEN_KEY, res.token);
        pwd.value = "";
        clearFlash();
        await initSession();
    } catch (err) { showError(err); }
});

document.getElementById("btn-logout").addEventListener("click", () => logoutLocal());

// ================= SERVICE WORKER & NOTIFIKASI =================
let notifyTimers = [];
function scheduleNotifications() {
    notifyTimers.forEach(clearTimeout);
    notifyTimers = [];
    if (!("Notification" in window) || Notification.permission !== "granted" || !("serviceWorker" in navigator)) return;
    document.querySelectorAll("[data-notify]").forEach((el) => {
        if (el.classList.contains("completed-item")) return;
        const delay = new Date(el.dataset.notify.replace(" ", "T")).getTime() - Date.now();
        // Batas setTimeout ~24 hari
        if (delay > 0 && delay < 2147483647) {
            notifyTimers.push(setTimeout(() => {
                navigator.serviceWorker.ready.then((reg) =>
                    reg.showNotification(`Pengingat Todo: ${el.dataset.title}`, {
                        body: el.dataset.desc || "Saatnya menyelesaikan tugas kamu!",
                    })
                );
            }, delay));
        }
    });
}

async function initPWA() {
    if (!("serviceWorker" in navigator)) return;
    try {
        await navigator.serviceWorker.register("./sw.js");
        if ("Notification" in window && Notification.permission === "default") {
            await Notification.requestPermission();
        }
        scheduleNotifications();
    } catch (err) {
        console.error("Service Worker gagal:", err);
    }
}
initPWA();

// MULAI
initSession();

// TOMBOL INSTALL PWA 
const btnInstall = document.getElementById("install-button");
let deferredPrompt = null;

const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

// Tampilkan tombol kecuali app sudah berjalan sebagai aplikasi terpasang
if (btnInstall && !isStandalone()) btnInstall.hidden = false;

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

if (btnInstall) {
    btnInstall.addEventListener("click", async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
        } else {
            // Fallback: browser tidak menyediakan prompt (mis. Safari/iOS, atau sudah terpasang)
            alert(
                "Untuk memasang aplikasi:\n" +
                "• Chrome/Edge: menu ⋮ → Instal aplikasi / Tambahkan ke layar utama\n" +
                "• Safari iOS: tombol Bagikan → Tambah ke Layar Utama"
            );
        }
    });
}

window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    if (btnInstall) btnInstall.hidden = true;
});

// STATUS ONLINE / OFFLINE 
const offlineBanner = document.getElementById("offline-banner");
function updateOnlineStatus() {
    if (offlineBanner) offlineBanner.hidden = navigator.onLine;
}
window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
updateOnlineStatus();
