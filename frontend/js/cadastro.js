/* ============================================================
   PETS4PET — cadastro.js
   Lógica do formulário de cadastro — comunicação com API PHP
   ============================================================ */

'use strict';

// ─── CONFIGURAÇÃO ─────────────────────────────────────────
const API_URL = 'http://localhost/pets4pet/backend/cad.php';

/* ─── UTILIDADES ─────────────────────────────────────────── */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// Toast (reutiliza o do style.css)
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

/* ─── TIPO DE CONTA ──────────────────────────────────────── */
(function initTipo() {
  const opts = $$('.cad-tipo-opt');
  opts.forEach(opt => {
    opt.addEventListener('click', () => {
      opts.forEach(o => o.classList.remove('cad-tipo-active'));
      opt.classList.add('cad-tipo-active');
      const radio = opt.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
    opt.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opt.click(); }
    });
  });
})();

/* ─── PASSWORD TOGGLE ────────────────────────────────────── */
(function initPasswordToggle() {
  $$('.cad-toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input    = $(`#${targetId}`);
      const icon     = btn.querySelector('i');
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'bi bi-eye-slash';
        btn.setAttribute('aria-label', 'Ocultar senha');
      } else {
        input.type = 'password';
        icon.className = 'bi bi-eye';
        btn.setAttribute('aria-label', 'Mostrar senha');
      }
    });
  });
})();

/* ─── FORÇA DE SENHA ─────────────────────────────────────── */
(function initPasswordStrength() {
  const senhaInput = $('#senha');
  const bars       = $$('.strength-bar');
  const label      = $('#strength-label');
  const rules      = {
    len:   $('#rule-len'),
    upper: $('#rule-upper'),
    num:   $('#rule-num'),
  };

  if (!senhaInput) return;

  const checkRule = (el, ok) => {
    if (!el) return;
    el.classList.toggle('rule-ok', ok);
    const icon = el.querySelector('i');
    if (icon) icon.className = ok ? 'bi bi-check-circle-fill' : 'bi bi-circle';
  };

  const calcStrength = (v) => {
    let score = 0;
    if (v.length >= 8)             score++;
    if (v.length >= 12)            score++;
    if (/[A-Z]/.test(v))          score++;
    if (/[0-9]/.test(v))          score++;
    if (/[^A-Za-z0-9]/.test(v))   score++;
    return Math.min(Math.floor(score / 5 * 4) + (score > 0 ? 1 : 0), 4);
  };

  const levels = [
    { cls: 'bar-weak',   text: 'Fraca'    },
    { cls: 'bar-fair',   text: 'Razoável' },
    { cls: 'bar-good',   text: 'Boa'      },
    { cls: 'bar-strong', text: 'Forte'    },
  ];

  senhaInput.addEventListener('input', () => {
    const v = senhaInput.value;
    const s = calcStrength(v);

    checkRule(rules.len,   v.length >= 8);
    checkRule(rules.upper, /[A-Z]/.test(v));
    checkRule(rules.num,   /[0-9]/.test(v));

    bars.forEach((bar, i) => {
      bar.className = 'strength-bar';
      if (v.length > 0 && i < s) {
        const clsList = ['bar-weak','bar-fair','bar-good','bar-strong'];
        bar.classList.add(clsList[Math.min(s - 1, 3)]);
      }
    });

    if (label) {
      const texts = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];
      label.textContent = v.length > 0 ? texts[s] || '' : '';
    }
  });
})();

/* ─── VALIDAÇÃO DE CAMPOS ────────────────────────────────── */
function setFieldState(boxId, errId, msg, valid) {
  const box = $(`#${boxId}`);
  const err = $(`#${errId}`);
  if (box) {
    box.classList.toggle('is-error', !valid && msg !== null);
    box.classList.toggle('is-valid', valid);
  }
  if (err) err.textContent = (!valid && msg) ? msg : '';
}

function validateNome(val) {
  const v = val.trim();
  if (!v)           return 'Nome é obrigatório.';
  if (v.length < 2) return 'Nome muito curto.';
  return null;
}
function validateSobrenome(val) {
  const v = val.trim();
  if (!v)           return 'Sobrenome é obrigatório.';
  if (v.length < 2) return 'Sobrenome muito curto.';
  return null;
}
function validateEmail(val) {
  const v = val.trim();
  if (!v) return 'E-mail é obrigatório.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'E-mail inválido.';
  return null;
}
function validateSenha(val) {
  if (!val)           return 'Senha é obrigatória.';
  if (val.length < 8) return 'Mínimo 8 caracteres.';
  if (!/[A-Z]/.test(val)) return 'Adicione uma letra maiúscula.';
  if (!/[0-9]/.test(val)) return 'Adicione um número.';
  return null;
}
function validateConfirmar(val, senha) {
  if (!val)          return 'Confirme a senha.';
  if (val !== senha) return 'As senhas não coincidem.';
  return null;
}

/* ─── LIVE VALIDATION ────────────────────────────────────── */
(function initLiveValidation() {
  const fields = [
    { id: 'nome',            box: 'box-nome',      err: 'err-nome',      fn: v => validateNome(v) },
    { id: 'sobrenome',       box: 'box-sobrenome', err: 'err-sobrenome', fn: v => validateSobrenome(v) },
    { id: 'email',           box: 'box-email',     err: 'err-email',     fn: v => validateEmail(v) },
    { id: 'senha',           box: 'box-senha',     err: 'err-senha',     fn: v => validateSenha(v) },
    { id: 'confirmar_senha', box: 'box-confirmar', err: 'err-confirmar',
      fn: v => validateConfirmar(v, ($('#senha') || {}).value || '') },
  ];

  fields.forEach(({ id, box, err, fn }) => {
    const input = $(`#${id}`);
    if (!input) return;
    let touched = false;

    input.addEventListener('blur', () => {
      touched = true;
      const msg = fn(input.value);
      setFieldState(box, err, msg, !msg);
    });
    input.addEventListener('input', () => {
      if (!touched) return;
      const msg = fn(input.value);
      setFieldState(box, err, msg, !msg);
    });
  });

  // Email: status icon
  const emailInput  = $('#email');
  const emailStatus = $('#email-status');
  if (emailInput && emailStatus) {
    emailInput.addEventListener('input', () => {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim());
      emailStatus.className   = 'cad-input-status' + (emailInput.value ? (ok ? ' status-ok' : ' status-err') : '');
      emailStatus.textContent = emailInput.value ? (ok ? '✓' : '✗') : '';
    });
  }

  // Termos
  const termos = $('#aceitar_termos');
  if (termos) {
    termos.addEventListener('change', () => {
      const err = $('#err-termos');
      if (err) err.textContent = termos.checked ? '' : 'Você precisa aceitar os termos.';
    });
  }
})();

/* ─── HELPERS DO SUBMIT ──────────────────────────────────── */
function resetBtn(btn) {
  btn.disabled = false;
  btn.innerHTML = '<i class="bi bi-person-plus-fill me-2"></i>Criar minha conta gratuita';
}

/* ─── SUBMIT → API ───────────────────────────────────────── */
(function initFormSubmit() {
  const form   = $('#cad-form');
  const submit = $('#cad-submit-btn');
  if (!form || !submit) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Coleta valores
    const nome           = ($('#nome')            || {}).value   || '';
    const sobrenome      = ($('#sobrenome')        || {}).value   || '';
    const email          = ($('#email')            || {}).value   || '';
    const telefone       = ($('#telefone')         || {}).value   || '';
    const senha          = ($('#senha')            || {}).value   || '';
    const confirmar      = ($('#confirmar_senha')  || {}).value   || '';
    const aceitar_termos = ($('#aceitar_termos')   || {}).checked || false;
    const newsletter     = ($('#newsletter')       || {}).checked || false;
    const tipo           = ($$('input[name="tipo"]').find(r => r.checked) || {}).value || 'tutor';

    // Valida todos os campos
    const campos = [
      { box: 'box-nome',      err: 'err-nome',      msg: validateNome(nome) },
      { box: 'box-sobrenome', err: 'err-sobrenome', msg: validateSobrenome(sobrenome) },
      { box: 'box-email',     err: 'err-email',     msg: validateEmail(email) },
      { box: 'box-senha',     err: 'err-senha',     msg: validateSenha(senha) },
      { box: 'box-confirmar', err: 'err-confirmar', msg: validateConfirmar(confirmar, senha) },
    ];

    let hasError = false;
    campos.forEach(({ box, err, msg }) => {
      setFieldState(box, err, msg, !msg);
      if (msg) hasError = true;
    });

    const erTermos = $('#err-termos');
    if (!aceitar_termos) {
      if (erTermos) erTermos.textContent = 'Você precisa aceitar os termos.';
      hasError = true;
    } else {
      if (erTermos) erTermos.textContent = '';
    }

    if (hasError) {
      const firstErr = form.querySelector('.cad-input-box.is-error .cad-input');
      if (firstErr) firstErr.focus();
      return;
    }

    // Loading
    submit.disabled = true;
    submit.innerHTML = '<span class="spinner" aria-hidden="true"></span> Criando conta…';

    const payload = {
      nome, sobrenome, email, telefone, senha,
      confirmar_senha: confirmar, tipo, aceitar_termos, newsletter,
    };

    // ── FETCH ────────────────────────────────────────────────
    let res, data;

    // 1. Erro de rede (servidor offline, CORS bloqueado, sem internet)
    try {
      res = await fetch(API_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
    } catch (networkErr) {
      Toast.show('🔌 Não foi possível conectar ao servidor. Verifique se o XAMPP está rodando.');
      resetBtn(submit);
      return;
    }

    // 2. Resposta chegou mas o body não é JSON válido
    //    (PHP retornou HTML de erro, warning ou notice antes do JSON)
    try {
      data = await res.json();
    } catch (parseErr) {
      // Tenta pegar o texto cru para logar no console e ajudar no debug
      const raw = await res.text().catch(() => '(sem resposta)');
      console.error('[Pets4Pet] Resposta inválida do servidor:', raw);
      Toast.show('⚠️ Resposta inesperada do servidor. Verifique os logs do PHP no XAMPP.');
      resetBtn(submit);
      return;
    }

    // 3. JSON chegou — processa normalmente
    if (data.success) {
      showSuccess(data.data?.nome || nome);
      return;
    }

    // Erros de validação retornados pela API (422)
    if (data.data?.erros && Array.isArray(data.data.erros)) {
      Toast.show('⚠️ ' + data.data.erros[0]);
    } else {
      Toast.show('⚠️ ' + (data.message || 'Erro ao cadastrar.'));
    }

    // E-mail duplicado (409)
    if (res.status === 409) {
      setFieldState('box-email', 'err-email', data.message, false);
      $('#email')?.focus();
    }

    resetBtn(submit);
  });
})();

/* ─── SUCESSO ────────────────────────────────────────────── */
function showSuccess(nome) {
  const card = $('.cad-form-card');
  if (!card) return;

  const overlay = document.createElement('div');
  overlay.className = 'cad-success-overlay';
  overlay.innerHTML = `
    <div class="success-icon-wrap" aria-hidden="true">
      <i class="bi bi-patch-check-fill"></i>
    </div>
    <h3>Bem-vindo(a), ${escapeHtml(nome)}! 🐾</h3>
    <p>Sua conta foi criada com sucesso. Redirecionando para o portal…</p>
    <div class="progress mt-2" style="width:200px;height:4px;background:var(--gray-100);border-radius:2px;overflow:hidden;">
      <div id="success-progress" style="height:100%;background:var(--sage-dark);width:0%;transition:width 2.5s linear;border-radius:2px;"></div>
    </div>
  `;
  card.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.classList.add('show');
    setTimeout(() => {
      const bar = overlay.querySelector('#success-progress');
      if (bar) bar.style.width = '100%';
    }, 50);
  });

  Toast.show('🎉 Cadastro realizado! Bem-vindo(a) à família Pets4Pet!', 5000);

  setTimeout(() => {
    window.location.href = './login.html';
  }, 3000);
}

function escapeHtml(str) {
  const map = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' };
  return String(str).replace(/[&<>"']/g, m => map[m]);
}