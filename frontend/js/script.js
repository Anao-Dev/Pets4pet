/* ============================================================
   PETS4PET PORTAL — script.js
   Vanilla JS · Animações, Interações & UX Premium
   ============================================================ */

'use strict';

/* ─── UTILITIES ──────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ─── 1. HEADER SCROLL BEHAVIOUR ────────────────────────── */
(function initHeader() {
  const header = $('.p4p-header');
  if (!header) return;

  let lastY = 0;
  let ticking = false;

  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = window.scrollY;
        header.classList.toggle('scrolled', y > 20);
        header.classList.toggle('header-hidden', y > lastY + 8 && y > 120);
        header.classList.toggle('header-visible', y < lastY - 8);
        lastY = y;
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
})();

/* ─── 2. INTERSECTION OBSERVER — ENTER ANIMATIONS ───────── */
(function initAnimations() {
  const items = $$('[data-animate]');
  if (!items.length) return;

  // Respect reduced-motion
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const delay = parseInt(entry.target.dataset.delay || '0', 10);
        setTimeout(() => {
          entry.target.classList.add('is-visible');
        }, delay);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  items.forEach(el => observer.observe(el));
})();

/* ─── 3. COUNTER ANIMATION ───────────────────────────────── */
(function initCounters() {
  const counters = $$('.stat-number[data-target]');
  if (!counters.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const easeOutQuart = t => 1 - Math.pow(1 - t, 4);

  const animateCounter = (el) => {
    const target = parseInt(el.dataset.target, 10);
    const duration = prefersReduced ? 0 : 1800;
    const start = performance.now();

    const formatNumber = (n) => {
      if (n >= 1000) return n.toLocaleString('pt-BR');
      return n.toString();
    };

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      const current = Math.round(eased * target);
      el.textContent = formatNumber(current);
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach(el => observer.observe(el));
})();

/* ─── 4. TOAST SYSTEM ────────────────────────────────────── */
const Toast = (() => {
  const toast = $('#toast');
  const msg = $('#toast-msg');
  let timer = null;

  const show = (text, duration = 3500) => {
    if (!toast || !msg) return;
    msg.textContent = text;
    toast.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => toast.classList.remove('show'), duration);
  };

  return { show };
})();

/* ─── 5. NEWSLETTER FORM ─────────────────────────────────── */
(function initNewsletter() {
  const btn = $('#newsletter-btn');
  const input = $('#newsletter-email');
  if (!btn || !input) return;

  const validate = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  btn.addEventListener('click', () => {
    const val = input.value.trim();

    if (!val) {
      Toast.show('⚠️ Por favor, insira seu e-mail.');
      input.focus();
      input.classList.add('input-error');
      return;
    }
    if (!validate(val)) {
      Toast.show('⚠️ E-mail inválido. Tente novamente.');
      input.focus();
      input.classList.add('input-error');
      return;
    }

    input.classList.remove('input-error');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i> Enviando…';

    // Simulate async
    setTimeout(() => {
      Toast.show('🐾 Eba! Você está na lista. Bem-vindo(a) à família Pets4Pet!', 4000);
      input.value = '';
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Inscrito!';
      setTimeout(() => {
        btn.innerHTML = '<i class="bi bi-send-fill me-1"></i> Quero receber!';
      }, 3000);
    }, 1200);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btn.click();
  });

  input.addEventListener('input', () => input.classList.remove('input-error'));
})();

/* ─── 6. SEARCH BAR ──────────────────────────────────────── */
(function initSearch() {
  const searchInput = $('.p4p-search-input');
  const searchBtn = $('.p4p-btn-search');
  const tags = $$('.p4p-tag');

  if (!searchInput || !searchBtn) return;

  // Tags populate the search input
  tags.forEach(tag => {
    tag.addEventListener('click', () => {
      searchInput.value = tag.textContent.trim();
      searchInput.focus();
      tags.forEach(t => t.classList.remove('tag-active'));
      tag.classList.add('tag-active');
    });
  });

  // Search button
  searchBtn.addEventListener('click', () => {
    const val = searchInput.value.trim();
    if (!val) {
      searchInput.focus();
      searchInput.classList.add('input-shake');
      setTimeout(() => searchInput.classList.remove('input-shake'), 500);
      return;
    }
    Toast.show(`🔍 Buscando por "${val}"…`);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchBtn.click();
  });
})();

/* ─── 7. SERVICE CARDS — RIPPLE EFFECT ──────────────────── */
(function initRipple() {
  const cards = $$('.p4p-service-card, .p4p-highlight-card, .p4p-btn-primary, .p4p-btn-white');

  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ripple = document.createElement('span');
      ripple.className = 'p4p-ripple';
      ripple.style.cssText = `left:${x}px;top:${y}px`;
      card.appendChild(ripple);

      ripple.addEventListener('animationend', () => ripple.remove());
    });
  });
})();

/* ─── 8. HIGHLIGHT CARD BUTTONS ─────────────────────────── */
(function initHighlightBtns() {
  $$('.p4p-btn-card').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.p4p-highlight-card');
      const name = card?.querySelector('.highlight-name')?.textContent || 'perfil';
      Toast.show(`✅ Abrindo perfil: ${name}`);
    });
  });
})();

/* ─── 9. SERVICE CTA LINKS ───────────────────────────────── */
(function initServiceLinks() {
  $$('.service-cta').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const title = link.closest('.p4p-service-card')?.querySelector('.service-title')?.textContent || 'serviço';
      Toast.show(`🐾 Abrindo módulo: ${title}`);
    });
  });
})();

/* ─── 12. MOBILE NAV — SMOOTH CLOSE ON LINK CLICK ───────── */
(function initMobileNav() {
  const navCollapse = $('#navbarMain');
  if (!navCollapse) return;

  $$('.p4p-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 992 && navCollapse.classList.contains('show')) {
        const bsCollapse = bootstrap.Collapse.getInstance(navCollapse);
        bsCollapse?.hide();
      }
    });
  });
})();

/* ─── 13. ACTIVE NAV LINK ON SCROLL ──────────────────────── */
(function initActiveNav() {
  const sections = $$('section[id]');
  const links = $$('.p4p-nav-link[href^="#"]');
  if (!sections.length || !links.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        links.forEach(link => {
          link.classList.toggle('nav-link-active', link.getAttribute('href') === `#${entry.target.id}`);
        });
      });
    },
    { threshold: 0.4, rootMargin: '-80px 0px 0px 0px' }
  );

  sections.forEach(s => observer.observe(s));
})();

/* ─── 14. BACK TO TOP ────────────────────────────────────── */
(function initBackToTop() {
  const btn = document.createElement('button');
  btn.className = 'p4p-back-top';
  btn.setAttribute('aria-label', 'Voltar ao topo');
  btn.innerHTML = '<i class="bi bi-arrow-up"></i>';
  document.body.appendChild(btn);

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

/* ─── 15. PARALLAX HERO ORBS (subtle) ────────────────────── */
(function initParallax() {
  const orbs = $$('.orb');
  if (!orbs.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = window.scrollY;
        orbs[0] && (orbs[0].style.transform = `translateY(${y * 0.18}px)`);
        orbs[1] && (orbs[1].style.transform = `translateY(${-y * 0.12}px)`);
        orbs[2] && (orbs[2].style.transform = `translateY(${y * 0.08}px)`);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();

/* ─── 16. HERO STAT CARDS MOUSE TILT ────────────────────── */
(function initTilt() {
  const hub = $('.hero-card-stack');
  if (!hub || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.innerWidth < 992) return;

  hub.addEventListener('mousemove', (e) => {
    const rect = hub.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);

    hub.style.transform = `perspective(700px) rotateY(${dx * 6}deg) rotateX(${-dy * 6}deg)`;
  });

  hub.addEventListener('mouseleave', () => {
    hub.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
    hub.style.transform = 'perspective(700px) rotateY(0deg) rotateX(0deg)';
    setTimeout(() => hub.style.transition = '', 600);
  });
})();

/* ─── 17. FOOTER SOCIAL HOVER AUDIO HINT (accessible) ──── */
(function initFooterLinks() {
  $$('.footer-social a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const label = link.getAttribute('aria-label') || 'rede social';
      Toast.show(`📱 ${label} — em breve!`);
    });
  });
})();

/* ─── 18. SMOOTH SCROLL FOR ANCHOR LINKS ─────────────────── */
(function initSmoothScroll() {
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = link.getAttribute('href');
      if (target === '#' || target.length <= 1) return;
      const el = $(target);
      if (!el) return;
      e.preventDefault();
      const offset = 80; // header height
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();

/* ─── 19. INPUT ERROR CLEAR ON FOCUS ─────────────────────── */
(function initInputFeedback() {
  $$('input').forEach(input => {
    input.addEventListener('focus', () => input.classList.remove('input-error'));
  });
})();