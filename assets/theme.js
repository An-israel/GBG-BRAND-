/* GBG Bargain Shop – theme behaviour.
 * Small, dependency-free web components (no jQuery). Loaded with `defer`.
 * Every component cleans up its listeners in disconnectedCallback via an
 * AbortController, so re-rendered sections never leak handlers.
 */
(() => {
  'use strict';

  const GBG = window.GBG || {};
  const routes = GBG.routes || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const announce = (msg) => {
    const live = $('#LiveRegion');
    if (live) { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 50); }
  };
  const fetchWithTimeout = (url, opts = {}, ms = 10000) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(timer));
  };
  const track = (name, data = {}) => {
    try {
      if (window.Shopify && Shopify.analytics && typeof Shopify.analytics.publish === 'function') {
        Shopify.analytics.publish(name, { ...data, page: location.pathname });
      }
    } catch (e) { /* analytics must never break the page */ }
  };
  const storage = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };

  /* ---------------------------------------------------------------------
   * Dialogs: menus, drawers, modals. <dialog> gives focus trapping + Esc.
   * ------------------------------------------------------------------- */
  let lastTrigger = null;
  function openDialog(dialog, trigger) {
    if (!dialog || dialog.open) return;
    lastTrigger = trigger || document.activeElement;
    dialog.showModal();
    document.documentElement.style.overflow = 'hidden';
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
  }
  function closeDialog(dialog) {
    if (!dialog || !dialog.open) return;
    dialog.close();
  }
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open-dialog]');
    if (opener) {
      e.preventDefault();
      openDialog(document.getElementById(opener.dataset.openDialog), opener);
      return;
    }
    const closer = e.target.closest('[data-close-dialog]');
    if (closer) { closeDialog(closer.closest('dialog')); return; }
    // Click on the backdrop (the dialog element itself) closes it.
    if (e.target instanceof HTMLDialogElement && e.target.open) {
      const r = e.target.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside || e.target.classList.contains('zoom-modal')) closeDialog(e.target);
    }
  });
  document.addEventListener('close', (e) => {
    if (!(e.target instanceof HTMLDialogElement)) return;
    if (!$$('dialog[open]').length) document.documentElement.style.overflow = '';
    if (lastTrigger) {
      lastTrigger.setAttribute('aria-expanded', 'false');
      if (document.contains(lastTrigger)) lastTrigger.focus();
      lastTrigger = null;
    }
  }, true);

  // Desktop nav: close other open dropdowns, close on outside click / Esc.
  document.addEventListener('toggle', (e) => {
    const d = e.target;
    if (!(d instanceof HTMLDetailsElement) || !d.matches('[data-nav-details]') || !d.open) return;
    $$('[data-nav-details][open]').forEach((other) => { if (other !== d) other.open = false; });
  }, true);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-nav-details]')) $$('[data-nav-details][open]').forEach((d) => { d.open = false; });
  });
  if (window.matchMedia('(hover: hover) and (min-width: 990px)').matches) {
    $$('[data-nav-details]').forEach((d) => {
      const item = d.closest('.nav__item') || d;
      let t;
      item.addEventListener('mouseenter', () => { clearTimeout(t); t = setTimeout(() => { d.open = true; }, 80); });
      item.addEventListener('mouseleave', () => { clearTimeout(t); t = setTimeout(() => { d.open = false; }, 200); });
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    $$('[data-nav-details][open]').forEach((d) => { d.open = false; d.querySelector('summary').focus(); });
  });

  /* ---------------------------------------------------------------------
   * Predictive search
   * ------------------------------------------------------------------- */
  class PredictiveSearch extends HTMLElement {
    connectedCallback() {
      this.ac = new AbortController();
      const { signal } = this.ac;
      this.input = $('input[type="search"]', this);
      this.results = $('[data-predictive-results]', this);
      this.cache = new Map();
      this.timer = null;
      this.input.addEventListener('input', () => {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.search(this.input.value.trim()), 220);
      }, { signal });
      this.input.addEventListener('focus', () => { if (this.input.value.trim().length > 1 && this.results.innerHTML) this.open(); }, { signal });
      this.input.addEventListener('keydown', (e) => this.onKey(e), { signal });
      document.addEventListener('click', (e) => { if (!this.contains(e.target)) this.close(); }, { signal });
    }
    disconnectedCallback() { this.ac.abort(); clearTimeout(this.timer); }
    async search(q) {
      if (q.length < 2) { this.close(); return; }
      if (this.cache.has(q)) { this.render(this.cache.get(q)); return; }
      try {
        const url = `${routes.predictiveSearch}?q=${encodeURIComponent(q)}&section_id=predictive-search&resources[type]=product,collection,query&resources[limit]=6&resources[options][fields]=title,product_type,variants.sku,tag`;
        const res = await fetchWithTimeout(url);
        if (!res.ok) throw new Error(res.status);
        const html = new DOMParser().parseFromString(await res.text(), 'text/html');
        const inner = $('.predictive__inner', html);
        const out = inner ? inner.outerHTML : '';
        this.cache.set(q, out);
        if (this.input.value.trim() === q) this.render(out);
      } catch (e) { this.close(); }
    }
    render(html) {
      this.results.innerHTML = html;
      if (html) this.open(); else this.close();
      const count = $('[data-predictive-count]', this.results);
      if (count) announce(`${count.dataset.predictiveCount} suggestions available`);
    }
    open() { this.results.hidden = false; this.input.setAttribute('aria-expanded', 'true'); }
    close() { this.results.hidden = true; this.input.setAttribute('aria-expanded', 'false'); this.input.removeAttribute('aria-activedescendant'); }
    onKey(e) {
      if (e.key === 'Escape') { this.close(); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const options = $$('[role="option"]', this.results);
      if (!options.length || this.results.hidden) return;
      e.preventDefault();
      let i = options.findIndex((o) => o.getAttribute('aria-selected') === 'true');
      if (i > -1) options[i].setAttribute('aria-selected', 'false');
      i = e.key === 'ArrowDown' ? (i + 1) % options.length : (i - 1 + options.length) % options.length;
      options[i].setAttribute('aria-selected', 'true');
      this.input.setAttribute('aria-activedescendant', options[i].id);
      options[i].scrollIntoView({ block: 'nearest' });
    }
  }
  customElements.define('predictive-search', PredictiveSearch);
  // Enter on a highlighted suggestion follows its link.
  document.addEventListener('submit', (e) => {
    const ps = e.target.closest('predictive-search');
    if (!ps) return;
    const sel = $('[aria-selected="true"] a', ps);
    if (sel) { e.preventDefault(); location.href = sel.href; }
  });

  /* ---------------------------------------------------------------------
   * Cart: add, change, re-render with the Section Rendering API
   * ------------------------------------------------------------------- */
  const Cart = {
    drawer: () => $('[data-cart-drawer]'),
    updateCount(count) {
      $$('[data-cart-count]').forEach((el) => {
        el.textContent = count;
        el.hidden = count === 0;
        el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
      });
      $$('[data-cart-toggle]').forEach((el) => el.setAttribute('aria-label', `Basket, ${count} ${count === 1 ? 'item' : 'items'}`));
    },
    renderSections(sections) {
      const html = sections && sections['cart-drawer'];
      if (!html) return;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const fresh = $('[data-cart-contents]', doc);
      if (!fresh) return;
      $$('[data-cart-contents]').forEach((el) => { el.innerHTML = fresh.innerHTML; el.removeAttribute('aria-busy'); });
      const count = parseInt(fresh.dataset.count || '0', 10);
      this.updateCount(count);
      $$('.cart-page__continue').forEach((el) => { el.hidden = count === 0; });
    },
    async add(formData) {
      formData.append('sections', 'cart-drawer');
      formData.append('sections_url', location.pathname);
      const res = await fetchWithTimeout(`${routes.cartAdd}.js`, {
        method: 'POST', body: formData, headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      });
      const data = await res.json();
      if (!res.ok || data.status) throw new Error(data.description || data.message || 'Sorry, this item could not be added.');
      this.renderSections(data.sections);
      return data;
    },
    async change(line, quantity) {
      $$('[data-cart-contents]').forEach((el) => el.setAttribute('aria-busy', 'true'));
      try {
        const res = await fetchWithTimeout(`${routes.cartChange}.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ line, quantity, sections: 'cart-drawer', sections_url: location.pathname }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.description || 'Could not update your basket.');
        this.renderSections(data.sections);
        announce('Basket updated');
      } catch (err) {
        $$('[data-cart-contents]').forEach((el) => el.removeAttribute('aria-busy'));
        announce(err.message);
        alert(err.message); // eslint-disable-line no-alert
      }
    },
    open(trigger) {
      if (GBG.cartType === 'page') { location.href = routes.cart; return; }
      openDialog(this.drawer(), trigger);
    },
  };

  const qtyTimers = {};
  // A Remove (or typed quantity) cancels pending +/− taps, so a removed item can't come back.
  const clearQtyTimers = () => Object.keys(qtyTimers).forEach((k) => { clearTimeout(qtyTimers[k]); delete qtyTimers[k]; });
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-cart-toggle]');
    if (toggle && GBG.cartType !== 'page' && !document.body.classList.contains('template-cart')) {
      e.preventDefault();
      Cart.open(toggle);
      return;
    }
    const qtyBtn = e.target.closest('[data-qty-change]');
    if (qtyBtn) {
      // Update the number straight away and send one request once the taps stop,
      // so fast double taps add up instead of being lost.
      const input = $('input', qtyBtn.closest('[data-qty]'));
      let next = Math.max(0, parseInt(input.value || '0', 10) + parseInt(qtyBtn.dataset.qtyChange, 10));
      const max = input.max ? parseInt(input.max, 10) : Infinity;
      if (next > max) { next = max; announce(`Only ${max} available`); }
      input.value = next;
      const line = parseInt(input.dataset.lineInput, 10);
      clearTimeout(qtyTimers[line]);
      qtyTimers[line] = setTimeout(() => Cart.change(line, next), 350);
      return;
    }
    const remove = e.target.closest('[data-remove]');
    if (remove) { clearQtyTimers(); Cart.change(parseInt(remove.dataset.remove, 10), 0); }
  });
  document.addEventListener('change', (e) => {
    const input = e.target.closest('[data-line-input]');
    if (input) clearQtyTimers();
    if (input) Cart.change(parseInt(input.dataset.lineInput, 10), Math.max(0, parseInt(input.value || '0', 10)));
  });

  // Product form + quick add
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('form[action*="/cart/add"]');
    if (!form || GBG.cartType === 'page') return;
    e.preventDefault();
    const submitter = e.submitter || $('[type="submit"]', form);
    const errorBox = $('[data-form-error]', form);
    if (errorBox) errorBox.hidden = true;
    if (submitter) { submitter.setAttribute('aria-disabled', 'true'); submitter.setAttribute('aria-busy', 'true'); }
    try {
      const data = await Cart.add(new FormData(form));
      announce(`${data.product_title || 'Item'} added to your basket`);
      track('gbg_add_to_cart_ui', { variant_id: data.variant_id });
      Cart.open(submitter);
    } catch (err) {
      if (errorBox) { errorBox.textContent = err.message; errorBox.hidden = false; } else { alert(err.message); } // eslint-disable-line no-alert
      announce(err.message);
    } finally {
      if (submitter) { submitter.removeAttribute('aria-disabled'); submitter.removeAttribute('aria-busy'); }
    }
  });

  /* ---------------------------------------------------------------------
   * Product page: variants, gallery, zoom, sticky bar, pickup
   * ------------------------------------------------------------------- */
  function initProduct(root) {
    const ac = new AbortController();
    const { signal } = ac;
    const form = $('[data-product-form]', root) || $('#ProductForm', root);
    const variantsEl = $('[data-variants]', root);
    const variants = variantsEl ? JSON.parse(variantsEl.textContent) : null;
    const idInput = $('[data-variant-id]', root);
    const addBtn = $('[data-add-button]', root);
    const addLabel = $('[data-add-label]', root);
    const stickyBtn = $('[data-sticky-button]', root);
    const stickyPrice = $('[data-sticky-price]', root);
    const pickup = $('pickup-availability', root);

    if (variants && form) {
      form.addEventListener('change', (e) => {
        if (!e.target.matches('[data-option-index]')) return;
        const selected = $$('[data-option-index]:checked', form).map((i) => i.value);
        $$('[data-option-selected]', form).forEach((el, i) => { el.textContent = selected[i] || ''; });
        const v = variants.find((x) => x.options.every((o, i) => o === selected[i]));
        const available = !!(v && v.available);
        if (v) {
          idInput.value = v.id;
          const url = new URL(location.href);
          url.searchParams.set('variant', v.id);
          history.replaceState({}, '', url);
          renderPrice(v);
          renderStock(v);
          if (v.featured_media) scrollToSlide(`Slide-${v.featured_media}`);
          if (pickup) { pickup.dataset.variantId = v.id; pickup.hidden = !available; pickup.load(); }
          const sku = $('[data-sku]', root); if (sku) sku.textContent = v.sku || sku.textContent;
        }
        const label = !v ? 'Unavailable' : (available ? 'Add to basket' : 'Sold out');
        addBtn.disabled = !available; addLabel.textContent = label;
        if (stickyBtn) { stickyBtn.disabled = !available; stickyBtn.textContent = label; }
      }, { signal });
    }

    function renderPrice(v) {
      const box = $('[data-product-price] [data-price]', root);
      if (!box) return;
      const onSale = v.compare_at_price && v.compare_at_price > v.price;
      box.className = `price price--large${onSale ? ' price--sale' : ''}${v.available ? '' : ' price--sold-out'}`;
      box.innerHTML = onSale
        ? `<span class="visually-hidden">Sale price</span><span class="price__tag">${v.price_html}</span><span class="visually-hidden">Regular price</span><s class="price__compare">${v.compare_html}</s><span class="price__saving">Save ${v.saving_html}</span>`
        : `<span class="price__regular">${v.price_html}</span>`;
      if (stickyPrice) stickyPrice.innerHTML = v.price_html;
    }
    function renderStock(v) {
      const el = $('[data-product-stock] [data-stock]', root);
      if (!el) return;
      let cls = 'in'; let text = 'In stock';
      if (!v.available) { cls = 'out'; text = 'Sold out'; } else if (v.qty === 1) { cls = 'low'; text = 'Only 1 left'; }
      el.innerHTML = `<span class="stock__dot stock__dot--${cls}" aria-hidden="true"></span> ${text}`;
    }

    // Gallery
    const track_ = $('[data-gallery-track]', root);
    const counter = $('[data-gallery-current]', root);
    function scrollToSlide(id) {
      const slide = document.getElementById(id);
      if (slide && track_) track_.scrollTo({ left: slide.offsetLeft - track_.offsetLeft, behavior: 'smooth' });
    }
    $$('[data-thumb]', root).forEach((btn) => btn.addEventListener('click', () => scrollToSlide(btn.dataset.thumb), { signal }));
    if (track_ && 'IntersectionObserver' in window) {
      const slides = $$('.gallery__slide', track_);
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const idx = slides.indexOf(en.target);
          if (counter) counter.textContent = idx + 1;
          $$('[data-thumb]', root).forEach((b) => b.setAttribute('aria-current', String(b.dataset.thumb === en.target.id)));
        });
      }, { root: track_, threshold: 0.6 });
      slides.forEach((s) => io.observe(s));
      signal.addEventListener('abort', () => io.disconnect());
    }
    // Zoom on tap
    const zoomModal = $('[data-zoom-modal]', root);
    const zoomImg = $('[data-zoom-img]', root);
    $$('[data-zoom]', root).forEach((btn) => btn.addEventListener('click', () => {
      if (!zoomModal) return;
      const img = $('img', btn);
      zoomImg.src = btn.dataset.zoom;
      zoomImg.alt = img ? img.alt : '';
      openDialog(zoomModal, btn);
    }, { signal }));

    // Sticky add-to-basket once the main button scrolls away
    const sticky = $('[data-sticky-atc]', root);
    const main = $('[data-main-atc]', root);
    if (sticky && main) {
      // A passive scroll check (rAF-throttled) is used instead of IntersectionObserver,
      // which misses the change when the page jumps past the button in one scroll.
      sticky.hidden = false;
      let ticking = false;
      const update = () => {
        ticking = false;
        const show = main.getBoundingClientRect().bottom < 0;
        if (show === sticky.classList.contains('is-visible')) return;
        sticky.classList.toggle('is-visible', show);
        sticky.setAttribute('aria-hidden', String(!show));
        if (stickyBtn) stickyBtn.tabIndex = show ? 0 : -1;
      };
      window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true, signal });
      requestAnimationFrame(update);
    }
    return ac;
  }

  class PickupAvailability extends HTMLElement {
    connectedCallback() { if (!this.hidden) this.load(); }
    async load() {
      if (!this.dataset.variantId) return;
      try {
        const res = await fetchWithTimeout(`${this.dataset.baseUrl}variants/${this.dataset.variantId}/?section_id=pickup-availability`);
        if (!res.ok) throw new Error();
        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        const inner = $('.pickup__inner', doc);
        this.innerHTML = inner ? inner.outerHTML : '';
      } catch (e) { this.innerHTML = ''; }
    }
  }
  customElements.define('pickup-availability', PickupAvailability);

  class ProductRecommendations extends HTMLElement {
    connectedCallback() {
      if (this.children.length || !this.dataset.url) return;
      const io = new IntersectionObserver(async ([en]) => {
        if (!en.isIntersecting) return;
        io.disconnect();
        try {
          const res = await fetchWithTimeout(this.dataset.url);
          const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
          const fresh = $('product-recommendations', doc);
          if (fresh && fresh.innerHTML.trim()) this.innerHTML = fresh.innerHTML;
        } catch (e) { /* optional section */ }
      }, { rootMargin: '0px 0px 400px 0px' });
      io.observe(this);
    }
  }
  customElements.define('product-recommendations', ProductRecommendations);

  /* ---------------------------------------------------------------------
   * Tabs (featured products)
   * ------------------------------------------------------------------- */
  class GbgTabs extends HTMLElement {
    connectedCallback() {
      this.ac = new AbortController();
      const tabs = $$('[role="tab"]', this);
      const select = (tab) => {
        tabs.forEach((t) => {
          const on = t === tab;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          const panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) panel.hidden = !on;
        });
      };
      tabs.forEach((t, i) => {
        t.addEventListener('click', () => select(t), { signal: this.ac.signal });
        t.addEventListener('keydown', (e) => {
          let n = null;
          if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
          if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
          if (e.key === 'Home') n = tabs[0];
          if (e.key === 'End') n = tabs[tabs.length - 1];
          if (n) { e.preventDefault(); select(n); n.focus(); }
        }, { signal: this.ac.signal });
      });
    }
    disconnectedCallback() { this.ac.abort(); }
  }
  customElements.define('gbg-tabs', GbgTabs);

  /* ---------------------------------------------------------------------
   * Collections: auto-submit sort, load more
   * ------------------------------------------------------------------- */
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-autosubmit]');
    if (el) { el.form.submit(); return; }
    // Desktop sidebar (drawer not open as a pop-up): apply a ticked filter straight away.
    const box = e.target.closest('[data-facets-form] input[type="checkbox"]');
    const drawer = box && box.closest('dialog');
    if (box && drawer && !drawer.open && window.matchMedia('(min-width: 990px)').matches) box.form.requestSubmit();
  });
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-load-more]');
    if (!btn) return;
    e.preventDefault();
    if (btn.getAttribute('aria-busy') === 'true') return;
    btn.setAttribute('aria-busy', 'true');
    const label = btn.textContent;
    btn.textContent = 'Loading…';
    try {
      const url = new URL(btn.href, location.origin);
      url.searchParams.set('section_id', btn.dataset.section);
      const res = await fetchWithTimeout(url.toString());
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      const grid = document.getElementById(btn.dataset.grid);
      const items = $$(`#${btn.dataset.grid} > li`, doc);
      const firstNew = items[0];
      items.forEach((li) => grid.appendChild(document.importNode(li, true)));
      const nextWrap = $('[data-load-more-wrap]', doc);
      const wrap = btn.closest('[data-load-more-wrap]');
      if (nextWrap) wrap.replaceWith(document.importNode(nextWrap, true)); else wrap.remove();
      announce(`${items.length} more products loaded`);
      if (firstNew) {
        const link = $(`#${btn.dataset.grid} > li:nth-last-child(${items.length}) a.card__link`);
        if (link) link.focus({ preventScroll: true });
      }
    } catch (err) {
      location.href = btn.href; // graceful fallback to normal pagination
    } finally {
      btn.removeAttribute('aria-busy');
      btn.textContent = label;
    }
  });

  /* ---------------------------------------------------------------------
   * Click-to-load map (no Google request until the visitor asks)
   * ------------------------------------------------------------------- */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-load-map]');
    if (!btn) return;
    const map = btn.closest('[data-map]');
    const iframe = document.createElement('iframe');
    iframe.src = btn.dataset.src;
    iframe.title = 'Map showing GBG Bargain Shop';
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    map.innerHTML = '';
    map.appendChild(iframe);
    track('directions_click', { source: 'map' });
  });

  /* ---------------------------------------------------------------------
   * Product cards: tap (touch screens) or swipe to see the second photo
   * ------------------------------------------------------------------- */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-card-swap]');
    if (!btn) return;
    e.preventDefault();
    const card = btn.closest('[data-product-card]');
    const on = !card.classList.contains('is-swapped');
    card.classList.toggle('is-swapped', on);
    btn.setAttribute('aria-pressed', String(on));
  });
  let swipeStart = null;
  document.addEventListener('touchstart', (e) => {
    const media = e.target.closest('.card__media--swap');
    swipeStart = media ? { x: e.touches[0].clientX, y: e.touches[0].clientY, media } : null;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!swipeStart) return;
    const dx = e.changedTouches[0].clientX - swipeStart.x;
    const dy = e.changedTouches[0].clientY - swipeStart.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const card = swipeStart.media.closest('[data-product-card]');
      const btn = card && card.querySelector('[data-card-swap]');
      if (btn) btn.click();
    }
    swipeStart = null;
  }, { passive: true });

  /* ---------------------------------------------------------------------
   * Custom analytics events (consent is enforced by Shopify Customer Events)
   * ------------------------------------------------------------------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-track]');
    if (el) track(el.dataset.track, { href: el.getAttribute('href') || '' });
  });

  /* ---------------------------------------------------------------------
   * Misc: reveal on scroll, confirm buttons, announcement end dates,
   * cookie preferences link, newsletter prompt
   * ------------------------------------------------------------------- */
  function initReveal() {
    const els = $$('.reveal');
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => io.observe(el));
  }

  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-confirm]');
    if (c && !window.confirm(c.dataset.confirm)) e.preventDefault(); // eslint-disable-line no-alert
    const rec = e.target.closest('[data-show-recover]');
    if (rec) { const r = $('#recover'); if (r) { r.style.display = 'block'; setTimeout(() => $('input', r).focus(), 50); } } // after the #recover jump
  });

  function hideExpiredAnnouncements() {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    $$('.announcement__msg[data-end]').forEach((el) => { if (/^\d{4}-\d{2}-\d{2}$/.test(el.dataset.end) && el.dataset.end < today) el.remove(); });
    const bar = $('.announcement');
    if (bar && !$('.announcement__msg', bar)) { bar.remove(); return; }
    initAnnouncementRotation(bar);
  }

  // Phones show one message at a time: rotate every 6 s; stops for good as soon as the
  // shopper interacts (tap, focus) or prefers reduced motion. The arrow shows the next one.
  function initAnnouncementRotation(bar) {
    if (!bar) return;
    const msgs = $$('.announcement__msg', bar);
    const next = $('[data-announcement-next]', bar);
    if (msgs.length < 2) { bar.classList.remove('announcement--multi'); if (next) next.remove(); return; }
    if (!msgs.some((m) => m.classList.contains('is-active'))) msgs[0].classList.add('is-active');
    let i = msgs.findIndex((m) => m.classList.contains('is-active'));
    const show = (n) => { msgs[i].classList.remove('is-active'); i = (n + msgs.length) % msgs.length; msgs[i].classList.add('is-active'); };
    let timer = null;
    const stop = () => { clearInterval(timer); timer = null; };
    if (next) next.addEventListener('click', () => { stop(); show(i + 1); });
    bar.addEventListener('focusin', stop);
    bar.addEventListener('touchstart', stop, { passive: true });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && window.matchMedia('(max-width: 989px)').matches) {
      timer = setInterval(() => { if (!document.hidden) show(i + 1); }, 6000);
    }
  }

  // Address forms: pre-select the saved country (Shopify outputs the list without a selection).
  function initCountrySelects() {
    $$('select[data-default]').forEach((sel) => {
      const want = sel.dataset.default;
      const opt = Array.from(sel.options).find((o) => o.value === want || o.textContent.trim() === want);
      if (opt) sel.value = opt.value;
    });
  }

  function initCookieButton() {
    const btn = $('[data-cookie-preferences]');
    if (!btn) return;
    const show = () => { if (window.privacyBanner && typeof window.privacyBanner.showPreferences === 'function') btn.hidden = false; };
    show();
    document.addEventListener('visitorConsentCollected', show);
    setTimeout(show, 3000);
    btn.addEventListener('click', () => window.privacyBanner && window.privacyBanner.showPreferences());
  }

  function initNewsletterPopup() {
    const dialog = $('[data-newsletter-popup]');
    if (!dialog || !GBG.newsletterPopup) return;
    const KEY_VIEWS = 'gbg_pageviews';
    const KEY_DISMISSED = 'gbg_nl_dismissed';
    let views = 0;
    try { views = parseInt(sessionStorage.getItem(KEY_VIEWS) || '0', 10) + 1; sessionStorage.setItem(KEY_VIEWS, String(views)); } catch (e) { return; }
    const dismissed = parseInt(storage.get(KEY_DISMISSED) || '0', 10);
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (views < 2 || Date.now() - dismissed < thirtyDays) return; // never on the first page view
    if (location.search.includes('customer_posted')) return;
    setTimeout(() => {
      if ($$('dialog[open]').length) return; // never on top of the basket or menu
      storage.set(KEY_DISMISSED, String(Date.now()));
      openDialog(dialog);
    }, 8000);
  }

  const productControllers = new WeakMap();
  const mountProduct = (root) => {
    if (productControllers.has(root)) productControllers.get(root).abort();
    productControllers.set(root, initProduct(root));
  };

  function init() {
    $$('[data-product]').forEach(mountProduct);
    initReveal();
    hideExpiredAnnouncements();
    initCountrySelects();
    initCookieButton();
    initNewsletterPopup();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  // Theme editor: re-initialise sections when they are re-rendered.
  document.addEventListener('shopify:section:load', (e) => {
    $$('[data-product]', e.target).forEach(mountProduct);
    $$('.reveal', e.target).forEach((el) => el.classList.add('is-visible'));
  });
  document.addEventListener('shopify:section:unload', (e) => {
    $$('[data-product]', e.target).forEach((root) => {
      const ac = productControllers.get(root);
      if (ac) { ac.abort(); productControllers.delete(root); }
    });
  });
})();
