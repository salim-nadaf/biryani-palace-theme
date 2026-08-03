/**
 * Biryani Palace by Niamat — Custom Restaurant Theme JS
 * Features: Ajax Cart Drawer, Smart Add-ons Modal, FAQ Accordions, Menu Filters, Area Checker, Analytics/Pixel Events
 */

(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const config = window.BiryaniTheme || {};

  function formatMoney(cents) {
    const amount = (cents / 100).toFixed(2).replace('.00', '');
    return `${config.shopCurrency || '₹'}${amount}`;
  }

  function showToast(message, type = 'success') {
    const container = document.getElementById('ToastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  /* ─────────────────── 1. CART DRAWER SYSTEM ─────────────────── */
  const CartManager = {
    drawer: null,
    overlay: null,
    badge: null,
    countEl: null,
    itemsEl: null,
    subtotalEl: null,
    progressFill: null,
    progressText: null,

    init() {
      this.drawer = document.getElementById('CartDrawer');
      this.overlay = document.getElementById('CartOverlay');
      this.badge = document.getElementById('CartBadge');
      this.countEl = document.getElementById('CartDrawerCount');
      this.itemsEl = document.getElementById('CartDrawerItems');
      this.subtotalEl = document.getElementById('CartSubtotalVal');
      this.progressFill = document.getElementById('FreeProgressFill');
      this.progressText = document.getElementById('FreeProgressText');

      this.bindEvents();
    },

    bindEvents() {
      // Toggle drawer
      document.getElementById('CartToggleBtn')?.addEventListener('click', () => this.open());
      document.getElementById('CartDrawerCloseBtn')?.addEventListener('click', () => this.close());
      this.overlay?.addEventListener('click', () => this.close());

      // Global Add to Cart Delegation
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('.add-to-cart-btn');
        if (btn) {
          e.preventDefault();
          const variantId = btn.dataset.variant;
          const productId = btn.dataset.productId;
          if (variantId) this.addItem(variantId, 1, btn, productId);
        }

        // Cart item controls (increase/decrease/remove)
        const controlBtn = e.target.closest('.cart-item__controls button, .cart-item__remove');
        if (controlBtn) {
          const key = controlBtn.dataset.key;
          if (controlBtn.classList.contains('cart-item__remove')) {
            this.updateItem(key, 0);
          } else {
            const qty = parseInt(controlBtn.dataset.qty, 10);
            if (!isNaN(qty)) this.updateItem(key, qty);
          }
        }
      });

      // Special notes save
      document.getElementById('CartSpecialNotes')?.addEventListener('change', function () {
        fetch('/cart/update.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: this.value })
        });
      });
    },

    open() {
      if (!this.drawer) return;
      this.drawer.classList.add('open');
      this.overlay?.classList.add('open');
      document.body.style.overflow = 'hidden';
      this.drawer.setAttribute('aria-hidden', 'false');
    },

    close() {
      if (!this.drawer) return;
      this.drawer.classList.remove('open');
      this.overlay?.classList.remove('open');
      document.body.style.overflow = '';
      this.drawer.setAttribute('aria-hidden', 'true');
    },

    async addItem(variantId, quantity = 1, buttonEl = null, productId = null) {
      if (buttonEl) {
        buttonEl.disabled = true;
        buttonEl.innerHTML = 'Adding...';
      }

      try {
        const res = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [{ id: variantId, quantity }] })
        });

        if (!res.ok) throw new Error('Add failed');

        const itemData = await res.json();
        const addedItem = itemData.items ? itemData.items[0] : itemData;

        // Meta Pixel AddToCart Event
        if (window.fbq && config.pixelId) {
          window.fbq('track', 'AddToCart', {
            content_name: addedItem.product_title,
            content_ids: [addedItem.product_id],
            content_type: 'product',
            value: (addedItem.price / 100) * quantity,
            currency: 'INR'
          });
        }

        // GA4 add_to_cart Event
        if (window.gtag && config.ga4Id) {
          window.gtag('event', 'add_to_cart', {
            currency: 'INR',
            value: (addedItem.price / 100) * quantity,
            items: [{ item_id: addedItem.product_id, item_name: addedItem.product_title, price: addedItem.price / 100, quantity }]
          });
        }

        if (buttonEl) {
          buttonEl.classList.add('added');
          buttonEl.innerHTML = '✓ Added to Order';
          setTimeout(() => {
            buttonEl.classList.remove('added');
            buttonEl.disabled = false;
            buttonEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><path d="M12 5v14M5 12h14"/></svg> Order Now';
          }, 2000);
        }

        showToast(`Added ${addedItem.product_title} to your order`);
        await this.refreshCart();

        // Show Smart Add-on Modal
        SmartAddons.trigger(addedItem.product_title);

      } catch (err) {
        console.error(err);
        showToast('Unable to add item. Please try again.', 'error');
        if (buttonEl) {
          buttonEl.disabled = false;
          buttonEl.innerHTML = 'Order Now';
        }
      }
    },

    async updateItem(key, quantity) {
      try {
        const res = await fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: key, quantity })
        });
        if (res.ok) await this.refreshCart();
      } catch (err) {
        console.error(err);
      }
    },

    async refreshCart() {
      try {
        const res = await fetch('/cart.js');
        const cart = await res.json();
        this.render(cart);
      } catch (err) {
        console.error(err);
      }
    },

    render(cart) {
      // Update badges
      if (this.badge) {
        this.badge.textContent = cart.item_count;
        this.badge.classList.toggle('has-items', cart.item_count > 0);
      }
      if (this.countEl) this.countEl.textContent = `(${cart.item_count} items)`;

      // Subtotal
      if (this.subtotalEl) this.subtotalEl.textContent = formatMoney(cart.total_price);

      // Free progress bar
      const thresholdCents = (config.freeItemThreshold || 999) * 100;
      const pct = Math.min(100, Math.round((cart.total_price / thresholdCents) * 100));
      if (this.progressFill) this.progressFill.style.width = `${pct}%`;

      if (this.progressText) {
        if (cart.total_price >= thresholdCents) {
          this.progressText.innerHTML = `🎉 <strong>Congratulations!</strong> You unlocked a ${config.freeItemName || 'Free Raita'}!`;
        } else {
          const diffCents = thresholdCents - cart.total_price;
          this.progressText.innerHTML = `Add <strong>${formatMoney(diffCents)}</strong> to get a ${config.freeItemName || 'Free Raita'}!`;
        }
      }

      // Re-render item list if container exists
      if (this.itemsEl && cart.items) {
        if (cart.item_count === 0) {
          this.itemsEl.innerHTML = `
            <div class="cart-drawer__empty">
              <div class="cart-drawer__empty-icon">🍚</div>
              <h3>Your order is empty</h3>
              <p style="font-size:0.875rem;color:var(--color-text-secondary);font-family:'Montserrat',sans-serif;">Add some freshly prepared biryani to get started!</p>
              <a href="/pages/menu" class="btn btn-primary btn-sm" style="margin-top:12px;">Browse Restaurant Menu</a>
            </div>
          `;
          const footer = document.getElementById('CartDrawerFooter');
          if (footer) footer.style.display = 'none';
        } else {
          const footer = document.getElementById('CartDrawerFooter');
          if (footer) footer.style.display = 'block';

          let html = '';
          cart.items.forEach(item => {
            const variantTitle = item.variant_title !== 'Default Title' ? `<div style="font-size:0.75rem;color:var(--color-text-secondary);margin-bottom:4px;">${item.variant_title}</div>` : '';
            html += `
              <div class="cart-item" id="CartItem-${item.key}">
                <img src="${item.image}" alt="${item.product_title}" class="cart-item__image" width="68" height="68" loading="lazy">
                <div class="cart-item__details">
                  <div class="cart-item__name">${item.product_title}</div>
                  ${variantTitle}
                  <div class="cart-item__price">${formatMoney(item.line_price)}</div>
                  <div class="cart-item__controls">
                    <div class="qty-control" style="height:32px;">
                      <button class="qty-btn" data-key="${item.key}" data-qty="${item.quantity - 1}" style="width:32px;height:32px;">−</button>
                      <span class="qty-display" style="min-width:24px;font-size:0.8125rem;">${item.quantity}</span>
                      <button class="qty-btn" data-key="${item.key}" data-qty="${item.quantity + 1}" style="width:32px;height:32px;">+</button>
                    </div>
                    <button class="cart-item__remove" data-key="${item.key}">Remove</button>
                  </div>
                </div>
              </div>
            `;
          });
          this.itemsEl.innerHTML = html;
        }
      }
    }
  };

  /* ─────────────────── 2. SMART ADD-ONS SYSTEM ─────────────────── */
  const SmartAddons = {
    modal: null,
    backdrop: null,
    closeBtn: null,

    init() {
      this.modal = document.getElementById('AddonModal');
      this.backdrop = document.getElementById('AddonModalBackdrop');
      this.closeBtn = document.getElementById('AddonModalClose');

      if (!this.modal) return;

      this.closeBtn?.addEventListener('click', () => this.close());
      this.backdrop?.addEventListener('click', () => this.close());
      document.getElementById('AddonContinue')?.addEventListener('click', () => this.close());
    },

    trigger(productName) {
      if (!this.modal) return;

      const titleEl = document.getElementById('AddonProductName');
      if (titleEl) titleEl.textContent = productName;

      // Populate sample add-on recommendations
      const container = document.getElementById('AddonItems');
      if (container && container.children.length === 0) {
        container.innerHTML = `
          <div class="addon-item">
            <div style="font-size:1.75rem;margin-right:8px;">🥗</div>
            <div class="addon-item__name">Mint & Cucumber Raita</div>
            <div class="addon-item__price">₹49</div>
            <button class="addon-item__add" onclick="BiryaniThemeAddAddon(this, 'raita')">+ Add</button>
          </div>
          <div class="addon-item">
            <div style="font-size:1.75rem;margin-right:8px;">🥤</div>
            <div class="addon-item__name">Thums Up (750 ml)</div>
            <div class="addon-item__price">₹60</div>
            <button class="addon-item__add" onclick="BiryaniThemeAddAddon(this, 'coke')">+ Add</button>
          </div>
          <div class="addon-item">
            <div style="font-size:1.75rem;margin-right:8px;">🍮</div>
            <div class="addon-item__name">Shahi Gulab Jamun (2 pcs)</div>
            <div class="addon-item__price">₹79</div>
            <button class="addon-item__add" onclick="BiryaniThemeAddAddon(this, 'dessert')">+ Add</button>
          </div>
        `;
      }

      this.modal.classList.add('open');
      this.modal.setAttribute('aria-hidden', 'false');
    },

    close() {
      if (!this.modal) return;
      this.modal.classList.remove('open');
      this.modal.setAttribute('aria-hidden', 'true');
    }
  };

  window.BiryaniThemeAddAddon = function (btn) {
    btn.textContent = '✓ Added';
    btn.style.background = 'var(--color-veg)';
    btn.disabled = true;
    showToast('Add-on added to your order');
  };

  /* ─────────────────── 3. FAQ ACCORDION ─────────────────── */
  function initFaqAccordion() {
    const container = document.getElementById('FaqSection') || document.getElementById('FaqAccordionContainer');
    if (!container) return;

    container.addEventListener('click', (e) => {
      const qBtn = e.target.closest('.faq-question');
      if (!qBtn) return;

      const item = qBtn.closest('.faq-item');
      const isOpen = item.classList.contains('open');

      // Close all siblings
      $$('.faq-item', container).forEach(el => el.classList.remove('open'));

      if (!isOpen) {
        item.classList.add('open');
        qBtn.setAttribute('aria-expanded', 'true');
      } else {
        qBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ─────────────────── 4. RESTAURANT MENU FILTERS & SEARCH ─────────────────── */
  function initMenuFilters() {
    const searchInput = document.getElementById('RestaurantMenuSearch');
    const filterBar = document.getElementById('MenuFilterBar');
    const grid = document.getElementById('RestaurantMenuGrid');

    if (!grid) return;

    let activeFilter = 'all';

    function filterGrid() {
      const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
      const cards = $$('.product-card', grid);

      cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        const category = card.dataset.category || '';
        const isVeg = card.querySelector('.product-card__veg-indicator.veg') !== null;

        let matchesFilter = true;
        if (activeFilter === 'chicken') matchesFilter = text.includes('chicken');
        else if (activeFilter === 'mutton') matchesFilter = text.includes('mutton');
        else if (activeFilter === 'veg') matchesFilter = isVeg;
        else if (activeFilter === 'available') matchesFilter = card.querySelector('.now') !== null;
        else if (activeFilter === 'family') matchesFilter = text.includes('family') || text.includes('kg');
        else if (activeFilter === 'bestseller') matchesFilter = text.includes('best seller') || category.includes('bestseller');

        let matchesSearch = query === '' || text.includes(query);

        if (matchesFilter && matchesSearch) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    }

    searchInput?.addEventListener('input', filterGrid);

    filterBar?.addEventListener('click', (e) => {
      const btn = e.target.closest('.menu-filter-btn');
      if (!btn) return;

      $$('.menu-filter-btn', filterBar).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      filterGrid();
    });
  }

  /* ─────────────────── 5. AREA CHECKER SYSTEM ─────────────────── */
  function initAreaChecker() {
    const toggleBtn = document.getElementById('AreaToggleBtn');
    const dropdown = document.getElementById('AreaDropdown');
    const input = document.getElementById('AreaSearchInput');
    const list = document.getElementById('AreaList');
    const status = document.getElementById('AreaStatus');
    const selectedName = document.getElementById('SelectedAreaName');

    if (!toggleBtn || !dropdown) return;

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !toggleBtn.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });

    list?.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (!li) return;

      const area = li.dataset.area;
      if (selectedName) selectedName.textContent = area;

      if (status) {
        status.className = 'area-selector__status available';
        status.innerHTML = `✓ We deliver to <strong>${area}</strong>! Est: 30–60 min`;
      }
      setTimeout(() => dropdown.classList.remove('open'), 1400);
    });

    input?.addEventListener('input', () => {
      const val = input.value.toLowerCase().trim();
      const items = $$('li', list);
      let found = false;

      items.forEach(li => {
        const text = li.textContent.toLowerCase();
        if (text.includes(val)) {
          li.style.display = 'block';
          found = true;
        } else {
          li.style.display = 'none';
        }
      });

      if (status && val.length > 2) {
        if (found) {
          status.className = 'area-selector__status available';
          status.innerHTML = `✓ Delivering to areas matching "${val}"!`;
        } else {
          status.className = 'area-selector__status unavailable';
          status.innerHTML = `✕ Sorry, we don't deliver to "${val}" yet. Try WhatsApp inquiry.`;
        }
      }
    });
  }

  /* ─────────────────── 6. MOBILE MENU & STICKY HEADER ─────────────────── */
  function initMobileMenu() {
    const toggle = document.getElementById('MobileMenuToggle');
    const nav = document.getElementById('HeaderNav');
    const header = document.getElementById('SiteHeader');

    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        const isOpen = nav.style.display === 'flex';
        nav.style.display = isOpen ? 'none' : 'flex';
        if (!isOpen) {
          nav.style.position = 'absolute';
          nav.style.top = '100%';
          nav.style.left = '0';
          nav.style.right = '0';
          nav.style.background = 'var(--color-surface)';
          nav.style.flexDirection = 'column';
          nav.style.padding = '20px';
          nav.style.borderBottom = '1px solid var(--color-border)';
        }
      });
    }

    // Header shadow on scroll
    window.addEventListener('scroll', () => {
      if (header) {
        header.classList.toggle('scrolled', window.scrollY > 40);
      }
    });
  }

  /* ─────────────────── 7. SCROLL ANIMATIONS ─────────────────── */
  function initScrollAnimations() {
    const elements = $$('.animate-on-scroll');
    if (!('IntersectionObserver' in window)) {
      elements.forEach(el => el.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    elements.forEach(el => observer.observe(el));
  }

  /* ─────────────────── 8. INITIALIZATION ─────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    CartManager.init();
    SmartAddons.init();
    initFaqAccordion();
    initMenuFilters();
    initAreaChecker();
    initMobileMenu();
    initScrollAnimations();
  });

})();
