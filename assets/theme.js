/**
 * Biryani Palace by Niamat — Custom Restaurant Theme JS
 * Features: Ajax Cart Drawer, Behrouz-Style Quick Food Checkout, Smart Add-ons Modal, FAQ Accordions, Menu Filters, Area Checker, Analytics/Pixel Events
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

  /* ─────────────────── 1. CART DRAWER SYSTEM & QUICK CHECKOUT ─────────────────── */
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

      // Proceed to Delivery Details View
      document.getElementById('CartProceedToFormBtn')?.addEventListener('click', () => {
        this.showCheckoutForm();
      });

      // Back to Cart View
      document.getElementById('CartDrawerBackBtn')?.addEventListener('click', () => {
        this.showCartItems();
      });

      // Quick Submit Order
      document.getElementById('QuickSubmitOrderBtn')?.addEventListener('click', async () => {
        await this.handleQuickSubmit();
      });

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

      // Mobile Triggers
      document.getElementById('MobileCartBarTrigger')?.addEventListener('click', () => this.open());
      document.getElementById('AppBottomCartBtn')?.addEventListener('click', () => this.open());

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
      this.showCartItems();
      this.drawer.classList.add('open');
      this.overlay?.classList.add('open');
      document.body.classList.add('cart-open');
      document.body.style.overflow = 'hidden';
      this.drawer.setAttribute('aria-hidden', 'false');
    },

    close() {
      if (!this.drawer) return;
      this.drawer.classList.remove('open');
      this.overlay?.classList.remove('open');
      document.body.classList.remove('cart-open');
      document.body.style.overflow = '';
      this.drawer.setAttribute('aria-hidden', 'true');
    },

    showCheckoutForm() {
      const viewItems = document.getElementById('CartViewItems');
      const viewForm = document.getElementById('CartViewCheckoutForm');
      const backBtn = document.getElementById('CartDrawerBackBtn');
      const titleEl = document.getElementById('CartDrawerHeadingTitle');

      if (viewItems && viewForm) {
        viewItems.style.display = 'none';
        viewForm.style.display = 'flex';
        if (backBtn) backBtn.style.display = 'block';
        if (titleEl) titleEl.textContent = 'Delivery Details';
      }
    },

    showCartItems() {
      const viewItems = document.getElementById('CartViewItems');
      const viewForm = document.getElementById('CartViewCheckoutForm');
      const backBtn = document.getElementById('CartDrawerBackBtn');
      const titleEl = document.getElementById('CartDrawerHeadingTitle');

      if (viewItems && viewForm) {
        viewForm.style.display = 'none';
        viewItems.style.display = 'block';
        if (backBtn) backBtn.style.display = 'none';
        if (titleEl) titleEl.textContent = 'Your Order';
      }
    },

    async handleQuickSubmit() {
      const name = document.getElementById('qc_name')?.value.trim();
      const phone = document.getElementById('qc_phone')?.value.trim();
      const email = document.getElementById('qc_email')?.value.trim();
      const area = document.getElementById('qc_area')?.value;
      const address = document.getElementById('qc_address')?.value.trim();
      const paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value || 'online';

      if (!name) {
        showToast('Please enter your full name', 'error');
        document.getElementById('qc_name')?.focus();
        return;
      }
      if (!phone || phone.length < 10) {
        showToast('Please enter a valid 10-digit mobile number', 'error');
        document.getElementById('qc_phone')?.focus();
        return;
      }
      if (!area) {
        showToast('Please select your delivery area', 'error');
        document.getElementById('qc_area')?.focus();
        return;
      }
      if (!address) {
        showToast('Please enter your complete delivery address', 'error');
        document.getElementById('qc_address')?.focus();
        return;
      }

      const submitBtn = document.getElementById('QuickSubmitOrderBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Processing Order...</span>';
      }

      try {
        // 1. Save customer details to cart attributes
        await fetch('/cart/update.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attributes: {
              'Customer Name': name,
              'Customer Phone': phone,
              'Customer Email': email || 'Not provided',
              'Delivery Area': area,
              'Delivery Address': address,
              'Payment Choice': paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'
            }
          })
        });

        // 2. Pre-fill & redirect to Shopify checkout cleanly
        window.location.href = `/checkout?checkout[shipping_address][first_name]=${encodeURIComponent(name)}&checkout[shipping_address][phone]=${encodeURIComponent(phone)}&checkout[shipping_address][address1]=${encodeURIComponent(address)}&checkout[shipping_address][city]=${encodeURIComponent(area)}&checkout[email]=${encodeURIComponent(email || '')}`;

      } catch (err) {
        console.error(err);
        showToast('Unable to save details. Redirecting to checkout...', 'error');
        window.location.href = '/checkout';
      }
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

      const quickSubtotalDisplay = document.getElementById('QuickFormSubtotalDisplay');
      if (quickSubtotalDisplay) quickSubtotalDisplay.textContent = formatMoney(cart.total_price);

      // Mobile Floating Bar & App Nav Badges
      const mobileFloatingBar = document.getElementById('MobileFloatingCartBar');
      const mobileCartCountPill = document.getElementById('MobileCartCountPill');
      const mobileCartTotalPill = document.getElementById('MobileCartTotalPill');
      const appNavCartBadge = document.getElementById('AppNavCartBadge');

      if (mobileFloatingBar) {
        mobileFloatingBar.classList.toggle('active', cart.item_count > 0);
      }
      if (mobileCartCountPill) mobileCartCountPill.textContent = `${cart.item_count} ITEMS`;
      if (mobileCartTotalPill) mobileCartTotalPill.textContent = formatMoney(cart.total_price);
      if (appNavCartBadge) appNavCartBadge.textContent = cart.item_count;

      // Free delivery progress bar (Zone 1: ₹799, Zone 2: ₹1,299)
      const freeZone1Cents = 79900;
      const freeZone2Cents = 129900;
      const pct = Math.min(100, Math.round((cart.total_price / freeZone1Cents) * 100));
      if (this.progressFill) this.progressFill.style.width = `${pct}%`;

      if (this.progressText) {
        if (cart.total_price >= freeZone2Cents) {
          this.progressText.innerHTML = `🎉 <strong>FREE Delivery Unlocked!</strong> (Free for all areas up to 8 KM)`;
        } else if (cart.total_price >= freeZone1Cents) {
          const diff2 = freeZone2Cents - cart.total_price;
          this.progressText.innerHTML = `🎉 <strong>FREE Delivery Unlocked (0–5 KM)!</strong> Add <strong>${formatMoney(diff2)}</strong> for FREE Delivery (5–8 KM)`;
        } else {
          const diff1 = freeZone1Cents - cart.total_price;
          this.progressText.innerHTML = `Add <strong>${formatMoney(diff1)}</strong> for <strong>FREE Delivery</strong> (0–5 KM)`;
        }
      }

      const deliveryNoteEl = document.getElementById('CartDeliveryNote');
      if (deliveryNoteEl) {
        if (cart.total_price >= freeZone2Cents) {
          deliveryNoteEl.innerHTML = `<span class="cart-delivery-note free">✓ You qualify for FREE Delivery for all areas up to 8 KM!</span>`;
        } else if (cart.total_price >= freeZone1Cents) {
          deliveryNoteEl.innerHTML = `<span class="cart-delivery-note free">✓ You qualify for FREE Delivery (0–5 KM)!</span>`;
        } else {
          deliveryNoteEl.innerHTML = `Free delivery on orders above ₹799 (0–5 KM) & ₹1,299 (5–8 KM)`;
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
            <button class="addon-item__add" onclick="BiryaniThemeAddAddon(this)">Add +</button>
          </div>
          <div class="addon-item">
            <div style="font-size:1.75rem;margin-right:8px;">🍧</div>
            <div class="addon-item__name">Shahi Gulab Jamun (2 Pcs)</div>
            <div class="addon-item__price">₹79</div>
            <button class="addon-item__add" onclick="BiryaniThemeAddAddon(this)">Add +</button>
          </div>
          <div class="addon-item">
            <div style="font-size:1.75rem;margin-right:8px;">🥤</div>
            <div class="addon-item__name">Royal Rose Sharbat</div>
            <div class="addon-item__price">₹59</div>
            <button class="addon-item__add" onclick="BiryaniThemeAddAddon(this)">Add +</button>
          </div>
        `;
      }

      this.modal.classList.add('open');
      this.backdrop?.classList.add('open');
      this.modal.setAttribute('aria-hidden', 'false');
    },

    close() {
      if (!this.modal) return;
      this.modal.classList.remove('open');
      this.backdrop?.classList.remove('open');
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

    const allowedAreas = ['kalyan west', 'kalyan east', 'dombivli', 'ulhasnagar', 'kalyan'];

    list?.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (!li) return;

      const area = li.dataset.area;
      if (selectedName) selectedName.textContent = area;

      if (status) {
        status.className = 'area-selector__status available';
        status.innerHTML = `✓ Delivering to <strong>${area}</strong> (Up to 8 KM)!<br><span style="font-size:0.75rem;color:var(--color-primary);">0-5 KM: ₹39 (FREE > ₹799) | 5-8 KM: ₹89 (FREE > ₹1,299)</span>`;
      }
      setTimeout(() => dropdown.classList.remove('open'), 2200);
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
        const isAllowed = allowedAreas.some(a => a.includes(val) || val.includes(a));
        if (isAllowed || found) {
          status.className = 'area-selector__status available';
          status.innerHTML = `✓ Delivering to "${val}"! (0–5 KM: ₹39 | 5–8 KM: ₹89 | Max 8 KM)`;
        } else {
          status.className = 'area-selector__status unavailable';
          status.innerHTML = `✕ Sorry, we only deliver up to 8 KM (Kalyan, Dombivli, Ulhasnagar). No orders accepted beyond 8 KM.`;
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
        const isOpen = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }

    if (header) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      }, { passive: true });
    }
  }

  /* ─────────────────── 7. ANIMATE ON SCROLL ─────────────────── */
  function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    $$('.animate-on-scroll').forEach(el => observer.observe(el));
  }

  /* ─────────────────── INITIALIZATION ─────────────────── */
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
