/**
 * CB Studio's — Frontend Script
 * Busca a key digitada na API e mostra o card de download.
 */

(function () {
  'use strict';

  const form = document.getElementById('searchForm');
  const input = document.getElementById('keyInput');
  const button = document.getElementById('searchBtn');
  const result = document.getElementById('result');
  const yearEl = document.getElementById('year');

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Auto-formatar a key: CBXX-XXXX (maiúsculas, hífen automático)
  input.addEventListener('input', (e) => {
    let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (v.length > 4) v = v.slice(0, 4) + '-' + v.slice(4, 8);
    e.target.value = v.slice(0, 9);
  });

  // Aceita colar com hífen
  input.addEventListener('paste', () => {
    setTimeout(() => {
      const v = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      input.value = (v.slice(0, 4) + (v.length > 4 ? '-' + v.slice(4, 8) : '')).slice(0, 9);
    }, 0);
  });

  function setLoading(on) {
    if (on) {
      button.classList.add('loading');
      button.disabled = true;
    } else {
      button.classList.remove('loading');
      button.disabled = false;
    }
  }

  function renderError(message) {
    result.innerHTML = `
      <div class="error-card" role="alert">
        <span class="x">!</span>
        <div>
          <strong>Key não encontrada</strong>
          <span>${escapeHtml(message)}</span>
        </div>
      </div>
    `;
  }

  function renderSuccess(key) {
    result.innerHTML = `
      <div class="replay-card">
        <div class="ok-row">
          <span class="check">✓</span>
          Replay Encontrado
        </div>
        <div class="key-display">${escapeHtml(key)}</div>
        <div class="actions">
          <button class="btn primary" data-action="download">⬇ Baixar Replay</button>
          <button class="btn" data-action="view">👁 Visualizar JSON</button>
        </div>
      </div>
    `;

    result.querySelector('[data-action="download"]').addEventListener('click', () => {
      window.location.href = `/api/download/${encodeURIComponent(key)}`;
    });
    result.querySelector('[data-action="view"]').addEventListener('click', () => {
      window.open(`/api/view/${encodeURIComponent(key)}`, '_blank', 'noopener');
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (s) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s])
    );
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const raw = (input.value || '').toUpperCase().trim();

    if (!/^CB[A-Z0-9]{2}-[A-Z0-9]{4}$/.test(raw)) {
      renderError('Formato inválido. Use o padrão CBXX-XXXX.');
      return;
    }

    setLoading(true);
    result.innerHTML = '';

    try {
      const res = await fetch(`/api/status/${encodeURIComponent(raw)}`);
      const data = await res.json();

      if (data && data.exists) {
        renderSuccess(raw);
      } else {
        renderError('Verifique se digitou corretamente a key recebida no chat.');
      }
    } catch (err) {
      renderError('Não foi possível conectar à API. Tente novamente.');
    } finally {
      setLoading(false);
    }
  });

  // Permite preencher via querystring: ?key=CBXX-XXXX
  const urlKey = new URLSearchParams(window.location.search).get('key');
  if (urlKey) {
    input.value = urlKey.toUpperCase();
    setTimeout(() => form.dispatchEvent(new Event('submit', { cancelable: true })), 200);
  }
})();
