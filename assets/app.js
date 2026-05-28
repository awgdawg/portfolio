(function () {
  'use strict';

  // ===== KPI counter (count up when scrolled into view) =====
  const counters = document.querySelectorAll('.kpi-val[data-target]');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.target, 10);
      const suffix = el.dataset.suffix || '';
      const duration = 600;
      const start = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        const val = Math.round(target * eased);
        el.textContent = val + suffix;
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach((c) => counterObserver.observe(c));

  // ===== Scroll reveal (fade + 8px lift) =====
  const revealTargets = document.querySelectorAll('.kpi, .proj, .contact-card, .skill-group-label, .pill-row, .bq-embed');
  revealTargets.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = (i % 6) * 60 + 'ms';
  });
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-in');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealTargets.forEach((el) => revealObserver.observe(el));

  // ===== Active nav link on scroll =====
  const sections = document.querySelectorAll('main section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      navLinks.forEach((a) => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + id);
      });
    });
  }, { rootMargin: '-30% 0px -65% 0px' });
  sections.forEach((s) => navObserver.observe(s));

  // ===== Live BigQuery board tabs (with lazy iframe load) =====
  const bqTabs = document.querySelectorAll('.bq-tab');
  bqTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.target;
      bqTabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      document.querySelectorAll('.bq-panel').forEach((p) => {
        p.classList.toggle('active', p.id === targetId);
      });
      const panel = document.getElementById(targetId);
      if (panel) {
        panel.classList.add('reveal-in'); // ensure visible even if revealed while hidden
        const iframe = panel.querySelector('iframe[data-src]');
        if (iframe && !iframe.src) iframe.src = iframe.dataset.src; // lazy-load on first open
      }
    });
  });
})();
