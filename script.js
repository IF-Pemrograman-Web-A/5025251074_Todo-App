// script.js - sisi klien: tema, kamera, preview gambar, notifikasi, service worker
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

// --- SERVICE WORKER & NOTIFIKASI ---
function scheduleNotifications() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    document.querySelectorAll("[data-notify]").forEach((el) => {
        if (el.classList.contains("completed-item")) return;
        const delay = new Date(el.dataset.notify.replace(" ", "T")).getTime() - Date.now();
        // Batas setTimeout ~24 hari
        if (delay > 0 && delay < 2147483647) {
            setTimeout(() => {
                navigator.serviceWorker.ready.then((reg) =>
                    reg.showNotification(`Pengingat Todo: ${el.dataset.title}`, {
                        body: el.dataset.desc || "Saatnya menyelesaikan tugas kamu!",
                    })
                );
            }, delay);
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
