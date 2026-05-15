/* ============================================================
   PETS4PET — login.js
   Lógica do formulário de login — comunicação com API PHP
   ============================================================ */

'use strict';

// ─── CONFIGURAÇÃO ─────────────────────────────────────────
const API_LOGIN   = 'http://localhost/pets4pet/backend/login.php';
const API_REENVIO = 'http://localhost/pets4pet/backend/reenviar-verificacao.php';

/* ─── UTILIDADES ─────────────────────────────────────────── */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// Toast
const Toast = (() => {
  const el  = $('#toast');
  const msg = $('#toast-msg');
  let timer = null;
  return {
    show(text, duration = 4000) {
      if (!el || !msg) return;
      msg.textContent = text;
      el.classList.add('show');
      clearTimeout(timer);
      timer = setTimeout(() => el.classList.remove('show'), duration);
    }
  };
})();

/* ─── ANIMATE ON SCROLL ──────────────────────────────────── */
(function initAnimations() {
  const items = $$('[data-animate]');
  if (!items.length) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) { items.forEach(el => el.classList.add('is-visible')); return; }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const delay = parseInt(e.target.dataset.delay || '0', 10);
      setTimeout(() => e.target.classList.add('is-visible'), delay);
      obs.unobserve(e.target);
    });
  }, { threshold: 0.1 });
  items.forEach(el => obs.observe(el));
})();

/* ─── HEADER SCROLL ──────────────────────────────────────── */
(function initHeader() {
  const header = $('.p4p-header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
})();

/* ─── PASSWORD TOGGLE ────────────────────────────────────── */
(function initPasswordToggle() {
  $$('.cad-toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = $(`#${btn.dataset.target}`);
      const icon  = btn.querySelector('i');
      if (!input) return;
      const isHidden = input.type === 'password';
      input.type     = isHidden ? 'text' : 'password';
      icon.className = isHidden ? 'bi bi-eye-slash' : 'bi bi-eye';
      btn.setAttribute('aria-label', isHidden ? 'Ocultar senha' : 'Mostrar senha');
    });
  });
})();

/* ─── VALIDAÇÃO ──────────────────────────────────────────── */
function setFieldState(boxId, errId, msg, valid) {
  const box = $(`#${boxId}`);
  const err = $(`#${errId}`);
  if (box) {
    box.classList.toggle('is-error', !valid && msg !== null);
    box.classList.toggle('is-valid', valid);
  }
  if (err) err.textContent = (!valid && msg) ? msg : '';
}

function validateEmail(val) {
  const v = val.trim();
  if (!v) return 'E-mail é obrigatório.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'E-mail inválido.';
  return null;
}

function validateSenha(val) {
  if (!val) return 'Senha é obrigatória.';
  return null;
}

/* ─── LIVE VALIDATION ────────────────────────────────────── */
(function initLiveValidation() {
  const fields = [
    { id: 'email', box: 'box-email', err: 'err-email', fn: v => validateEmail(v) },
    { id: 'senha', box: 'box-senha', err: 'err-senha', fn: v => validateSenha(v) },
  ];

  fields.forEach(({ id, box, err, fn }) => {
    const input = $(`#${id}`);
    if (!input) return;
    let touched = false;

    input.addEventListener('blur', () => {
      touched = true;
      setFieldState(box, err, fn(input.value), !fn(input.value));
    });
    input.addEventListener('input', () => {
      if (!touched) return;
      setFieldState(box, err, fn(input.value), !fn(input.value));
    });
  });

  // Email status icon
  const emailInput  = $('#email');
  const emailStatus = $('#email-status');
  if (emailInput && emailStatus) {
    emailInput.addEventListener('input', () => {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim());
      emailStatus.className   = 'cad-input-status' + (emailInput.value ? (ok ? ' status-ok' : ' status-err') : '');
      emailStatus.textContent = emailInput.value ? (ok ? '✓' : '✗') : '';
    });
  }
})();

/* ─── HELPERS ────────────────────────────────────────────── */
function resetBtn(btn) {
  btn.disabled = false;
  btn.innerHTML = '<i class="bi bi-box-arrow-in-right me-2" aria-hidden="true"></i>Entrar na minha conta';
}

function escapeHtml(str) {
  const map = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' };
  return String(str).replace(/[&<>"']/g, m => map[m]);
}

// Guarda o e-mail globalmente para o botão de reenvio
let emailNaoVerificado = '';

/* ─── REENVIO DE VERIFICAÇÃO ─────────────────────────────── */
(function initReenvio() {
  const btn = $('#btn-reenviar');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (!emailNaoVerificado) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> Enviando…';

    let res, data;

    try {
      res = await fetch(API_REENVIO, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: emailNaoVerificado }),
      });
    } catch {
      Toast.show('🔌 Não foi possível conectar ao servidor.');
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i>Reenviar e-mail de confirmação';
      return;
    }

    try {
      data = await res.json();
    } catch {
      Toast.show('⚠️ Resposta inesperada do servidor.');
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i>Reenviar e-mail de confirmação';
      return;
    }

    if (data.success) {
      Toast.show('📧 E-mail de confirmação reenviado! Verifique sua caixa de entrada.', 5000);
      // Cooldown de 60s para evitar spam
      let segundos = 60;
      const intervalo = setInterval(() => {
        segundos--;
        btn.innerHTML = `<i class="bi bi-clock me-1"></i>Aguarde ${segundos}s`;
        if (segundos <= 0) {
          clearInterval(intervalo);
          btn.disabled = false;
          btn.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i>Reenviar e-mail de confirmação';
        }
      }, 1000);
    } else {
      Toast.show('⚠️ ' + (data.message || 'Erro ao reenviar e-mail.'));
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i>Reenviar e-mail de confirmação';
    }
  });
})();

/* ─── SUBMIT → API ───────────────────────────────────────── */
(function initFormSubmit() {
  const form   = $('#login-form');
  const submit = $('#login-submit-btn');
  if (!form || !submit) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = ($('#email') || {}).value || '';
    const senha = ($('#senha') || {}).value || '';

    // Validação client-side
    const erros = [
      { box: 'box-email', err: 'err-email', msg: validateEmail(email) },
      { box: 'box-senha', err: 'err-senha', msg: validateSenha(senha) },
    ];

    let hasError = false;
    erros.forEach(({ box, err, msg }) => {
      setFieldState(box, err, msg, !msg);
      if (msg) hasError = true;
    });

    if (hasError) {
      form.querySelector('.cad-input-box.is-error .cad-input')?.focus();
      return;
    }

    // Loading
    submit.disabled = true;
    submit.innerHTML = '<span class="spinner" aria-hidden="true"></span> Entrando…';

    // Esconde alert de e-mail não verificado
    $('#alert-nao-verificado')?.classList.add('d-none');

    const payload = { email: email.trim().toLowerCase(), senha };

    // ── 1. Erro de rede ──────────────────────────────────
    let res;
    try {
      res = await fetch(API_LOGIN, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
    } catch {
      Toast.show('🔌 Não foi possível conectar ao servidor. Verifique se o XAMPP está rodando.');
      resetBtn(submit);
      return;
    }

    // ── 2. Resposta não é JSON válido ────────────────────
    let data;
    try {
      data = await res.json();
    } catch {
      const raw = await res.text().catch(() => '(sem resposta)');
      console.error('[Pets4Pet] Resposta inválida do servidor:', raw);
      Toast.show('⚠️ Resposta inesperada do servidor. Verifique os logs do PHP no XAMPP.');
      resetBtn(submit);
      return;
    }

    // ── 3. Processa a resposta ───────────────────────────
    if (data.success) {
      // Salva o token JWT no localStorage
      localStorage.setItem('p4p_token',   data.data.token);
      localStorage.setItem('p4p_expira',  data.data.expira);
      localStorage.setItem('p4p_usuario', JSON.stringify(data.data.usuario));

      showSuccess(data.data.usuario.nome);
      return;
    }

    // ── E-mail não verificado (403 + email_verificado: false) ──
    if (res.status === 403 && data.data?.email_verificado === false) {
      emailNaoVerificado = email.trim().toLowerCase();
      const alertEl = $('#alert-nao-verificado');
      if (alertEl) alertEl.classList.remove('d-none');
      resetBtn(submit);
      return;
    }

    // ── Rate limit (429) ──────────────────────────────────
    if (res.status === 429) {
      Toast.show('⏳ Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.', 6000);
      resetBtn(submit);
      return;
    }

    // ── Credenciais erradas (401) ─────────────────────────
    if (res.status === 401) {
      setFieldState('box-email', 'err-email', null, false);
      setFieldState('box-senha', 'err-senha', data.message || 'E-mail ou senha incorretos.', false);
      $('#senha')?.focus();
      resetBtn(submit);
      return;
    }

    // ── Conta inativa (403 genérico) ──────────────────────
    Toast.show('⚠️ ' + (data.message || 'Erro ao fazer login.'));
    resetBtn(submit);
  });
})();

/* ─── SUCESSO ────────────────────────────────────────────── */
function showSuccess(nome) {
  const card = $('.login-form-card');
  if (!card) return;

  const overlay = document.createElement('div');
  overlay.className = 'login-success-overlay';
  overlay.innerHTML = `
    <div class="login-success-icon" aria-hidden="true">
      <i class="bi bi-person-check-fill"></i>
    </div>
    <h3>Olá, ${escapeHtml(nome)}! 🐾</h3>
    <p>Login realizado com sucesso. Redirecionando para o portal…</p>
    <div class="progress mt-2" style="width:200px;height:4px;background:var(--gray-100);border-radius:2px;overflow:hidden;">
      <div id="login-progress" style="height:100%;background:var(--petroleum-light);width:0%;transition:width 2.5s linear;border-radius:2px;"></div>
    </div>
  `;
  card.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.classList.add('show');
    setTimeout(() => {
      const bar = overlay.querySelector('#login-progress');
      if (bar) bar.style.width = '100%';
    }, 50);
  });

  Toast.show('🎉 Login realizado! Bem-vindo(a) de volta!', 5000);

  setTimeout(() => {
    window.location.href = '/pets4pet/frontend/index.html';
  }, 3000);
}

/* ─── VERIFICA STATUS DA URL (vindo do verificar.php) ───── */
(function checkUrlStatus() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status');

  const mensagens = {
    verificado:     { icon: '✅', text: 'E-mail confirmado! Agora você pode fazer login.' },
    ja_verificado:  { icon: 'ℹ️', text: 'Seu e-mail já estava confirmado. Faça login normalmente.' },
    link_invalido:  { icon: '⚠️', text: 'Link de verificação inválido ou expirado.' },
    token_invalido: { icon: '⚠️', text: 'Link de verificação inválido.' },
    erro_interno:   { icon: '❌', text: 'Erro ao confirmar e-mail. Tente novamente.' },
  };

  if (status && mensagens[status]) {
    const { icon, text } = mensagens[status];
    Toast.show(`${icon} ${text}`, 6000);

    // Limpa o ?status= da URL sem recarregar a página
    const url = new URL(window.location.href);
    url.searchParams.delete('status');
    window.history.replaceState({}, '', url.toString());
  }
})();