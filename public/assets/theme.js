/**
 * REGARDS SPORTS CLUB — INTERACTIVE E-COMMERCE ENGINE
 * AJAX Cart Drawer, Line-Item Personalization, Sticky ATC, WhatsApp Quick Order
 */

class ImranTheme {
  constructor() {
    this.freeShippingThreshold = 2000; // ৳2,000 threshold in BDT
    this.initCartDrawer();
    this.initTabs();
    this.initStickyATC();
    this.initWhatsAppOrder();
    this.initVariantPills();
  }

  // 1. AJAX Slide-Out Cart Drawer
  initCartDrawer() {
    const triggers = document.querySelectorAll('[data-cart-trigger]');
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-drawer-overlay');
    const closeBtn = document.getElementById('cart-drawer-close');

    if (!drawer) return;

    const openDrawer = () => {
      drawer.classList.add('is-active');
      overlay.classList.add('is-active');
      document.body.style.overflow = 'hidden';
      this.fetchCart();
    };

    const closeDrawer = () => {
      drawer.classList.remove('is-active');
      overlay.classList.remove('is-active');
      document.body.style.overflow = '';
    };

    triggers.forEach(t => t.addEventListener('click', (e) => {
      e.preventDefault();
      openDrawer();
    }));

    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (overlay) overlay.addEventListener('click', closeDrawer);

    // Global add to cart listener
    document.addEventListener('submit', async (e) => {
      if (e.target.matches('[data-ajax-cart-form]')) {
        e.preventDefault();
        const submitBtn = e.target.querySelector('[type="submit"]');
        const origText = submitBtn ? submitBtn.innerText : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerText = 'ADDING...';
        }

        try {
          const formData = new FormData(e.target);
          const response = await fetch('/cart/add.js', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) throw new Error('Add to cart failed');

          openDrawer();
        } catch (err) {
          console.error(err);
          alert('Could not add item to cart. Please check options.');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = origText;
          }
        }
      }
    });
  }

  // Fetch Cart Details & Re-render Drawer
  async fetchCart() {
    try {
      const res = await fetch('/cart.js');
      const cart = await res.json();
      this.renderCart(cart);
    } catch (e) {
      console.error('Error fetching cart:', e);
    }
  }

  renderCart(cart) {
    const container = document.getElementById('cart-drawer-items');
    const badge = document.getElementById('cart-count-badge');
    const subtotalEl = document.getElementById('cart-drawer-subtotal');
    const progressFill = document.getElementById('free-shipping-fill');
    const progressText = document.getElementById('free-shipping-text');

    if (badge) badge.innerText = cart.item_count;

    // Free Shipping Progress Calculation
    const totalBDT = cart.total_price / 100;
    if (subtotalEl) subtotalEl.innerText = `Tk ${totalBDT.toLocaleString()}`;

    if (progressFill && progressText) {
      if (totalBDT >= this.freeShippingThreshold) {
        progressFill.style.width = '100%';
        progressText.innerHTML = '🎉 <strong>Congratulations!</strong> You get FREE delivery nationwide!';
      } else {
        const remaining = this.freeShippingThreshold - totalBDT;
        const pct = Math.min(100, Math.round((totalBDT / this.freeShippingThreshold) * 100));
        progressFill.style.width = `${pct}%`;
        progressText.innerHTML = `Add <strong>Tk ${remaining.toLocaleString()}</strong> more to reach <strong>FREE SHIPPING</strong>!`;
      }
    }

    if (!container) return;

    if (cart.item_count === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem;">
          <p style="font-size: 1.8rem; font-weight: 600;">Your kit bag is empty.</p>
          <p style="color: #666; margin-bottom: 2rem;">Explore match jerseys, retro editions & turf boots.</p>
          <a href="/collections/all" class="btn btn-primary" onclick="document.getElementById('cart-drawer-close').click();">Explore Kits</a>
        </div>
      `;
      return;
    }

    let html = '';
    cart.items.forEach(item => {
      let propsHtml = '';
      if (item.properties) {
        for (const [k, v] of Object.entries(item.properties)) {
          if (v) propsHtml += `<div style="font-size: 1.15rem; color: #D63A2F;"><strong>${k}:</strong> ${v}</div>`;
        }
      }

      html += `
        <div class="cart-item">
          <div class="cart-item__image">
            <img src="${item.featured_image.url}" alt="${item.title}" loading="lazy">
          </div>
          <div>
            <div class="cart-item__title">${item.product_title}</div>
            <div class="cart-item__meta">${item.variant_title || ''}</div>
            ${propsHtml}
            <div style="font-weight: 700; color: #111;">Tk ${(item.price / 100).toLocaleString()}</div>
          </div>
          <div style="text-align: right;">
            <button onclick="window.imranTheme.updateItem(${item.key}, 0)" style="background: none; border: none; color: #888; cursor: pointer; font-size: 1.2rem;">Remove</button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  async updateItem(key, qty) {
    try {
      await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: key, quantity: qty })
      });
      this.fetchCart();
    } catch (e) {
      console.error(e);
    }
  }

  // 2. AJAX "What's New" Tab Switching
  initTabs() {
    const tabBtns = document.querySelectorAll('[data-tab-target]');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-tab-target');
        
        tabBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        document.querySelectorAll('.tab-pane').forEach(pane => {
          pane.classList.remove('is-active');
        });

        const activePane = document.getElementById(targetId);
        if (activePane) activePane.classList.add('is-active');
      });
    });
  }

  // 3. Sticky Add-to-Cart for Mobile & Desktop
  initStickyATC() {
    const mainATC = document.getElementById('main-atc-button');
    const stickyBar = document.getElementById('sticky-atc-bar');

    if (!mainATC || !stickyBar) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        stickyBar.classList.add('is-visible');
      } else {
        stickyBar.classList.remove('is-visible');
      }
    }, { threshold: 0.1 });

    observer.observe(mainATC);
  }

  // 4. WhatsApp Direct Quick Order Generator
  initWhatsAppOrder() {
    const waBtn = document.getElementById('whatsapp-order-btn');
    if (!waBtn) return;

    waBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const phone = waBtn.getAttribute('data-phone') || '8801754724991';
      const title = waBtn.getAttribute('data-product-title') || document.title;
      
      const selectedSize = document.querySelector('input[name="size"]:checked')?.value || 'Default';
      const customPrint = document.querySelector('[data-personalize-input]')?.value || 'None';

      const msg = `Hello Regards Sports Club! I want to order:\n- Product: ${title}\n- Size: ${selectedSize}\n- Custom Printing: ${customPrint}\n- Link: ${window.location.href}\n\nPlease confirm delivery time & COD details.`;
      
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
    });
  }

  // 5. Variant Pill Selectors
  initVariantPills() {
    document.querySelectorAll('.variant-pill input').forEach(input => {
      input.addEventListener('change', () => {
        const selectedVal = input.value;
        const groupName = input.getAttribute('name');
        const labelDisplay = document.querySelector(`[data-selected-label="${groupName}"]`);
        if (labelDisplay) labelDisplay.innerText = selectedVal;
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.imranTheme = new ImranTheme();
});
