/**
 * CB Studio's — Upload page script
 */
(function () {
  "use strict";

  const API_BASE = (document.querySelector('meta[name="cb-api-base"]')?.content || "").replace(/\/$/, "");
  const api = (p) => `${API_BASE}${p}`;

  document.getElementById("year").textContent = new Date().getFullYear();

  // Tabs
  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".tab-panel");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      panels.forEach((p) => p.classList.add("hidden"));
      tab.classList.add("active");
      document.querySelector(`[data-panel="${tab.dataset.tab}"]`).classList.remove("hidden");
      result.innerHTML = "";
    });
  });

  // Paste counter
  const jsonInput = document.getElementById("jsonInput");
  const charCount = document.getElementById("charCount");
  jsonInput.addEventListener("input", () => {
    charCount.textContent = `${jsonInput.value.length.toLocaleString("pt-BR")} caracteres`;
  });
  document.getElementById("clearBtn").addEventListener("click", () => {
    jsonInput.value = "";
    charCount.textContent = "0 caracteres";
    result.innerHTML = "";
  });

  // File input
  const fileInput = document.getElementById("fileInput");
  const fileDrop = document.getElementById("fileDrop");
  const fileName = document.getElementById("fileName");
  let selectedFileText = null;

  fileDrop.addEventListener("click", (e) => {
    if (e.target.tagName !== "INPUT") fileInput.click();
  });
  fileDrop.addEventListener("dragover", (e) => {
    e.preventDefault();
    fileDrop.classList.add("dragover");
  });
  fileDrop.addEventListener("dragleave", () => fileDrop.classList.remove("dragover"));
  fileDrop.addEventListener("drop", (e) => {
    e.preventDefault();
    fileDrop.classList.remove("dragover");
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  function handleFile(file) {
    if (file.size > 5 * 1024 * 1024) {
      alert("Arquivo muito grande (máx 5 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      selectedFileText = reader.result;
      fileName.textContent = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    };
    reader.readAsText(file);
  }

  // Send
  const sendBtn = document.getElementById("sendBtn");
  const result = document.getElementById("result");
  const btnLabel = sendBtn.querySelector(".btn-label");
  const btnSpinner = sendBtn.querySelector(".btn-spinner");

  sendBtn.addEventListener("click", send);

  async function send() {
    const activeTab = document.querySelector(".tab.active").dataset.tab;
    let raw = activeTab === "paste" ? jsonInput.value.trim() : selectedFileText;

    if (!raw) {
      showError("Cole o conteúdo do replay ou escolha um arquivo.");
      return;
    }

    let raw_obj;
    try {
      raw_obj = JSON.parse(raw);
    } catch {
      showError("O conteúdo não é um JSON válido. Verifique se você copiou tudo.");
      return;
    }

    if (!raw_obj || typeof raw_obj !== "object") {
      showError("Formato inválido — esperado um objeto JSON.");
      return;
    }

    // Normalize addon v2 format → backend format expected by PHP
    const payload = {
      player: raw_obj.player || "Anônimo",
      replayName: raw_obj.replayName || raw_obj.name || "Sem nome",
      mode: raw_obj.mode || "performance",
      frames: raw_obj.frames || [],
      settings: raw_obj.settings || {},
    };

    if (!Array.isArray(payload.frames) || payload.frames.length === 0) {
      showError('O replay precisa ter pelo menos 1 frame no campo "frames".');
      return;
    }

    setLoading(true);
    result.innerHTML = "";

    try {
      const res = await fetch(api("/api/upload"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        showError(data.error || `Erro ${res.status} ao enviar.`);
        return;
      }

      showSuccess(data.key);
    } catch (err) {
      showError("Falha de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  function setLoading(on) {
    sendBtn.disabled = on;
    btnSpinner.hidden = !on;
    btnLabel.textContent = on ? "Enviando..." : "Enviar Replay";
  }

  function showError(text) {
    result.innerHTML = `<div class="result-card error"><strong>❌ ${escapeHtml(text)}</strong></div>`;
  }

  function showSuccess(key) {
    result.innerHTML = `
      <div class="result-card success">
        <div class="success-icon">✅</div>
        <h3>Replay enviado!</h3>
        <p class="muted">Sua KEY exclusiva:</p>
        <div class="key-display">
          <span class="key-tag big">${escapeHtml(key)}</span>
          <button class="link-btn" id="copyKey" type="button">📋 Copiar</button>
        </div>
        <p class="muted small">Compartilhe essa KEY com seus amigos. Eles podem digitá-la na <a href="/">página inicial</a> pra baixar o replay.</p>
      </div>
    `;
    document.getElementById("copyKey").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(key);
        document.getElementById("copyKey").textContent = "✓ Copiado!";
      } catch {}
    });
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }
})();
