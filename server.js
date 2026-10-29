const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets (both public/assets and assets/ for Vercel and local)
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/Pictures', express.static(path.join(__dirname, 'Pictures')));
app.use('/cdn/shop/t/1/assets', express.static(path.join(__dirname, 'assets')));

// Load comprehensive catalog from catalog.json (safe for root & serverless)
let catalog = [];
try {
  let catalogFile = path.join(__dirname, 'catalog.json');
  if (!fs.existsSync(catalogFile)) {
    catalogFile = path.join(__dirname, '..', 'catalog.json');
  }
  catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf-8'));
  console.log(`Loaded ${catalog.length} categorized products from catalog.json`);
} catch (e) {
  console.error("Error loading catalog.json, using fallback", e);
}

// In-Memory Session Cart State
let cartState = {
  token: "local-dev-cart-token",
  note: "",
  attributes: {},
  total_price: 115000,
  total_weight: 0,
  item_count: 1,
  items: [
    {
      id: 101,
      key: "101:default",
      title: "Real Madrid 2026/27 Home Jersey - Fan Edition - M",
      price: 115000,
      line_price: 115000,
      quantity: 1,
      sku: "RSC-101-M",
      vendor: "Regards Sports Club",
      product_title: "Real Madrid 2026/27 Home Jersey - Fan Edition",
      variant_title: "Size: M",
      featured_image: {
        url: catalog[0] ? catalog[0].featured_image : "/assets/products/argentinaPlayr.jpeg"
      },
      properties: {
        "Personalize Your Jersey (+Tk 250)": "BELLINGHAM 5"
      },
      url: `/products/${catalog[0] ? catalog[0].handle : "real-madrid-2026-27-home-jersey-fan-edition"}`
    }
  ],
  requires_shipping: true,
  currency: "BDT",
  items_subtotal_price: 115000
};

function recalculateCart() {
  let count = 0;
  let total = 0;
  cartState.items.forEach(item => {
    count += item.quantity;
    total += item.price * item.quantity;
  });
  cartState.item_count = count;
  cartState.total_price = total;
  cartState.items_subtotal_price = total;
}

// =========================================================================
// CUSTOMER DATABASE, ORDER STORAGE & SESSION COOKIE SYSTEM
// =========================================================================
let users = [
  {
    id: "usr_101",
    name: "Naimur Rahman",
    email: "demo@regards.club",
    phone: "01754724991",
    password: "password123",
    city: "Dhaka",
    address: "House 48, Road 03, Block E, Banasree, Rampura, Dhaka",
    createdAt: "2026-10-25T10:00:00.000Z",
    orders: [
      {
        id: "RSC-92418",
        date: "2026-10-28",
        total: 1920,
        status: "Delivered",
        paymentMethod: "Cash on Delivery",
        items: [
          {
            title: "Argentina Messi Special Edition Farewell Jersey 2026",
            size: "Size: L",
            quantity: 1,
            price: 1850,
            image: "/assets/products/argentinaPlayr.jpeg"
          }
        ]
      }
    ]
  }
];

let orders = [
  {
    id: "RSC-92418",
    createdAt: "2026-10-28T14:20:00.000Z",
    customer: {
      fullName: "Naimur Rahman",
      phone: "01754724991",
      email: "demo@regards.club",
      deliveryZone: "dhaka",
      address: "House 48, Road 03, Block E, Banasree, Rampura, Dhaka",
      notes: "Please call before arrival"
    },
    items: [
      {
        product_title: "Argentina Messi Special Edition Farewell Jersey 2026",
        variant_title: "Size: L",
        quantity: 1,
        price: 185000,
        featured_image: { url: "/assets/products/argentinaPlayr.jpeg" },
        properties: { "Personalize Your Jersey (+Tk 250)": "MESSI 10" }
      }
    ],
    subtotal: 1850,
    deliveryFee: 70,
    total: 1920,
    paymentMethod: "Cash on Delivery (COD)",
    trxId: null,
    status: "Delivered"
  }
];

function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    list[name] = decodeURIComponent(rest.join('=').trim());
  });
  return list;
}

function getLoggedInUser(req) {
  const cookies = parseCookies(req);
  const email = cookies.rsc_user_email;
  if (!email) return null;
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}


// SHOPIFY CART API ENDPOINTS
app.get('/cart.js', (req, res) => {
  recalculateCart();
  res.json(cartState);
});

app.post('/cart/add.js', (req, res) => {
  const { id, quantity = 1, properties, size = 'M' } = req.body;
  const prodId = parseInt(id) || (catalog[0] ? catalog[0].id : 101);
  const product = catalog.find(p => p.id === prodId || p.handle === req.body.handle) || catalog[0];

  const newItem = {
    id: product.id,
    key: `${product.id}:${Date.now()}`,
    title: `${product.title} - ${size}`,
    price: product.price,
    line_price: product.price * parseInt(quantity),
    quantity: parseInt(quantity),
    sku: `RSC-${product.id}`,
    vendor: product.vendor,
    product_title: product.title,
    variant_title: `Size: ${size}`,
    featured_image: {
      url: product.featured_image
    },
    properties: properties || (req.body['properties[Personalize Your Jersey (+Tk 250)]'] ? {
      "Personalize Your Jersey (+Tk 250)": req.body['properties[Personalize Your Jersey (+Tk 250)]']
    } : {}),
    url: `/products/${product.handle}`
  };

  cartState.items.push(newItem);
  recalculateCart();
  res.json(newItem);
});

app.post('/cart/change.js', (req, res) => {
  const { id, quantity } = req.body;
  const key = id.toString();
  const qty = parseInt(quantity);

  if (qty <= 0) {
    cartState.items = cartState.items.filter(item => item.key !== key && item.id != key);
  } else {
    const item = cartState.items.find(item => item.key === key || item.id == key);
    if (item) {
      item.quantity = qty;
      item.line_price = item.price * qty;
    }
  }

  recalculateCart();
  res.json(cartState);
});

app.post('/cart/update.js', (req, res) => {
  if (req.body.note !== undefined) {
    cartState.note = req.body.note;
  }
  recalculateCart();
  res.json(cartState);
});

// PREDICTIVE LIVE SEARCH API
app.get('/search/suggest.json', (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q) {
    return res.json({ resources: { results: { products: [] } } });
  }
  const results = catalog.filter(p => {
    return (
      p.title.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q) ||
      p.handle.toLowerCase().includes(q) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q))) ||
      (p.categories && p.categories.some(c => c.toLowerCase().includes(q)))
    );
  });

  res.json({
    resources: {
      results: {
        products: results.slice(0, 8).map(p => ({
          title: p.title,
          url: `/products/${p.handle}`,
          price: `Tk ${(p.price / 100).toLocaleString()}`,
          image: p.featured_image
        }))
      }
    }
  });
});

// SHARED HEADER COMPONENT
function getHeaderHtml(activeNav = '', currentUser = null) {
  return `
  <!-- Top Ticker Bar -->
  <div class="announcement-bar">
    <div class="container announcement-bar__ticker">
      ⚡ <strong>2026 WORLD CUP & 2026/27 KITS LIVE!</strong> Free Nationwide Delivery on Orders Over Tk 2,000 | Cash on Delivery Available
    </div>
  </div>

  <!-- Main Sticky Header -->
  <header class="site-header" id="site-header">
    <div class="container site-header__inner">
      <button type="button" class="header-icon-btn mobile-nav-trigger" id="mobile-menu-open" aria-label="Open Navigation">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <a href="/" class="site-logo" style="display: flex; align-items: center; gap: 1rem; text-decoration: none;">
        <img src="/assets/logo.svg" alt="Regards Sports Club" style="height: 44px; width: auto; max-width: 220px;">
      </a>

      <!-- Desktop Navigation with Complete Subcategories -->
      <nav class="site-nav">
        <div class="site-nav__item">
          <a href="/" class="site-nav__link ${activeNav === 'home' ? 'is-active' : ''}">HOME</a>
        </div>
        
        <div class="site-nav__item">
          <a href="/collections/2026-27-player-edition" class="site-nav__link ${activeNav === 'club2627' ? 'is-active' : ''}">CLUB JERSEY 26–27</a>
        </div>

        <!-- JERSEY with Hover Dropdown -->
        <div class="site-nav__item site-nav__item--dropdown">
          <a href="/collections/all" class="site-nav__link site-nav__link-dropdown-trigger ${activeNav === 'jersey' ? 'is-active' : ''}">
            JERSEY
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </a>
          <div class="site-nav__dropdown">
            <a href="/collections/club-jersey" class="site-nav__dropdown-link">Club Jersey</a>
            <a href="/collections/world-cup-2026" class="site-nav__dropdown-link">World Cup 2026</a>
            <a href="/collections/national-jersey" class="site-nav__dropdown-link">National Jersey</a>
            <a href="/collections/retro-jersey" class="site-nav__dropdown-link">Retro Jersey</a>
            <a href="/collections/kids-jersey" class="site-nav__dropdown-link">Kids Jersey</a>
            <a href="/collections/player-edition" class="site-nav__dropdown-link">Player Edition</a>
            <a href="/collections/fan-edition" class="site-nav__dropdown-link">Fan Edition</a>
          </div>
        </div>

        <div class="site-nav__item">
          <a href="/collections/trousers-shorts" class="site-nav__link ${activeNav === 'trouser' ? 'is-active' : ''}">TROUSER</a>
        </div>

        <div class="site-nav__item">
          <a href="/collections/turf-shoes" class="site-nav__link ${activeNav === 'turf' ? 'is-active' : ''}">TURF SHOES</a>
        </div>

        <div class="site-nav__item">
          <a href="/collections/accessories" class="site-nav__link ${activeNav === 'accessories' ? 'is-active' : ''}">ACCESSORIES</a>
        </div>
      </nav>

      <div class="site-header__actions">
        <!-- Live Predictive Search Trigger -->
        <button type="button" class="header-icon-btn" id="search-drawer-open" aria-label="Search Catalog" title="Search Kits">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>

        <!-- Customer Account / Auth Menu -->
        ${currentUser ? `
          <div class="header-account-menu">
            <a href="/account" class="header-account-btn" title="My Account (${currentUser.name})">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span class="header-user-name">${currentUser.name.split(' ')[0]}</span>
            </a>
            <div class="header-account-dropdown">
              <div style="padding: 1.2rem 1.4rem; border-bottom: 1px solid #f0f0f0; background: #fafafa;">
                <div style="font-weight: 700; font-size: 1.35rem; color: #111;">${currentUser.name}</div>
                <div style="font-size: 1.15rem; color: #777;">${currentUser.email}</div>
              </div>
              <a href="/account" class="header-dropdown-link">👤 My Profile & Orders</a>
              <a href="/checkout" class="header-dropdown-link">🛍️ Checkout Form</a>
              <a href="/account/logout" class="header-dropdown-link" style="color: var(--color-primary);">🚪 Sign Out</a>
            </div>
          </div>
        ` : `
          <a href="/account/login" class="header-icon-btn" title="Sign In / Register" aria-label="Customer Login">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </a>
        `}

        <!-- Cart Trigger -->
        <button type="button" class="header-icon-btn" data-cart-trigger aria-label="Open Cart" title="View Kit Bag">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <span class="cart-count-badge" id="cart-count-badge">${cartState.item_count}</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Predictive Live Search Modal Drawer -->
  <div id="search-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 99999; display: none; backdrop-filter: blur(4px);">
    <div style="background: #fff; width: 100%; max-width: 680px; margin: 4rem auto; border-radius: 12px; padding: 2.5rem; box-shadow: 0 10px 40px rgba(0,0,0,0.25);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h3 style="font-size: 2rem; margin: 0;">Search Regards Sports Club</h3>
        <button type="button" id="search-modal-close" style="background: none; border: none; font-size: 2.8rem; cursor: pointer; color: #333;">&times;</button>
      </div>
      <form action="/search" method="get">
        <div style="display: flex; gap: 1rem;">
          <input type="text" name="q" id="search-modal-input" placeholder="Search by club, player, kit (e.g. Real Madrid, Messi, Turf, Trouser)..." style="flex: 1; padding: 1.4rem 1.6rem; border: 2px solid var(--color-border); border-radius: 8px; font-size: 1.5rem; outline: none;" autofocus>
          <button type="submit" class="btn btn-primary" style="padding: 0 2.4rem;">Search</button>
        </div>
      </form>
      <div id="search-live-results" style="margin-top: 2rem; max-height: 380px; overflow-y: auto;">
        <div style="font-size: 1.3rem; color: #888; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 1rem;">Popular Categories:</div>
        <div style="display: flex; flex-wrap: wrap; gap: 0.8rem;">
          <a href="/collections/club-jersey" class="filter-pill" style="color: #222; background: #f0f0f0; border-color: #ddd;">Club Jersey</a>
          <a href="/collections/world-cup-2026" class="filter-pill" style="color: #222; background: #f0f0f0; border-color: #ddd;">World Cup 2026</a>
          <a href="/collections/retro-jersey" class="filter-pill" style="color: #222; background: #f0f0f0; border-color: #ddd;">Retro Jersey</a>
          <a href="/collections/kids-jersey" class="filter-pill" style="color: #222; background: #f0f0f0; border-color: #ddd;">Kids Jersey</a>
          <a href="/collections/trousers-shorts" class="filter-pill" style="color: #222; background: #f0f0f0; border-color: #ddd;">Trouser</a>
          <a href="/collections/turf-shoes" class="filter-pill" style="color: #222; background: #f0f0f0; border-color: #ddd;">Turf Shoes</a>
          <a href="/collections/accessories" class="filter-pill" style="color: #222; background: #f0f0f0; border-color: #ddd;">Grip Socks & Gear</a>
        </div>
      </div>
    </div>
  </div>

  <!-- Mobile Drawer -->
  <div id="mobile-nav-drawer" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 99999; display: none;">
    <div style="width: 85%; max-width: 320px; height: 100%; background: #fff; padding: 2.5rem 2rem; display: flex; flex-direction: column; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem;">
        <a href="/" style="display: inline-block;"><img src="/assets/logo.svg" alt="Regards Sports Club" style="height: 38px; width: auto;"></a>
        <button id="mobile-menu-close" style="background: none; border: none; font-size: 2.4rem; cursor: pointer;">&times;</button>
      </div>
      <nav style="display: flex; flex-direction: column; gap: 1.4rem; font-size: 1.5rem; font-weight: 600;">
        <a href="/">HOME</a>
        <a href="/collections/2026-27-player-edition" style="color: var(--color-primary);">🔥 CLUB JERSEY 26–27</a>
        <details style="border-bottom: 1px solid #eee; padding-bottom: 0.8rem;" open>
          <summary style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            JERSEY <span style="font-size: 1.2rem;">▼</span>
          </summary>
          <div style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem 0 0.5rem 1rem; font-size: 1.4rem; font-weight: 500;">
            <a href="/collections/club-jersey" style="color: #444;">Club Jersey</a>
            <a href="/collections/world-cup-2026" style="color: #444;">World Cup 2026</a>
            <a href="/collections/national-jersey" style="color: #444;">National Jersey</a>
            <a href="/collections/retro-jersey" style="color: #444;">Retro Jersey</a>
            <a href="/collections/kids-jersey" style="color: #444;">Kids Jersey</a>
            <a href="/collections/player-edition" style="color: #444;">Player Edition</a>
            <a href="/collections/fan-edition" style="color: #444;">Fan Edition</a>
          </div>
        </details>
        <a href="/collections/trousers-shorts">TROUSER</a>
        <a href="/collections/turf-shoes">TURF SHOES</a>
        <a href="/collections/accessories">ACCESSORIES</a>
        <a href="/pages/contact">SHOWROOM & CONTACT</a>
      </nav>
      <div style="margin-top: auto; padding-top: 2rem; border-top: 1px solid #eee; font-size: 1.3rem; color: #666;">
        <!-- Mobile Customer Auth Section -->
        <div style="padding: 1.4rem 0; border-top: 1px solid #eee; margin-top: 1.2rem;">
          ${currentUser ? `
            <div style="font-size: 1.35rem; font-weight: 700; margin-bottom: 0.8rem; color: #111;">
              👤 Signed in: <strong>${currentUser.name}</strong>
            </div>
            <div style="display: flex; gap: 0.8rem;">
              <a href="/account" class="btn btn-outline" style="flex: 1; padding: 0.85rem; font-size: 1.25rem; text-align: center;">My Account</a>
              <a href="/account/logout" class="btn btn-outline" style="flex: 1; padding: 0.85rem; font-size: 1.25rem; text-align: center; color: var(--color-primary); border-color: var(--color-primary);">Sign Out</a>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 0.8rem;">
              <a href="/account/login" class="btn btn-primary btn-block" style="padding: 1.1rem; text-align: center; font-size: 1.35rem;">
                Sign In to Account
              </a>
              <a href="/account/register" class="btn btn-outline btn-block" style="padding: 1rem; text-align: center; font-size: 1.3rem;">
                Create Account
              </a>
            </div>
          `}
        </div>

        <p>📞 Hotline: +880 1754-724991</p>
        <p>📍 Banasree, Rampura, Dhaka</p>
      </div>
    </div>
  </div>

  <script>
    document.getElementById('mobile-menu-open')?.addEventListener('click', () => {
      document.getElementById('mobile-nav-drawer').style.display = 'block';
    });
    document.getElementById('mobile-menu-close')?.addEventListener('click', () => {
      document.getElementById('mobile-nav-drawer').style.display = 'none';
    });
    
    // Live Search Drawer Modal Listeners
    const searchModal = document.getElementById('search-modal');
    const searchOpenBtn = document.getElementById('search-drawer-open');
    const searchCloseBtn = document.getElementById('search-modal-close');
    const searchInput = document.getElementById('search-modal-input');
    const searchLiveResults = document.getElementById('search-live-results');

    searchOpenBtn?.addEventListener('click', () => {
      searchModal.style.display = 'block';
      searchInput.focus();
    });
    searchCloseBtn?.addEventListener('click', () => {
      searchModal.style.display = 'none';
    });
    searchModal?.addEventListener('click', (e) => {
      if (e.target === searchModal) searchModal.style.display = 'none';
    });

    // Predictive input debounce
    let debounceTimer;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const q = e.target.value.trim();
      if (!q) return;
      debounceTimer = setTimeout(async () => {
        try {
          const res = await fetch('/search/suggest.json?q=' + encodeURIComponent(q));
          const data = await res.json();
          const items = data.resources?.results?.products || [];
          if (items.length === 0) {
            searchLiveResults.innerHTML = '<p style="padding: 1.5rem 0; color: #888;">No exact matches for "' + q + '". Try searching for Real Madrid, Argentina, Turf Shoes, or Trouser.</p>';
          } else {
            searchLiveResults.innerHTML = '<p style="padding: 1.5rem 0; color: #888;">No exact matches for "' + q + '". Try searching for Real Madrid, Argentina, Turf Shoes, or Trouser.</p>';
                '<img src="' + p.image + '" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; background: #f4f4f4;">' +
                '<div>' +
                  '<div style="font-weight: 700; font-size: 1.4rem; color: #111;">' + p.title + '</div>' +
                  '<div style="font-size: 1.3rem; color: var(--color-primary); font-weight: 700;">' + p.price + '</div>' +
                '</div>' +
              '</a>').join('');
          }
        } catch (err) {
          console.error("Search error", err);
        }
      }, 250);
    });
  </script>
  `;
}

function getCartDrawerHtml() {
  return `
  <div class="cart-drawer-overlay" id="cart-drawer-overlay"></div>

  <aside class="cart-drawer" id="cart-drawer" aria-label="Shopping Cart">
    <div class="cart-drawer__header">
      <h2 class="cart-drawer__title">Your Kit Bag</h2>
      <button type="button" class="cart-drawer__close" data-cart-close aria-label="Close Cart">&times;</button>
    </div>

    <div class="cart-drawer__free-shipping">
      <div class="free-shipping__text">
        <span>⚡</span> <span>Add <strong>Tk 850</strong> more to unlock <strong>FREE DELIVERY</strong></span>
      </div>
      <div class="free-shipping__progress-bar">
        <div class="free-shipping__fill" style="width: 65%;"></div>
      </div>
    </div>

    <div class="cart-drawer__items" id="cart-drawer-items">
      ${cartState.items.map(item => `
        <div class="cart-item" data-cart-item-id="${item.key}">
          <div class="cart-item__image">
            <img src="${item.featured_image.url}" alt="${item.title}">
          </div>
          <div>
            <div class="cart-item__title">${item.product_title}</div>
            <div class="cart-item__meta">${item.variant_title}</div>
            ${item.properties && Object.keys(item.properties).length ? `
              <div style="font-size: 1.2rem; color: var(--color-primary); font-weight: 600; margin-bottom: 0.6rem;">
                ${Object.entries(item.properties).map(([k, v]) => `<div>${k}: <strong>${v}</strong></div>`).join('')}
              </div>
            ` : ''}
            <div style="font-size: 1.45rem; font-weight: 700; color: var(--color-dark);">
              Tk ${(item.price / 100).toLocaleString()}
            </div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between;">
            <button type="button" class="btn-remove" data-cart-remove="${item.key}" style="background: none; border: none; font-size: 1.2rem; color: #888; cursor: pointer; text-decoration: underline;">
              Remove
            </button>
            <div style="font-size: 1.3rem; font-weight: 600;">Qty: ${item.quantity}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="cart-drawer__footer">
      <div class="cart-drawer__subtotal">
        <span>Subtotal</span>
        <span id="cart-drawer-subtotal">Tk ${(cartState.total_price / 100).toLocaleString()}</span>
      </div>
      <p style="font-size: 1.25rem; color: var(--color-text-muted); margin-bottom: 1.6rem;">
        Taxes calculated at checkout. Cash on delivery available inside & outside Dhaka.
      </p>
      <a href="/checkout" class="btn btn-primary btn-block" style="padding: 1.6rem; font-size: 1.5rem; text-align: center; text-decoration: none; display: block; font-weight: 700; letter-spacing: 0.04em;">
        Proceed to Checkout &rarr;
      </a>
    </div>
  </aside>
  `;
}

function getFooterHtml() {
  return `
  <footer class="site-footer">
    <div class="container site-footer__grid">
      <div class="site-footer__brand">
        <div style="margin-bottom: 1.8rem;">
          <a href="/"><img src="/assets/logo-white.svg" alt="Regards Sports Club" style="height: 44px; width: auto; max-width: 220px;"></a>
        </div>
        <p>
          Bangladesh's premier omnichannel D2C sports destination for Thailand-imported kits, player editions, turf shoes, and custom line-item jersey printing.
        </p>
        <p class="site-footer__meta">
          🏛️ <strong>Trade License:</strong> TRAD/DSCC/002648/2025<br>
          📍 <strong>Showroom:</strong> House 48, Road 03, Block E, Banasree, Rampura, Dhaka
        </p>
      </div>

      <div>
        <h4 class="footer-title">All Categories</h4>
        <div class="footer-links">
          <a href="/collections/2026-27-player-edition">Club Jersey 26–27</a>
          <a href="/collections/world-cup-2026">World Cup 2026 Kits</a>
          <a href="/collections/national-jersey">National Team Jerseys</a>
          <a href="/collections/retro-jersey">Classic Retro Kits</a>
          <a href="/collections/kids-jersey">Kids Full Kits</a>
          <a href="/collections/trousers-shorts">Training Trousers & Shorts</a>
          <a href="/collections/turf-shoes">Turf & Indoor Shoes</a>
          <a href="/collections/accessories">Grip Socks & Accessories</a>
        </div>
      </div>

      <div>
        <h4 class="footer-title">Customer Care</h4>
        <div class="footer-links">
          <a href="/pages/contact">Showroom & Visit Guide</a>
          <a href="#size-chart" onclick="alert('Official Thai Fit: Size M (38-40in), L (40-42in), XL (42-44in), 2XL (44-46in)'); return false;">Measurement Size Chart</a>
          <a href="#shipping" onclick="alert('Nationwide Delivery: Dhaka City ৳70 (1-2 days), Outside Dhaka ৳120 (2-3 days). Full COD.'); return false;">Shipping & Courier Policy</a>
          <a href="#returns" onclick="alert('7-day instant exchange for size issues at Banasree showroom or via courier.'); return false;">7-Day Easy Exchange</a>
          <a href="https://wa.me/8801754724991" target="_blank" style="color: var(--color-success); font-weight: 700;">WhatsApp Hotline: +880 1754-724991</a>
        </div>
      </div>

      <div class="footer-newsletter">
        <h4 class="footer-title">VIP Drop Alerts</h4>
        <p>Subscribe for secret midnight drops, retro restocks, and exclusive Bangladesh delivery coupons.</p>
        <form class="footer-newsletter-form" onsubmit="alert('Thank you for joining the RSC VIP Club! Check your inbox shortly.'); return false;">
          <input type="email" class="footer-newsletter-input" placeholder="Enter your email..." required>
          <button type="submit" class="btn btn-primary" style="padding: 1rem 1.6rem; font-size: 1.3rem;">Join</button>
        </form>
        <div class="footer-payment-badges">
          <span class="payment-badge">bKash</span>
          <span class="payment-badge">Nagad</span>
          <span class="payment-badge">Rocket</span>
          <span class="payment-badge">COD</span>
          <span class="payment-badge">Visa</span>
          <span class="payment-badge">Mastercard</span>
        </div>
      </div>
    </div>

    <div class="container footer-bottom">
      <div>&copy; ${new Date().getFullYear()} Regards Sports Club Ltd. All Rights Reserved. Built with Scandinavian Minimalism & High-Octane Sports Passion.</div>
      <div class="footer-payment-badges">
        <span class="payment-badge">🔒 256-Bit SSL Encrypted Checkout</span>
      </div>
    </div>
  </footer>
  `;
}

// HELPER: RENDER A PRODUCT CARD COMPONENT
function renderProductCard(p) {
  const secondaryImg = (p.images && p.images.length > 1) ? p.images[1] : p.featured_image;
  const numAngles = p.images ? p.images.length : 1;
  const badgeClass = p.badge && p.badge.includes('PLAYER') ? 'badge-player' : (p.badge && p.badge.includes('WORLD') ? 'badge-hot' : 'badge-new');
  
  return `
  <div class="product-card product-card--secondary-hover">
    <div class="product-card__media">
      ${p.badge ? `<span class="badge ${badgeClass} product-card__badge-tag">${p.badge}</span>` : ''}
      <span class="product-card__angles-pill">📷 ${numAngles} Angles</span>
      <a href="/products/${p.handle}" class="product-card__media-link" aria-label="${p.title}">
        <img src="${p.featured_image}" class="product-card__image" alt="${p.title}" loading="lazy">
        <img src="${secondaryImg}" class="product-card__secondary-image" alt="${p.title} - angle 2" loading="lazy">
      </a>
    </div>
    <div class="product-card__content">
      <div class="product-card__meta">
        <span class="product-card__category">${p.type}</span>
      </div>
      <h3 class="product-card__title">
        <a href="/products/${p.handle}" title="${p.title}">${p.title}</a>
      </h3>
      <div class="product-card__price">
        <span class="price-current ${p.compare_at_price > p.price ? 'has-sale' : ''}">Tk ${(p.price / 100).toLocaleString()}</span>
        ${p.compare_at_price > p.price ? `<span class="price-compare">Tk ${(p.compare_at_price / 100).toLocaleString()}</span>` : ''}
      </div>
      <a href="/products/${p.handle}" class="btn btn-outline btn-block product-card__btn">
        View Product
      </a>
    </div>
  </div>
  `;
}

// 1. HOMEPAGE ROUTE
app.get('/', (req, res) => {
  const currentUser = getLoggedInUser(req);
  // Categorize for AJAX tabs
  const allJerseys = catalog.filter(p => p.categories.includes('club-jersey') || p.categories.includes('world-cup-2026') || p.categories.includes('national-jersey') || p.categories.includes('retro-jersey')).slice(0, 8);
  const trousers = catalog.filter(p => p.categories.includes('trousers-shorts')).slice(0, 6);
  const turfShoes = catalog.filter(p => p.categories.includes('turf-shoes')).slice(0, 6);
  const accessories = catalog.filter(p => p.categories.includes('accessories')).slice(0, 6);
  const featuredAll = catalog.slice(0, 8);

  const html = `
  <!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Regards Sports Club – Official Thailand Imported Football Kits & Sports Apparel</title>
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
    <link rel="alternate icon" type="image/png" href="/assets/favicon.png">
    <link rel="stylesheet" href="/assets/theme.css">
  </head>
  <body>
    ${getHeaderHtml('home', currentUser)}

    <!-- Hero Slideshow Banner -->
    <section class="hero-slideshow">
      <div class="hero-slide is-active" style="background-image: linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.65)), url('https://cdn.shopify.com/s/files/1/0618/5254/9191/files/rn-image_picker_lib_temp_d6e4fe47-9781-4c71-988d-bdb56375d5eb.jpg?width=1600'); background-size: cover; background-position: center;">
        <div class="hero-content">
          <span class="hero-subtitle">⚡ OFFICIAL 2026/27 DROPS & WORLD CUP EDITIONS</span>
          <h1 class="hero-title">Wear The Passion.<br>Rule The Pitch.</h1>
          <p class="hero-text">
            Explore authentic Player Issue match-wear, vintage retro classics, precision stretch trousers, and elite turf footwear.
          </p>
          <div class="hero-actions">
            <a href="/collections/2026-27-player-edition" class="btn btn-primary">Shop 26/27 Kits</a>
            <a href="/collections/turf-shoes" class="btn btn-outline" style="border-color: #fff; color: #fff;">Explore Turf Shoes</a>
          </div>
        </div>
      </div>
    </section>

    <!-- Infinite CSS Urgency Marquee -->
    <div class="marquee-wrapper">
      <div class="marquee-track">
        <div class="marquee-item"><span>⚡ 100% THAILAND IMPORTED FABRICS</span><div class="marquee-dot"></div></div>
        <div class="marquee-item"><span>🔥 PLAYER EDITION MATCH WEAR</span><div class="marquee-dot"></div></div>
        <div class="marquee-item"><span>🚚 CASH ON DELIVERY NATIONWIDE</span><div class="marquee-dot"></div></div>
        <div class="marquee-item"><span>✨ CUSTOM HEAT-PRESS NAME & NUMBER</span><div class="marquee-dot"></div></div>
        <div class="marquee-item"><span>📍 VISIT BANASREE SHOWROOM</span><div class="marquee-dot"></div></div>
        <div class="marquee-item"><span>⚡ 100% THAILAND IMPORTED FABRICS</span><div class="marquee-dot"></div></div>
        <div class="marquee-item"><span>🔥 PLAYER EDITION MATCH WEAR</span><div class="marquee-dot"></div></div>
        <div class="marquee-item"><span>🚚 CASH ON DELIVERY NATIONWIDE</span><div class="marquee-dot"></div></div>
        <div class="marquee-item"><span>✨ CUSTOM HEAT-PRESS NAME & NUMBER</span><div class="marquee-dot"></div></div>
      </div>
    </div>

    <!-- AJAX Tab Showcase: "What's New in The World" -->
    <section class="section-padding" style="background-color: var(--color-bg-white);">
      <div class="container">
        <div style="text-align: center; margin-bottom: 4rem;">
          <span style="color: var(--color-primary); font-weight: 700; text-transform: uppercase; font-size: 1.3rem; letter-spacing: 0.1em;">
            Curated Drops
          </span>
          <h2 style="margin-top: 0.5rem;">What's New in The World</h2>
          <p style="color: var(--color-text-muted); font-size: 1.6rem;">Switch categories instantly without reloading</p>
        </div>

        <!-- AJAX Tab Navigation -->
        <div class="tab-navigation">
          <button type="button" class="tab-btn is-active" data-tab-target="tab-all">All Products (${catalog.length})</button>
          <button type="button" class="tab-btn" data-tab-target="tab-jerseys">Jerseys 26/27 (${allJerseys.length}+)</button>
          <button type="button" class="tab-btn" data-tab-target="tab-trousers">Trousers & Shorts (${trousers.length})</button>
          <button type="button" class="tab-btn" data-tab-target="tab-turf">Turf Shoes (${turfShoes.length})</button>
          <button type="button" class="tab-btn" data-tab-target="tab-accessories">Accessories (${accessories.length})</button>
        </div>

        <!-- Tab Panes -->
        <div class="tab-content">
          <!-- 1. All Products Tab -->
          <div class="tab-pane is-active" id="tab-all">
            ${featuredAll.map(p => renderProductCard(p)).join('')}
          </div>

          <!-- 2. Jerseys Tab -->
          <div class="tab-pane" id="tab-jerseys">
            ${allJerseys.map(p => renderProductCard(p)).join('')}
          </div>

          <!-- 3. Trousers Tab -->
          <div class="tab-pane" id="tab-trousers">
            ${trousers.map(p => renderProductCard(p)).join('')}
          </div>

          <!-- 4. Turf Shoes Tab -->
          <div class="tab-pane" id="tab-turf">
            ${turfShoes.map(p => renderProductCard(p)).join('')}
          </div>

          <!-- 5. Accessories Tab -->
          <div class="tab-pane" id="tab-accessories">
            ${accessories.map(p => renderProductCard(p)).join('')}
          </div>
        </div>

        <div style="text-align: center; margin-top: 4rem;">
          <a href="/collections/all" class="btn btn-primary" style="padding: 1.4rem 3.5rem;">Browse Complete Catalog (${catalog.length} Items) &rarr;</a>
        </div>
      </div>
    </section>

    <!-- Shoppable Lookbook with Interactive Hotspots -->
    <section class="section-padding" style="background-color: var(--color-bg-sand);">
      <div class="container">
        <div style="text-align: center; margin-bottom: 3.5rem;">
          <span style="color: var(--color-primary); font-weight: 700; text-transform: uppercase; font-size: 1.3rem;">Pitch Lifestyle</span>
          <h2 style="margin-top: 0.5rem;">Shoppable Matchday Kitbook</h2>
          <p style="color: #666; font-size: 1.6rem;">Hover or tap hotspots on the players to buy the look</p>
        </div>

        <div class="lookbook-container">
          <img src="https://cdn.shopify.com/s/files/1/0618/5254/9191/files/rn-image_picker_lib_temp_d6e4fe47-9781-4c71-988d-bdb56375d5eb.jpg?width=1400" alt="Regards Sports Club Lookbook" style="width: 100%; border-radius: 12px; filter: brightness(0.92);">

          <!-- Hotspot 1: Real Madrid Kit -->
          <div class="lookbook-hotspot" style="top: 38%; left: 32%;">
            <div class="hotspot-pin"></div>
            <div class="hotspot-pulse"></div>
            <div class="hotspot-popover">
              <strong style="font-size: 1.3rem; display: block; margin-bottom: 0.4rem;">Real Madrid 26/27</strong>
              <span style="color: var(--color-primary); font-weight: 700;">Tk 1,150</span>
              <a href="/products/real-madrid-2026-27-home-jersey-fan-edition" class="btn btn-primary btn-block" style="margin-top: 0.8rem; font-size: 1.1rem; padding: 0.6rem;">Buy Now</a>
            </div>
          </div>

          <!-- Hotspot 2: Turf Shoes -->
          <div class="lookbook-hotspot" style="top: 78%; left: 58%;">
            <div class="hotspot-pin"></div>
            <div class="hotspot-pulse"></div>
            <div class="hotspot-popover">
              <strong style="font-size: 1.3rem; display: block; margin-bottom: 0.4rem;">Predator Turf Boots</strong>
              <span style="color: var(--color-primary); font-weight: 700;">Tk 2,850</span>
              <a href="/collections/turf-shoes" class="btn btn-primary btn-block" style="margin-top: 0.8rem; font-size: 1.1rem; padding: 0.6rem;">Shop Turf</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Trust Anchors & Showroom -->
    <section class="section-padding" style="background-color: var(--color-bg-white);">
      <div class="container">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 3rem;">
          <div style="background: var(--color-bg-alt); padding: 3rem; border-radius: var(--radius-card); border-left: 4px solid var(--color-primary);">
            <h3 style="font-size: 2rem; margin-bottom: 1rem;">📍 Banasree Physical Showroom</h3>
            <p style="color: #666; font-size: 1.45rem; line-height: 1.6;">
              Inspect fabric textures in person, test your size, and get instant custom heat-press name/number printing while you wait!
            </p>
            <p style="margin-top: 1.5rem; font-weight: 600; font-size: 1.35rem;">House 48, Road 03, Block E, Banasree, Rampura, Dhaka</p>
          </div>

          <div style="background: var(--color-bg-alt); padding: 3rem; border-radius: var(--radius-card); border-left: 4px solid var(--color-dark);">
            <h3 style="font-size: 2rem; margin-bottom: 1rem;">⚡ 100% Quality Assurance</h3>
            <p style="color: #666; font-size: 1.45rem; line-height: 1.6;">
              All items are direct Thailand imports featuring AeroReady / Dri-FIT micro-mesh knitting, authentic silicon rubberized badges, and durable sublimation print.
            </p>
            <p style="margin-top: 1.5rem; font-weight: 600; font-size: 1.35rem; color: var(--color-primary);">7-Day Instant Size Exchange Guarantee</p>
          </div>

          <div style="background: var(--color-bg-alt); padding: 3rem; border-radius: var(--radius-card); border-left: 4px solid var(--color-success);">
            <h3 style="font-size: 2rem; margin-bottom: 1rem;">🚚 Fast Nationwide COD</h3>
            <p style="color: #666; font-size: 1.45rem; line-height: 1.6;">
              Dhaka City 24–48 hours home delivery (৳70). All 64 districts outside Dhaka delivered in 48–72 hours via Steadfast & Pathao Courier (৳120).
            </p>
            <p style="margin-top: 1.5rem; font-weight: 600; font-size: 1.35rem; color: var(--color-success);">Cash on Delivery Supported</p>
          </div>
        </div>
      </div>
    </section>

    ${getFooterHtml()}
    ${getCartDrawerHtml()}

    <script src="/assets/theme.js"></script>
    <script>
      // Tab Switching Logic
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('is-active'));
          document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('is-active'));
          btn.classList.add('is-active');
          const targetId = btn.getAttribute('data-tab-target');
          document.getElementById(targetId)?.classList.add('is-active');
        });
      });
    </script>
  </body>
  </html>
  `;
  res.send(html);
});

// 2. PRODUCT DETAIL PAGE (PDP) WITH MULTI-ANGLE GALLERY & HOVER ZOOM
app.get('/products/:handle', (req, res) => {
  const currentUser = getLoggedInUser(req);
  const prod = catalog.find(p => p.handle === req.params.handle) || catalog[0];
  const images = (prod.images && prod.images.length > 0) ? prod.images : [prod.featured_image];

  // Determine variant sizing (Shoe EU sizes vs Apparel M-2XL sizes)
  const isShoes = prod.categories.includes('turf-shoes') || prod.type === 'Turf Shoes';
  const sizeOptions = isShoes 
    ? ['EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44', 'EU 45']
    : ['M', 'L', 'XL', '2XL'];

  const html = `
  <!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>${prod.title} – Regards Sports Club</title>
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
    <link rel="alternate icon" type="image/png" href="/assets/favicon.png">
    <link rel="stylesheet" href="/assets/theme.css">
  </head>
  <body>
    ${getHeaderHtml('jersey', currentUser)}

    <section class="section-padding">
      <div class="container">
        <!-- Breadcrumb Navigation -->
        <div class="collection-breadcrumbs" style="margin-bottom: 2.5rem;">
          <a href="/">Home</a> <span>/</span>
          <a href="/collections/${prod.categories[0] || 'all'}">${prod.type}</a> <span>/</span>
          <span style="color: var(--color-text-main); font-weight: 600;">${prod.title}</span>
        </div>

        <div class="pdp-grid">
          <!-- Left Column: Multi-Angle Media Gallery with Hover Zoom Magnifier -->
          <div class="pdp-gallery">
            <!-- Main Interactive Zoom Stage -->
            <div class="pdp-zoom-stage" id="zoom-stage">
              <span class="pdp-zoom-badge" id="zoom-badge">${prod.badge || prod.type}</span>
              <img id="main-product-image" src="${images[0]}" alt="${prod.title}">
              <div class="pdp-zoom-hint" id="zoom-hint">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                <span>Hover to Zoom (Drag to Pan)</span>
              </div>

              <!-- Prev/Next Angle Arrows -->
              <button type="button" class="pdp-nav-arrow pdp-nav-arrow--prev" id="prev-angle-btn" aria-label="Previous Angle">&#10094;</button>
              <button type="button" class="pdp-nav-arrow pdp-nav-arrow--next" id="next-angle-btn" aria-label="Next Angle">&#10095;</button>
            </div>

            <!-- Angle Count Indicator -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; font-size: 1.3rem; color: #777;">
              <span>Viewing angle: <strong id="active-angle-index" style="color: var(--color-primary);">1</strong> of ${images.length}</span>
              <span>HD 1200px Zoom Ready</span>
            </div>

            <!-- Scrollable Multi-Angle Thumbnail Strip -->
            <div class="pdp-thumbnails" id="pdp-thumbnail-strip">
              ${images.map((imgUrl, idx) => `
                <button type="button" class="pdp-thumb-btn ${idx === 0 ? 'is-active' : ''}" data-image-url="${imgUrl}" data-index="${idx + 1}" aria-label="Angle ${idx + 1}">
                  <img src="${imgUrl}" alt="${prod.title} angle ${idx + 1}">
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Right Column: Purchase Options & Personalization -->
          <div>
            <span style="font-size: 1.3rem; font-weight: 700; text-transform: uppercase; color: var(--color-primary); letter-spacing: 0.08em;">
              ${prod.type} • 100% Authentic Quality
            </span>
            <h1 style="font-size: 3.2rem; margin: 0.6rem 0 1.2rem; line-height: 1.2;">${prod.title}</h1>

            <div style="font-size: 2.6rem; font-weight: 700; color: var(--color-dark); margin-bottom: 2rem; display: flex; align-items: baseline; gap: 1.2rem;">
              <span>Tk ${(prod.price / 100).toLocaleString()}</span>
              ${prod.compare_at_price > prod.price ? `
                <span style="font-size: 1.8rem; text-decoration: line-through; color: #888;">
                  Tk ${(prod.compare_at_price / 100).toLocaleString()}
                </span>
                <span style="font-size: 1.3rem; background: var(--color-primary-light); color: var(--color-primary); font-weight: 700; padding: 0.2rem 0.8rem; border-radius: 4px;">
                  Save Tk ${((prod.compare_at_price - prod.price) / 100).toLocaleString()}
                </span>
              ` : ''}
            </div>

            <form method="post" action="/cart/add.js" data-ajax-cart-form id="main-product-form">
              <input type="hidden" name="id" value="${prod.id}">

              <!-- Variant Sizing Pill Selectors -->
              <div style="margin-bottom: 2.4rem;">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                  <label style="font-weight: 700; font-size: 1.45rem;">
                    Select ${isShoes ? 'Shoe Size (European)' : 'Size'}: 
                    <span data-selected-label="size" style="color: var(--color-primary);">${sizeOptions[0]}</span>
                  </label>
                  <a href="#size-chart" onclick="document.getElementById('size-chart-box').style.display='block'; return false;" style="font-size: 1.3rem; text-decoration: underline; color: #555;">
                    ${isShoes ? 'Shoe Sizing Guide' : 'Jersey Size Chart'}
                  </a>
                </div>
                <div class="variant-pills">
                  ${sizeOptions.map((sz, idx) => `
                    <div class="variant-pill">
                      <input type="radio" id="size-${idx}" name="size" value="${sz}" ${idx === 0 ? 'checked' : ''}>
                      <label for="size-${idx}">${sz}</label>
                    </div>
                  `).join('')}
                </div>
              </div>

              ${!isShoes ? `
                <!-- Custom Personalization Box for Kits -->
                <div class="personalization-box">
                  <div class="personalization-box__label">
                    <span>⚡ Jersey Name & Number Printing</span>
                    <span class="personalization-box__tag">+Tk 250</span>
                  </div>
                  <input
                    type="text"
                    name="properties[Personalize Your Jersey (+Tk 250)]"
                    class="personalization-input"
                    data-personalize-input
                    placeholder="Enter Name & Number (e.g. MESSI 10, RONALDO 7, IMRAN 9)"
                  >
                  <small style="display: block; margin-top: 0.6rem; color: #666; font-size: 1.2rem;">
                    Official league typography heat press. Wash inside out. Add Tk 250 fee on delivery.
                  </small>
                </div>
              ` : ''}

              <!-- Actions -->
              <div style="display: flex; flex-direction: column; gap: 1.2rem; margin-top: 2rem;">
                <button type="submit" class="btn btn-primary btn-block" id="main-atc-button" style="padding: 1.6rem; font-size: 1.5rem;">
                  Add to Kit Bag • Tk ${(prod.price / 100).toLocaleString()}
                </button>

                <button
                  type="button"
                  id="whatsapp-order-btn"
                  class="btn btn-whatsapp btn-block"
                  data-phone="8801754724991"
                  data-product-title="${prod.title}"
                >
                  Order Instantly via WhatsApp (+880 1754-724991)
                </button>
              </div>
            </form>

            <!-- Size Chart Modal Box -->
            <div id="size-chart-box" style="display: none; background: #fff; border: 1px solid #ccc; padding: 2rem; border-radius: var(--radius-inner); margin-top: 2rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h4 style="font-size: 1.6rem;">${isShoes ? 'Turf Shoe Size Conversion' : 'Jersey Fit Guide (Inches)'}</h4>
                <button onclick="document.getElementById('size-chart-box').style.display='none';" style="background: none; border: none; font-size: 1.8rem; cursor: pointer;">&times;</button>
              </div>
              ${isShoes ? `
                <table class="size-chart-table">
                  <thead><tr><th>EU Size</th><th>UK Size</th><th>US Size</th><th>Foot Length (CM)</th></tr></thead>
                  <tbody>
                    <tr><td>40</td><td>6.0</td><td>7.0</td><td>25.0 cm</td></tr>
                    <tr><td>41</td><td>7.0</td><td>8.0</td><td>26.0 cm</td></tr>
                    <tr><td>42</td><td>7.5</td><td>8.5</td><td>26.5 cm</td></tr>
                    <tr><td>43</td><td>8.5</td><td>9.5</td><td>27.5 cm</td></tr>
                    <tr><td>44</td><td>9.0</td><td>10.0</td><td>28.0 cm</td></tr>
                    <tr><td>45</td><td>10.0</td><td>11.0</td><td>29.0 cm</td></tr>
                  </tbody>
                </table>
              ` : `
                <table class="size-chart-table">
                  <thead><tr><th>Size</th><th>Chest (Inches)</th><th>Length (Inches)</th><th>Recommended Weight</th></tr></thead>
                  <tbody>
                    <tr><td>M</td><td>38 - 40"</td><td>27 - 28"</td><td>55 - 65 kg</td></tr>
                    <tr><td>L</td><td>40 - 42"</td><td>28 - 29"</td><td>65 - 75 kg</td></tr>
                    <tr><td>XL</td><td>42 - 44"</td><td>29 - 30"</td><td>75 - 85 kg</td></tr>
                    <tr><td>2XL</td><td>44 - 46"</td><td>30 - 31"</td><td>85 - 95 kg</td></tr>
                  </tbody>
                </table>
              `}
            </div>

            <!-- Product Details Accordions -->
            <div style="margin-top: 3.5rem;">
              <div class="accordion-item">
                <details open>
                  <summary class="accordion-summary">Product Specifications <span>-</span></summary>
                  <div class="accordion-content">
                    ${prod.description}<br><br>
                    • 100% Thailand-imported high-density weave fabric.<br>
                    • Official crest and sponsor detailing.<br>
                    • Breathable moisture-absorbing mesh structure.
                  </div>
                </details>
              </div>

              <div class="accordion-item">
                <details>
                  <summary class="accordion-summary">Washing & Care Instructions <span>+</span></summary>
                  <div class="accordion-content">
                    • Machine wash cold or gentle hand wash.<br>
                    • Do not bleach or tumble dry.<br>
                    • Iron inside out (avoid direct heat on numbers/badges).
                  </div>
                </details>
              </div>

              <div class="accordion-item">
                <details>
                  <summary class="accordion-summary">Shipping & Delivery Rates <span>+</span></summary>
                  <div class="accordion-content">
                    🚚 <strong>Dhaka City:</strong> ৳70 (1–2 days delivery, Full COD).<br>
                    🚚 <strong>Outside Dhaka:</strong> ৳120 (2–3 days delivery across all 64 districts via Steadfast).
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Sticky Mobile CTA -->
    <div class="sticky-atc-bar" id="sticky-atc-bar">
      <div class="sticky-atc-bar__info">
        <img src="${images[0]}" class="sticky-atc-bar__img" alt="${prod.title}">
        <div class="sticky-atc-bar__title">${prod.title}</div>
      </div>
      <button type="button" class="btn btn-accent" onclick="document.getElementById('main-atc-button').click();" style="padding: 1rem 2rem; font-size: 1.3rem;">
        Add • Tk ${(prod.price / 100).toLocaleString()}
      </button>
    </div>

    ${getFooterHtml()}
    ${getCartDrawerHtml()}

    <script src="/assets/theme.js"></script>

    <!-- INTERACTIVE HOVER ZOOM & MULTI-ANGLE CAROUSEL SCRIPT -->
    <script>
      (function() {
        const zoomStage = document.getElementById('zoom-stage');
        const mainImg = document.getElementById('main-product-image');
        const zoomHint = document.getElementById('zoom-hint');
        const thumbBtns = document.querySelectorAll('.pdp-thumb-btn');
        const activeAngleSpan = document.getElementById('active-angle-index');
        const prevBtn = document.getElementById('prev-angle-btn');
        const nextBtn = document.getElementById('next-angle-btn');

        let currentIdx = 0;
        const imgList = Array.from(thumbBtns).map(btn => btn.getAttribute('data-image-url'));

        function switchAngle(index) {
          if (index < 0) index = imgList.length - 1;
          if (index >= imgList.length) index = 0;
          currentIdx = index;

          mainImg.src = imgList[currentIdx];
          activeAngleSpan.textContent = currentIdx + 1;

          thumbBtns.forEach((btn, idx) => {
            if (idx === currentIdx) {
              btn.classList.add('is-active');
              btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            } else {
              btn.classList.remove('is-active');
            }
          });

          // Reset zoom on switch
          mainImg.style.transformOrigin = 'center center';
          mainImg.style.transform = 'scale(1)';
          if (zoomHint) zoomHint.style.opacity = '1';
        }

        // Thumb click and hover switch
        thumbBtns.forEach((btn, idx) => {
          btn.addEventListener('click', () => switchAngle(idx));
          btn.addEventListener('mouseenter', () => switchAngle(idx));
        });

        // Prev & Next Buttons
        prevBtn?.addEventListener('click', (e) => {
          e.stopPropagation();
          switchAngle(currentIdx - 1);
        });
        nextBtn?.addEventListener('click', (e) => {
          e.stopPropagation();
          switchAngle(currentIdx + 1);
        });

        // ==========================================
        // HOVER ZOOM EFFECT (DESKTOP MOUSE ONLY - PREVENTS MOBILE TOUCH ZOOM)
        // ==========================================
        const canHover = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 900px)').matches;
        if (canHover) {
          zoomStage.addEventListener('mouseenter', () => {
            if (zoomHint) zoomHint.style.opacity = '0';
            mainImg.style.transform = 'scale(2.2)';
          });

          zoomStage.addEventListener('mousemove', (e) => {
            const rect = zoomStage.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            mainImg.style.transformOrigin = x + "% " + y + "%";
          });

          zoomStage.addEventListener('mouseleave', () => {
            if (zoomHint) zoomHint.style.opacity = '1';
            mainImg.style.transformOrigin = 'center center';
            mainImg.style.transform = 'scale(1)';
          });
        } else {
          // Mobile / touch devices: completely disable transform and hint
          mainImg.style.transform = 'none';
          mainImg.style.transformOrigin = 'center center';
          if (zoomHint) zoomHint.style.display = 'none';
        }
      })();
    </script>
  </body>
  </html>
  `;
  res.send(html);
});

// 3. COLLECTIONS ROUTE (EVERY CATEGORY PAGE + SUB-FILTERING + SEARCH)
app.get('/collections/:handle', (req, res) => {
  const currentUser = getLoggedInUser(req);
  const handle = req.params.handle;
  const q = (req.query.q || '').toLowerCase().trim();
  const sortBy = req.query.sort_by || 'featured';

  // Category Metadata Definitions
  const categoryMeta = {
    'all': {
      title: 'Complete Sports Catalog',
      desc: 'Browse our full collection of Thailand-imported football kits, training apparel, turf shoes, and accessories.',
      activeNav: 'jersey'
    },
    'club-jersey': {
      title: 'European Club Jerseys (2025–2027)',
      desc: 'Authentic club kits from Real Madrid, Barcelona, Arsenal, Man City, AC Milan, Bayern Munich, and Celtic in Player & Fan Editions.',
      activeNav: 'club2627'
    },
    '2026-27-player-edition': {
      title: 'Club Jersey 26–27 (Player Edition)',
      desc: 'Elite aerodynamic match-issue jerseys with heat-pressed crests, laser-cut ventilation, and athletic slim fit.',
      activeNav: 'club2627'
    },
    'world-cup-2026': {
      title: 'World Cup 2026 Official Jerseys',
      desc: 'Get ready for the 2026 World Cup with Argentina, Brazil, England, Germany, Portugal, and Spain tournament kits.',
      activeNav: 'jersey'
    },
    'national-jersey': {
      title: 'National Team Jerseys',
      desc: 'Classic and modern international kits worn by World Champions and continental title contenders.',
      activeNav: 'jersey'
    },
    'retro-jersey': {
      title: 'Iconic Classic Retro Jerseys',
      desc: 'Step into football history with legendary kits from the 1998, 2002, 2006, 2008, 2010, and 2012 glory eras.',
      activeNav: 'jersey'
    },
    'kids-jersey': {
      title: 'Kids & Junior Full Kits',
      desc: 'Complete 2-piece junior sets (match-replica jersey + elasticated drawstring shorts) for young athletes.',
      activeNav: 'jersey'
    },
    'player-edition': {
      title: 'Player Edition Match Issue Kits',
      desc: 'Ultra-lightweight high-performance jerseys engineered with heat-sealed logos and athletic compression fabrics.',
      activeNav: 'jersey'
    },
    'fan-edition': {
      title: 'Fan Edition Stadium Jerseys',
      desc: 'Comfort-fit daily sportswear with embroidered woven crests, durable poly-knit construction, and relaxed tailoring.',
      activeNav: 'jersey'
    },
    'trousers-shorts': {
      title: 'Athletic Trousers & Training Shorts',
      desc: 'Ultra-stretch, tapered moisture-wicking training pants and lightweight shorts with zipped pockets.',
      activeNav: 'trouser'
    },
    'turf-shoes': {
      title: 'Turf & Indoor Football Shoes',
      desc: 'Multi-ground rubber studded boots, laceless collars, and agility soles built for artificial grass and indoor pitches.',
      activeNav: 'turf'
    },
    'accessories': {
      title: 'Grip Socks & Training Accessories',
      desc: 'Anti-slip performance grip socks, FIFA quality match balls, goalkeeper gloves, pumps, and captain armbands.',
      activeNav: 'accessories'
    }
  };

  const currentMeta = categoryMeta[handle] || {
    title: handle.replace(/-/g, ' ').toUpperCase(),
    desc: `Discover all products curated under ${handle.replace(/-/g, ' ')}.`,
    activeNav: 'jersey'
  };

  // Filter products by collection handle
  let filtered = catalog.filter(p => {
    if (handle === 'all') return true;
    return p.categories.includes(handle);
  });

  // Additional search filter if ?q= is present
  if (q) {
    filtered = filtered.filter(p => {
      return (
        p.title.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(q))) ||
        p.description.toLowerCase().includes(q)
      );
    });
  }

  // Sorting
  if (sortBy === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sortBy === 'title-asc') {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  }

  const html = `
  <!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>${currentMeta.title} – Regards Sports Club</title>
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
    <link rel="alternate icon" type="image/png" href="/assets/favicon.png">
    <link rel="stylesheet" href="/assets/theme.css">
  </head>
  <body>
    ${getHeaderHtml(currentMeta.activeNav)}

    <!-- Collection Header Banner -->
    <section class="collection-hero">
      <div class="container collection-hero__inner">
        <div class="collection-breadcrumbs">
          <a href="/">Home</a> <span>/</span>
          <a href="/collections/all">Collections</a> <span>/</span>
          <span style="color: var(--color-primary);">${currentMeta.title}</span>
        </div>

        <h1 class="collection-title">${currentMeta.title}</h1>
        <p class="collection-desc">${currentMeta.desc}</p>

        <!-- Subcategory Filter Pills -->
        <div class="collection-filter-bar">
          <a href="/collections/all" class="filter-pill ${handle === 'all' ? 'is-active' : ''}">All (${catalog.length})</a>
          <a href="/collections/club-jersey" class="filter-pill ${handle === 'club-jersey' ? 'is-active' : ''}">Club Jersey</a>
          <a href="/collections/world-cup-2026" class="filter-pill ${handle === 'world-cup-2026' ? 'is-active' : ''}">World Cup 2026</a>
          <a href="/collections/national-jersey" class="filter-pill ${handle === 'national-jersey' ? 'is-active' : ''}">National Jersey</a>
          <a href="/collections/retro-jersey" class="filter-pill ${handle === 'retro-jersey' ? 'is-active' : ''}">Retro Jersey</a>
          <a href="/collections/kids-jersey" class="filter-pill ${handle === 'kids-jersey' ? 'is-active' : ''}">Kids Jersey</a>
          <a href="/collections/player-edition" class="filter-pill ${handle === 'player-edition' ? 'is-active' : ''}">Player Edition</a>
          <a href="/collections/fan-edition" class="filter-pill ${handle === 'fan-edition' ? 'is-active' : ''}">Fan Edition</a>
          <a href="/collections/trousers-shorts" class="filter-pill ${handle === 'trousers-shorts' ? 'is-active' : ''}">Trouser</a>
          <a href="/collections/turf-shoes" class="filter-pill ${handle === 'turf-shoes' ? 'is-active' : ''}">Turf Shoes</a>
          <a href="/collections/accessories" class="filter-pill ${handle === 'accessories' ? 'is-active' : ''}">Accessories</a>
        </div>
      </div>
    </section>

    <!-- Collection Toolbar & Product Grid -->
    <section class="section-padding" style="background-color: var(--color-bg-white);">
      <div class="container">
        <div class="collection-toolbar">
          <div class="collection-count">
            Showing <strong>${filtered.length}</strong> items in <strong>${currentMeta.title}</strong>
            ${q ? ` for query "<strong>${q}</strong>"` : ''}
          </div>

          <div style="display: flex; align-items: center; gap: 1rem;">
            <label for="sort-select" style="font-size: 1.35rem; font-weight: 600;">Sort By:</label>
            <select id="sort-select" class="collection-sort-select" onchange="window.location.href = window.location.pathname + '?sort_by=' + this.value + '${q ? '&q=' + encodeURIComponent(q) : ''}';">
              <option value="featured" ${sortBy === 'featured' ? 'selected' : ''}>Featured</option>
              <option value="price-low" ${sortBy === 'price-low' ? 'selected' : ''}>Price: Low to High</option>
              <option value="price-high" ${sortBy === 'price-high' ? 'selected' : ''}>Price: High to Low</option>
              <option value="title-asc" ${sortBy === 'title-asc' ? 'selected' : ''}>Alphabetical: A-Z</option>
            </select>
          </div>
        </div>

        ${filtered.length === 0 ? `
          <div style="text-align: center; padding: 6rem 2rem; background: var(--color-bg-alt); border-radius: var(--radius-card); margin: 3rem 0;">
            <h3 style="font-size: 2.4rem; margin-bottom: 1rem;">No products found in this category</h3>
            <p style="color: #666; font-size: 1.5rem; margin-bottom: 2.5rem;">Try viewing all products or check our most popular collections.</p>
            <a href="/collections/all" class="btn btn-primary">Browse All Products</a>
          </div>
        ` : `
          <div class="collection-grid">
            ${filtered.map(p => renderProductCard(p)).join('')}
          </div>
        `}
      </div>
    </section>

    ${getFooterHtml()}
    ${getCartDrawerHtml()}

    <script src="/assets/theme.js"></script>
  </body>
  </html>
  `;
  res.send(html);
});

// 4. SEARCH RESULTS ROUTE
app.get('/search', (req, res) => {
  const q = (req.query.q || '').trim();
  res.redirect(`/collections/all?q=${encodeURIComponent(q)}`);
});

// 5. CONTACT / SHOWROOM ROUTE
app.get('/pages/contact', (req, res) => {
  const currentUser = getLoggedInUser(req);
  const html = `
  <!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Showroom Location & Contact – Regards Sports Club</title>
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
    <link rel="alternate icon" type="image/png" href="/assets/favicon.png">
    <link rel="stylesheet" href="/assets/theme.css">
  </head>
  <body>
    ${getHeaderHtml('', currentUser)}

    <section class="section-padding">
      <div class="container" style="max-width: 800px;">
        <span style="color: var(--color-primary); font-weight: 700; text-transform: uppercase; font-size: 1.3rem;">Visit Us in Dhaka</span>
        <h1 style="margin: 0.5rem 0 2rem;">Regards Sports Club Showroom</h1>
        <p style="color: #666; font-size: 1.6rem; margin-bottom: 3rem;">
          Try your kit size in person, inspect Thailand-imported jersey fabrics, and get instant custom name & number printing at our Banasree showroom.
        </p>

        <div style="background: var(--color-bg-sand); padding: 3rem; border-radius: var(--radius-card); border: 1px solid var(--color-border); margin-bottom: 3rem;">
          <h3 style="margin-bottom: 1.5rem;">Store Information</h3>
          <p><strong>📍 Address:</strong><br>House #48, Road #03, Block #E, Banasree, Rampura, Dhaka-1219, Bangladesh</p>
          <p style="margin-top: 1.2rem;"><strong>🕒 Store Hours:</strong><br>Every Day: 10:00 AM – 10:30 PM</p>
          <p style="margin-top: 1.2rem;"><strong>📞 Hotline & WhatsApp:</strong><br>+880 1754-724991 / +880 1629-381501</p>
          <p style="margin-top: 1.2rem;"><strong>✉️ Email:</strong><br>support@regardssportsclub.com / bysportsbd@gmail.com</p>
          <p style="margin-top: 1.2rem;"><strong>🏛️ Trade License No:</strong><br>TRAD/DSCC/002648/2025 (Dhaka South City Corporation)</p>
        </div>

        <a href="/" class="btn btn-primary">&larr; Return to Storefront</a>
      </div>
    </section>

    ${getFooterHtml()}
    ${getCartDrawerHtml()}

    <script src="/assets/theme.js"></script>
  </body>
  </html>
  `;
  res.send(html);
});

// START SERVER (Localhost or Vercel Serverless)
if (!process.env.VERCEL) {
  
// =========================================================================
// CUSTOMER AUTHENTICATION & ACCOUNT ROUTES (LOGIN / REGISTER / ACCOUNT / LOGOUT)
// =========================================================================

// 1. LOGIN PAGE (GET)
app.get('/account/login', (req, res) => {
  const currentUser = getLoggedInUser(req);
  if (currentUser) return res.redirect('/account');

  const error = req.query.error;
  const registered = req.query.registered;
  const loggedOut = req.query.logged_out;
  const returnTo = req.query.return_to || '/account';

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Customer Sign In | Regards Sports Club</title>
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
    <link rel="stylesheet" href="/assets/theme.css">
  </head>
  <body>
    ${getHeaderHtml('', currentUser)}

    <main class="section-padding" style="background-color: var(--color-bg-sand); min-height: 75vh;">
      <div class="container">
        <div class="auth-wrapper">
          <h1 class="auth-title">Sign In</h1>
          <p class="auth-subtitle">Access your RSC kit orders, tracking & saved delivery details.</p>

          ${error ? `
            <div style="background: #FEE2E2; border: 1px solid #EF4444; color: #B91C1C; padding: 1.2rem; border-radius: 6px; font-size: 1.35rem; margin-bottom: 2rem;">
              ⚠️ Invalid email or password. Please try again or use the 1-Click Demo Login below.
            </div>
          ` : ''}

          ${registered ? `
            <div style="background: #DCFCE7; border: 1px solid #22C55E; color: #15803D; padding: 1.2rem; border-radius: 6px; font-size: 1.35rem; margin-bottom: 2rem;">
              🎉 Account created successfully! Please sign in with your credentials.
            </div>
          ` : ''}

          ${loggedOut ? `
            <div style="background: #F3F4F6; border: 1px solid #D1D5DB; color: #374151; padding: 1.2rem; border-radius: 6px; font-size: 1.35rem; margin-bottom: 2rem;">
              🔒 You have successfully signed out.
            </div>
          ` : ''}

          <form action="/account/login" method="post">
            <input type="hidden" name="return_to" value="${returnTo}">
            <div class="auth-form-group">
              <label class="auth-label" for="login-email">Email Address</label>
              <input type="email" id="login-email" name="email" class="auth-input" placeholder="e.g. customer@regards.club" required value="demo@regards.club">
            </div>

            <div class="auth-form-group">
              <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <label class="auth-label" for="login-password">Password</label>
                <a href="#forgot" onclick="alert('Demo Mode: Use password "password123" or register a new account.'); return false;" style="font-size: 1.25rem; color: var(--color-primary); text-decoration: underline;">Forgot?</a>
              </div>
              <input type="password" id="login-password" name="password" class="auth-input" placeholder="Enter your password" required value="password123">
            </div>

            <button type="submit" class="btn btn-primary btn-block" style="padding: 1.4rem; font-size: 1.5rem; margin-top: 1rem;">
              Sign In to Your Account
            </button>
          </form>

          <!-- 1-Click Quick Demo Login Box -->
          <div style="margin-top: 2.5rem; padding-top: 2rem; border-top: 1px solid #eee; text-align: center;">
            <p style="font-size: 1.25rem; color: #666; margin-bottom: 1rem;">Testing the store as a reviewer?</p>
            <form action="/account/login" method="post">
              <input type="hidden" name="email" value="demo@regards.club">
              <input type="hidden" name="password" value="password123">
              <input type="hidden" name="return_to" value="${returnTo}">
              <button type="submit" class="btn btn-outline btn-block" style="padding: 1rem; font-size: 1.3rem; background: #FFF;">
                ⚡ 1-Click Demo Login (Naimur Rahman)
              </button>
            </form>
          </div>

          <div style="margin-top: 2.5rem; text-align: center; font-size: 1.4rem; color: #666;">
            Don't have an account yet? 
            <a href="/account/register" style="color: var(--color-primary); font-weight: 700; text-decoration: underline;">Create One Here</a>
          </div>
        </div>
      </div>
    </main>

    ${getFooterHtml()}
    ${getCartDrawerHtml()}
    <script src="/assets/theme.js"></script>
  </body>
  </html>
  `;
  res.send(html);
});

// 2. LOGIN PROCESS (POST)
app.post('/account/login', (req, res) => {
  const { email, password, return_to = '/account' } = req.body;
  const user = users.find(u => u.email.toLowerCase() === (email || '').trim().toLowerCase());

  if (!user || user.password !== password) {
    return res.redirect(`/account/login?error=invalid&return_to=${encodeURIComponent(return_to)}`);
  }

  // Set session cookie (30 days)
  res.setHeader('Set-Cookie', `rsc_user_email=${encodeURIComponent(user.email)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
  res.redirect(return_to || '/account');
});

// 3. REGISTER PAGE (GET)
app.get('/account/register', (req, res) => {
  const currentUser = getLoggedInUser(req);
  if (currentUser) return res.redirect('/account');

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Create Customer Account | Regards Sports Club</title>
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
    <link rel="stylesheet" href="/assets/theme.css">
  </head>
  <body>
    ${getHeaderHtml('', currentUser)}

    <main class="section-padding" style="background-color: var(--color-bg-sand); min-height: 75vh;">
      <div class="container">
        <div class="auth-wrapper" style="max-width: 540px;">
          <h1 class="auth-title">Create Account</h1>
          <p class="auth-subtitle">Join the RSC Club for 1-click checkout, instant drops & tracking.</p>

          <form action="/account/register" method="post">
            <div class="auth-form-group">
              <label class="auth-label" for="reg-name">Full Name *</label>
              <input type="text" id="reg-name" name="name" class="auth-input" placeholder="e.g. Tanvir Ahmed" required>
            </div>

            <div class="checkout-input-row checkout-input-row--2 auth-form-group">
              <div>
                <label class="auth-label" for="reg-email">Email Address *</label>
                <input type="email" id="reg-email" name="email" class="auth-input" placeholder="tanvir@example.com" required>
              </div>
              <div>
                <label class="auth-label" for="reg-phone">Phone Number (Bangladesh) *</label>
                <input type="tel" id="reg-phone" name="phone" class="auth-input" placeholder="017XXXXXXXX" required>
              </div>
            </div>

            <div class="auth-form-group">
              <label class="auth-label" for="reg-password">Password (Minimum 6 Characters) *</label>
              <input type="password" id="reg-password" name="password" class="auth-input" placeholder="••••••••" minlength="6" required>
            </div>

            <div class="auth-form-group">
              <label class="auth-label" for="reg-address">Delivery Address (Optional)</label>
              <input type="text" id="reg-address" name="address" class="auth-input" placeholder="House, Road, Area, Dhaka">
            </div>

            <button type="submit" class="btn btn-primary btn-block" style="padding: 1.4rem; font-size: 1.5rem; margin-top: 1rem;">
              Complete Registration &rarr;
            </button>
          </form>

          <div style="margin-top: 2.5rem; text-align: center; font-size: 1.4rem; color: #666;">
            Already have an RSC account? 
            <a href="/account/login" style="color: var(--color-primary); font-weight: 700; text-decoration: underline;">Sign In Here</a>
          </div>
        </div>
      </div>
    </main>

    ${getFooterHtml()}
    ${getCartDrawerHtml()}
    <script src="/assets/theme.js"></script>
  </body>
  </html>
  `;
  res.send(html);
});

// 4. REGISTER PROCESS (POST)
app.post('/account/register', (req, res) => {
  const { name, email, phone, password, address = '' } = req.body;

  if (!name || !email || !password) {
    return res.redirect('/account/register?error=missing_fields');
  }

  // Check if exists
  const existing = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existing) {
    return res.redirect('/account/login?error=exists');
  }

  const newUser = {
    id: 'usr_' + Date.now(),
    name: name.trim(),
    email: email.trim(),
    phone: (phone || '').trim(),
    password: password,
    city: 'Dhaka',
    address: address.trim(),
    createdAt: new Date().toISOString(),
    orders: []
  };

  users.push(newUser);

  // Set session cookie
  res.setHeader('Set-Cookie', `rsc_user_email=${encodeURIComponent(newUser.email)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
  res.redirect('/account');
});

// 5. ACCOUNT DASHBOARD (GET)
app.get('/account', (req, res) => {
  const currentUser = getLoggedInUser(req);
  if (!currentUser) {
    return res.redirect('/account/login?return_to=/account');
  }

  // Combine user.orders and global orders for this user
  const userOrders = orders.filter(o => 
    (o.customer && o.customer.email && o.customer.email.toLowerCase() === currentUser.email.toLowerCase()) ||
    (currentUser.orders && currentUser.orders.some(uo => uo.id === o.id))
  );

  const updated = req.query.updated;

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Customer Dashboard | Regards Sports Club</title>
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
    <link rel="stylesheet" href="/assets/theme.css">
  </head>
  <body>
    ${getHeaderHtml('account', currentUser)}

    <main class="section-padding" style="background-color: var(--color-bg-sand); min-height: 80vh;">
      <div class="container">
        <!-- Dashboard Top Banner -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.5rem; margin-bottom: 2.5rem;">
          <div>
            <h1 style="font-size: 3rem; margin: 0 0 0.4rem;">Hello, ${currentUser.name}!</h1>
            <p style="color: #666; font-size: 1.45rem; margin: 0;">Welcome to your Regards Sports Club customer portal.</p>
          </div>
          <div style="display: flex; gap: 1rem;">
            <a href="/checkout" class="btn btn-primary" style="padding: 1rem 1.8rem; font-size: 1.35rem;">🛍️ Proceed to Checkout</a>
            <a href="/account/logout" class="btn btn-outline" style="padding: 1rem 1.6rem; font-size: 1.35rem; color: var(--color-primary); border-color: var(--color-primary);">🚪 Sign Out</a>
          </div>
        </div>

        ${updated ? `
          <div style="background: #DCFCE7; border: 1px solid #22C55E; color: #15803D; padding: 1.2rem; border-radius: 6px; font-size: 1.35rem; margin-bottom: 2rem;">
            ✅ Profile and delivery address updated successfully!
          </div>
        ` : ''}

        <div class="account-grid">
          <!-- Left Column: Customer Profile & Saved Delivery Address -->
          <div class="account-card">
            <h2 style="font-size: 2rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #eee;">
              👤 Customer Profile
            </h2>
            <form action="/account/update" method="post">
              <div class="auth-form-group">
                <label class="auth-label" for="prof-name">Full Name</label>
                <input type="text" id="prof-name" name="name" class="auth-input" value="${currentUser.name}" required>
              </div>

              <div class="auth-form-group">
                <label class="auth-label">Email Address (Read-only)</label>
                <input type="email" class="auth-input" value="${currentUser.email}" disabled style="background: #f7f7f7; color: #888;">
              </div>

              <div class="auth-form-group">
                <label class="auth-label" for="prof-phone">Contact Phone</label>
                <input type="tel" id="prof-phone" name="phone" class="auth-input" value="${currentUser.phone || ''}" placeholder="017XXXXXXXX">
              </div>

              <div class="auth-form-group">
                <label class="auth-label" for="prof-address">Default Delivery Street Address</label>
                <textarea id="prof-address" name="address" class="auth-input" rows="3" placeholder="House, Road, Area, Dhaka">${currentUser.address || ''}</textarea>
              </div>

              <button type="submit" class="btn btn-outline btn-block" style="padding: 1.2rem; font-size: 1.35rem; font-weight: 700;">
                Update Saved Details
              </button>
            </form>
          </div>

          <!-- Right Column: Order History & Live Line-Item Tracking -->
          <div class="account-card" id="orders">
            <h2 style="font-size: 2rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
              <span>📦 My Order History (${userOrders.length})</span>
              <span style="font-size: 1.3rem; color: #888; font-weight: normal;">Steadfast & Pathao Courier Track</span>
            </h2>

            ${userOrders.length === 0 ? `
              <div style="text-align: center; padding: 5rem 2rem;">
                <p style="font-size: 1.8rem; font-weight: 600; margin-bottom: 1rem;">No orders placed yet.</p>
                <p style="color: #666; font-size: 1.45rem; margin-bottom: 2.5rem;">Pick from our Player Edition 2026/27 kits, retro classics & turf shoes.</p>
                <a href="/collections/all" class="btn btn-primary" style="padding: 1.2rem 2.5rem; font-size: 1.4rem;">Browse Match Kits</a>
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 2rem;">
                ${userOrders.map(order => `
                  <div style="border: 1px solid #E5E5E5; border-radius: 8px; padding: 2rem; background: #FAFAFA;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border-bottom: 1px solid #EAEAEA; padding-bottom: 1.2rem; margin-bottom: 1.5rem;">
                      <div>
                        <span style="font-size: 1.6rem; font-weight: 700; color: var(--color-dark);">Order ${order.id}</span>
                        <span style="margin-left: 1rem; font-size: 1.3rem; color: #777;">${order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB') : (order.date || 'Recent')}</span>
                      </div>
                      <span class="badge ${order.status === 'Delivered' ? 'badge-new' : 'badge-hot'}" style="font-size: 1.15rem; padding: 0.4rem 1rem;">
                        ${order.status}
                      </span>
                    </div>

                    <!-- Items List -->
                    <div style="display: flex; flex-direction: column; gap: 1.2rem; margin-bottom: 1.5rem;">
                      ${order.items.map(item => `
                        <div style="display: flex; align-items: center; gap: 1.4rem;">
                          <img src="${(item.featured_image && item.featured_image.url) ? item.featured_image.url : (item.image || '/assets/products/argentinaPlayr.jpeg')}" style="width: 55px; height: 55px; object-fit: cover; border-radius: 6px; border: 1px solid #eee;">
                          <div style="flex: 1;">
                            <div style="font-weight: 600; font-size: 1.4rem;">${item.product_title || item.title}</div>
                            <div style="font-size: 1.25rem; color: #666;">${item.variant_title || item.size || 'Standard'} • Qty: ${item.quantity}</div>
                            ${item.properties && Object.keys(item.properties).length ? `
                              <div style="font-size: 1.15rem; color: var(--color-primary); font-weight: 600;">
                                ${Object.entries(item.properties).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                              </div>
                            ` : ''}
                          </div>
                          <div style="font-weight: 700; font-size: 1.45rem;">
                            Tk ${item.price ? ((item.price > 10000 ? item.price / 100 : item.price)).toLocaleString() : '1,850'}
                          </div>
                        </div>
                      `).join('')}
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border-top: 1px solid #EAEAEA; padding-top: 1.2rem; font-size: 1.35rem;">
                      <div>
                        <strong>Payment:</strong> ${order.paymentMethod || 'Cash on Delivery'}
                        ${order.trxId ? ` (TrxID: <code>${order.trxId}</code>)` : ''}
                      </div>
                      <div style="font-size: 1.6rem; font-weight: 700; color: var(--color-primary);">
                        Total: Tk ${(order.total || 1920).toLocaleString()}
                      </div>
                    </div>

                    <div style="margin-top: 1.2rem; text-align: right;">
                      <a href="https://wa.me/8801754724991?text=${encodeURIComponent('Hello Regards Sports Club! I have an inquiry about my Order ' + order.id)}" target="_blank" class="btn btn-whatsapp" style="padding: 0.8rem 1.4rem; font-size: 1.25rem;">
                        💬 WhatsApp Tracking for ${order.id}
                      </a>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    </main>

    ${getFooterHtml()}
    ${getCartDrawerHtml()}
    <script src="/assets/theme.js"></script>
  </body>
  </html>
  `;
  res.send(html);
});

// 6. UPDATE PROFILE (POST)
app.post('/account/update', (req, res) => {
  const currentUser = getLoggedInUser(req);
  if (!currentUser) return res.redirect('/account/login');

  const { name, phone, address } = req.body;
  if (name) currentUser.name = name.trim();
  if (phone) currentUser.phone = phone.trim();
  if (address) currentUser.address = address.trim();

  res.redirect('/account?updated=1');
});

// 7. LOGOUT (GET)
app.get('/account/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'rsc_user_email=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  res.redirect('/account/login?logged_out=1');
});

// =========================================================================
// CHECKOUT & ORDER COMPLETION SYSTEM (/checkout & /orders/:orderId)
// =========================================================================

// 1. CHECKOUT FORM PAGE (GET)
app.get('/checkout', (req, res) => {
  const currentUser = getLoggedInUser(req);
  recalculateCart();

  const subtotalBDT = cartState.total_price / 100;
  const isFreeDelivery = subtotalBDT >= 2000;
  const defaultDeliveryFee = isFreeDelivery ? 0 : 70;
  const initialTotalBDT = subtotalBDT + defaultDeliveryFee;

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Checkout | Regards Sports Club</title>
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
    <link rel="stylesheet" href="/assets/theme.css">
  </head>
  <body style="background-color: var(--color-bg-sand);">
    ${getHeaderHtml('checkout', currentUser)}

    <main class="section-padding">
      <div class="container">
        <!-- Breadcrumb / Header -->
        <div style="margin-bottom: 2.5rem;">
          <h1 style="font-size: 3.2rem; margin: 0 0 0.5rem;">Fast Secure Checkout</h1>
          <p style="color: #666; font-size: 1.45rem; margin: 0;">Complete your shipping information and payment method below.</p>
        </div>

        ${cartState.items.length === 0 ? `
          <div class="checkout-section" style="text-align: center; padding: 6rem 2rem;">
            <div style="font-size: 4rem; margin-bottom: 1.5rem;">🛍️</div>
            <h2 style="font-size: 2.4rem; margin-bottom: 1rem;">Your Kit Bag is Empty</h2>
            <p style="color: #666; font-size: 1.5rem; margin-bottom: 2.5rem;">Select your favorite player editions, retro jerseys, or turf shoes to checkout.</p>
            <a href="/collections/all" class="btn btn-primary" style="padding: 1.4rem 3rem; font-size: 1.5rem;">Explore Match Jerseys</a>
          </div>
        ` : `
          <div class="checkout-grid">
            <!-- Left Column: Shipping Details & Payment Form -->
            <div>
              <form action="/checkout/process" method="post" id="checkout-form">
                <!-- Step 1: Customer Contact -->
                <div class="checkout-section">
                  <div class="checkout-section-title">
                    <span>1.</span> <span>Contact Information</span>
                  </div>
                  <div class="checkout-input-row checkout-input-row--2">
                    <div class="auth-form-group">
                      <label class="auth-label" for="chk-email">Email Address *</label>
                      <input type="email" id="chk-email" name="email" class="auth-input" placeholder="you@example.com" value="${currentUser ? currentUser.email : ''}" required>
                    </div>
                    <div class="auth-form-group">
                      <label class="auth-label" for="chk-phone">Mobile Phone (For Courier Delivery SMS) *</label>
                      <input type="tel" id="chk-phone" name="phone" class="auth-input" placeholder="017XXXXXXXX" value="${currentUser ? (currentUser.phone || '') : ''}" required>
                    </div>
                  </div>
                  ${!currentUser ? `
                    <div style="font-size: 1.3rem; color: #666;">
                      Already an RSC member? <a href="/account/login?return_to=/checkout" style="color: var(--color-primary); font-weight: 700; text-decoration: underline;">Sign In for Auto-Fill</a>
                    </div>
                  ` : ''}
                </div>

                <!-- Step 2: Delivery Details -->
                <div class="checkout-section">
                  <div class="checkout-section-title">
                    <span>2.</span> <span>Delivery Address</span>
                  </div>
                  <div class="auth-form-group">
                    <label class="auth-label" for="chk-name">Recipient Full Name *</label>
                    <input type="text" id="chk-name" name="fullName" class="auth-input" placeholder="e.g. Naimur Rahman" value="${currentUser ? currentUser.name : ''}" required>
                  </div>

                  <div class="auth-form-group">
                    <label class="auth-label">Delivery Zone *</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem;">
                      <label class="payment-method-card is-selected" id="zone-dhaka-card" style="margin: 0; cursor: pointer;">
                        <input type="radio" name="deliveryZone" value="dhaka" checked onchange="updateDeliveryFee('dhaka')" style="margin-top: 0.3rem;">
                        <div>
                          <div style="font-weight: 700; font-size: 1.4rem;">Dhaka City</div>
                          <div style="font-size: 1.25rem; color: #666;">${isFreeDelivery ? 'FREE Delivery' : '৳70 (1-2 Days)'}</div>
                        </div>
                      </label>

                      <label class="payment-method-card" id="zone-outside-card" style="margin: 0; cursor: pointer;">
                        <input type="radio" name="deliveryZone" value="outside" onchange="updateDeliveryFee('outside')" style="margin-top: 0.3rem;">
                        <div>
                          <div style="font-weight: 700; font-size: 1.4rem;">Outside Dhaka</div>
                          <div style="font-size: 1.25rem; color: #666;">${isFreeDelivery ? 'FREE Delivery' : '৳120 (2-3 Days)'}</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div class="auth-form-group">
                    <label class="auth-label" for="chk-address">Full Street Address (House, Road, Area, Thana) *</label>
                    <textarea id="chk-address" name="address" class="auth-input" rows="3" placeholder="e.g. House 48, Road 03, Block E, Banasree, Rampura, Dhaka" required>${currentUser ? (currentUser.address || '') : ''}</textarea>
                  </div>

                  <div class="auth-form-group" style="margin-bottom: 0;">
                    <label class="auth-label" for="chk-notes">Special Courier Instructions (Optional)</label>
                    <input type="text" id="chk-notes" name="notes" class="auth-input" placeholder="e.g. Call before delivery, deliver after 3 PM">
                  </div>
                </div>

                <!-- Step 3: Payment Method Selection -->
                <div class="checkout-section">
                  <div class="checkout-section-title">
                    <span>3.</span> <span>Payment Method</span>
                  </div>

                  <!-- Option 1: Cash on Delivery (COD) -->
                  <label class="payment-method-card is-selected" id="pay-cod-card" onclick="selectPayment('cod')">
                    <input type="radio" name="paymentMethod" value="Cash on Delivery (COD)" checked style="margin-top: 0.4rem;">
                    <div>
                      <div style="font-weight: 700; font-size: 1.5rem; color: #111;">💵 Cash on Delivery (Full COD)</div>
                      <div style="font-size: 1.3rem; color: #666; margin-top: 0.4rem;">
                        Pay cash when Steadfast / Pathao courier arrives at your door. No advance fee required.
                      </div>
                    </div>
                  </label>

                  <!-- Option 2: bKash Payment -->
                  <label class="payment-method-card" id="pay-bkash-card" onclick="selectPayment('bkash')">
                    <input type="radio" name="paymentMethod" value="bKash Payment" style="margin-top: 0.4rem;">
                    <div style="flex: 1;">
                      <div style="font-weight: 700; font-size: 1.5rem; color: #111; display: flex; align-items: center; gap: 0.8rem;">
                        <span>📱 bKash Payment</span>
                        <span style="background: #E2136E; color: #fff; font-size: 1.1rem; padding: 0.2rem 0.6rem; border-radius: 4px;">Official</span>
                      </div>
                      <div style="font-size: 1.3rem; color: #666; margin-top: 0.4rem;">
                        Send Money / Merchant Pay to RSC Official Wallet: <strong>01754724991</strong>
                      </div>
                      <div id="bkash-trx-box" style="display: none; margin-top: 1rem;">
                        <input type="text" name="trxId" class="auth-input" placeholder="Enter 10-digit bKash TrxID (e.g. BKT982341)">
                      </div>
                    </div>
                  </label>

                  <!-- Option 3: Nagad / Rocket -->
                  <label class="payment-method-card" id="pay-nagad-card" onclick="selectPayment('nagad')">
                    <input type="radio" name="paymentMethod" value="Nagad / Rocket" style="margin-top: 0.4rem;">
                    <div>
                      <div style="font-weight: 700; font-size: 1.5rem; color: #111;">⚡ Nagad / Rocket Payment</div>
                      <div style="font-size: 1.3rem; color: #666; margin-top: 0.4rem;">
                        Send Money to <strong>01754724991</strong> and provide your confirmation TrxID.
                      </div>
                    </div>
                  </label>
                </div>

                <!-- Submit Button -->
                <button type="submit" class="btn btn-primary btn-block" id="place-order-btn" style="padding: 1.8rem; font-size: 1.6rem; font-weight: 700; letter-spacing: 0.04em;">
                  Complete Order & Place Delivery &rarr;
                </button>
              </form>
            </div>

            <!-- Right Column: Order Summary & Item Breakdown -->
            <div class="checkout-order-summary">
              <h2 style="font-size: 2rem; margin-bottom: 2rem; padding-bottom: 1.2rem; border-bottom: 1px solid #eee;">
                Order Summary (${cartState.item_count} items)
              </h2>

              <div style="display: flex; flex-direction: column; gap: 1.5rem; max-height: 380px; overflow-y: auto; padding-right: 0.5rem; margin-bottom: 2rem;">
                ${cartState.items.map(item => `
                  <div style="display: flex; gap: 1.4rem; align-items: center;">
                    <div style="position: relative;">
                      <img src="${item.featured_image.url}" alt="${item.product_title}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; background: #fafafa;">
                      <span style="position: absolute; top: -8px; right: -8px; background: #222; color: #fff; font-size: 1.1rem; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700;">${item.quantity}</span>
                    </div>
                    <div style="flex: 1;">
                      <div style="font-weight: 600; font-size: 1.4rem; line-height: 1.3;">${item.product_title}</div>
                      <div style="font-size: 1.25rem; color: #666; margin-top: 0.2rem;">${item.variant_title}</div>
                      ${item.properties && Object.keys(item.properties).length ? `
                        <div style="font-size: 1.15rem; color: var(--color-primary); font-weight: 600;">
                          ${Object.entries(item.properties).map(([k, v]) => `<div>${k}: ${v}</div>`).join('')}
                        </div>
                      ` : ''}
                    </div>
                    <div style="font-weight: 700; font-size: 1.45rem;">
                      Tk ${(item.line_price / 100).toLocaleString()}
                    </div>
                  </div>
                `).join('')}
              </div>

              <!-- Price Breakdown -->
              <div style="border-top: 1px solid #eee; padding-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem; font-size: 1.45rem;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #666;">Subtotal</span>
                  <span style="font-weight: 600;">Tk ${subtotalBDT.toLocaleString()}</span>
                </div>

                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #666;">Express Courier Shipping</span>
                  <span id="shipping-display-fee" style="font-weight: 600; color: ${isFreeDelivery ? 'var(--color-success)' : '#111'};">
                    ${isFreeDelivery ? 'FREE (Threshold Reached)' : `Tk ${defaultDeliveryFee}`}
                  </span>
                </div>

                ${isFreeDelivery ? `
                  <div style="background: #DCFCE7; color: #166534; font-size: 1.25rem; font-weight: 600; padding: 0.6rem 1rem; border-radius: 4px;">
                    🎉 <strong>Congratulations!</strong> You unlocked FREE nationwide express delivery!
                  </div>
                ` : `
                  <div style="font-size: 1.2rem; color: #888;">
                    💡 Orders over Tk 2,000 get FREE nationwide delivery.
                  </div>
                `}

                <div style="border-top: 2px solid #111; padding-top: 1.4rem; margin-top: 0.5rem; display: flex; justify-content: space-between; font-size: 1.9rem; font-weight: 800;">
                  <span>Grand Total</span>
                  <span id="grand-total-display" style="color: var(--color-primary);">Tk ${initialTotalBDT.toLocaleString()}</span>
                </div>
              </div>

              <!-- Trust Guarantee Seals -->
              <div style="margin-top: 2.5rem; padding-top: 2rem; border-top: 1px solid #eee; display: flex; flex-direction: column; gap: 1rem; font-size: 1.25rem; color: #666;">
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                  <span>🔒</span> <span>256-Bit SSL Encrypted & Protected Checkout</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                  <span>🚚</span> <span>Nationwide Delivery by Steadfast & Pathao Courier</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                  <span>🔄</span> <span>7-Day Instant Size Exchange Guarantee at Banasree</span>
                </div>
              </div>
            </div>
          </div>
        `}
      </div>
    </main>

    ${getFooterHtml()}
    ${getCartDrawerHtml()}

    <script>
      const subtotalVal = ${subtotalBDT};
      const isFree = ${isFreeDelivery};

      function updateDeliveryFee(zone) {
        document.getElementById('zone-dhaka-card').classList.toggle('is-selected', zone === 'dhaka');
        document.getElementById('zone-outside-card').classList.toggle('is-selected', zone === 'outside');

        let fee = 0;
        if (!isFree) {
          fee = (zone === 'dhaka') ? 70 : 120;
        }

        const feeText = isFree ? 'FREE (Threshold Reached)' : ('Tk ' + fee);
        document.getElementById('shipping-display-fee').textContent = feeText;
        document.getElementById('shipping-display-fee').style.color = isFree ? 'var(--color-success)' : '#111';

        const total = subtotalVal + fee;
        document.getElementById('grand-total-display').textContent = 'Tk ' + total.toLocaleString();
        const btn = document.getElementById('place-order-btn');
        if (btn) btn.textContent = 'Complete Order & Place Delivery (Tk ' + total.toLocaleString() + ') →';
      }

      function selectPayment(type) {
        document.getElementById('pay-cod-card').classList.toggle('is-selected', type === 'cod');
        document.getElementById('pay-bkash-card').classList.toggle('is-selected', type === 'bkash');
        document.getElementById('pay-nagad-card').classList.toggle('is-selected', type === 'nagad');

        const trxBox = document.getElementById('bkash-trx-box');
        if (trxBox) trxBox.style.display = (type === 'bkash') ? 'block' : 'none';
      }
    </script>
    <script src="/assets/theme.js"></script>
  </body>
  </html>
  `;
  res.send(html);
});

// 2. CHECKOUT PROCESS (POST)
app.post('/checkout/process', (req, res) => {
  recalculateCart();
  if (cartState.items.length === 0) {
    return res.redirect('/checkout');
  }

  const { fullName, phone, email, deliveryZone, address, notes, paymentMethod, trxId } = req.body;
  const subtotalBDT = cartState.total_price / 100;
  const isFree = subtotalBDT >= 2000;
  const deliveryFee = isFree ? 0 : (deliveryZone === 'dhaka' ? 70 : 120);
  const totalBDT = subtotalBDT + deliveryFee;

  const orderId = 'RSC-' + Math.floor(10000 + Math.random() * 90000);

  const newOrder = {
    id: orderId,
    createdAt: new Date().toISOString(),
    customer: {
      fullName: (fullName || 'Valued Customer').trim(),
      phone: (phone || '').trim(),
      email: (email || '').trim(),
      deliveryZone: deliveryZone || 'dhaka',
      address: (address || 'Banasree, Dhaka').trim(),
      notes: (notes || '').trim()
    },
    items: JSON.parse(JSON.stringify(cartState.items)),
    subtotal: subtotalBDT,
    deliveryFee: deliveryFee,
    total: totalBDT,
    paymentMethod: paymentMethod || 'Cash on Delivery (COD)',
    trxId: trxId || null,
    status: 'Confirmed & In Preparation'
  };

  orders.unshift(newOrder);

  // If user is logged in, link order to account
  const currentUser = getLoggedInUser(req);
  if (currentUser) {
    currentUser.orders = currentUser.orders || [];
    currentUser.orders.unshift(newOrder);
  }

  // Clear cart
  cartState.items = [];
  recalculateCart();

  res.redirect(`/orders/${orderId}`);
});

// 3. ORDER CONFIRMATION / SUCCESS PAGE (GET)
app.get('/orders/:orderId', (req, res) => {
  const currentUser = getLoggedInUser(req);
  const orderId = req.params.orderId;
  const order = orders.find(o => o.id === orderId) || orders[0];

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Order ${order ? order.id : 'Confirmed'} | Regards Sports Club</title>
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
    <link rel="stylesheet" href="/assets/theme.css">
  </head>
  <body style="background-color: var(--color-bg-sand);">
    ${getHeaderHtml('', currentUser)}

    <main class="section-padding">
      <div class="container">
        <div class="order-success-card">
          <div style="font-size: 5rem; margin-bottom: 1.5rem;">🎉</div>
          <h1 style="font-size: 3.2rem; margin-bottom: 0.8rem; color: var(--color-dark);">Order Confirmed!</h1>
          <p style="font-size: 1.6rem; color: #555; margin-bottom: 2.5rem;">
            Thank you, <strong>${order ? order.customer.fullName : 'Valued Customer'}</strong>! We've received your order and our Dhaka showroom team is preparing your kit for express courier dispatch.
          </p>

          <div style="background: var(--color-bg-sand); border-radius: 8px; padding: 2rem; margin-bottom: 2.5rem; text-align: left; font-size: 1.45rem;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 1rem; margin-bottom: 1rem;">
              <span style="color: #666;">Order Reference:</span>
              <strong style="color: var(--color-primary); font-size: 1.6rem;">${order ? order.id : orderId}</strong>
            </div>

            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 1rem; margin-bottom: 1rem;">
              <span style="color: #666;">Estimated Delivery:</span>
              <strong>${order && order.customer.deliveryZone === 'outside' ? '2 to 3 Business Days (All Bangladesh)' : '24 to 48 Hours (Dhaka City)'}</strong>
            </div>

            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 1rem; margin-bottom: 1rem;">
              <span style="color: #666;">Delivery Address:</span>
              <span style="text-align: right; max-width: 60%;">${order ? order.customer.address : ''}</span>
            </div>

            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 1rem; margin-bottom: 1rem;">
              <span style="color: #666;">Payment Method:</span>
              <span><strong>${order ? order.paymentMethod : 'Cash on Delivery'}</strong> ${order && order.trxId ? `(TrxID: <code>${order.trxId}</code>)` : ''}</span>
            </div>

            <div style="display: flex; justify-content: space-between; padding-top: 0.5rem; font-size: 1.7rem; font-weight: 800;">
              <span>Total Payable Amount:</span>
              <span style="color: var(--color-primary);">Tk ${(order ? order.total : 0).toLocaleString()}</span>
            </div>
          </div>

          <!-- Items Summary -->
          <div style="text-align: left; margin-bottom: 3rem;">
            <h3 style="font-size: 1.8rem; margin-bottom: 1.5rem; border-bottom: 1px solid #eee; padding-bottom: 0.8rem;">Items in Your Package:</h3>
            <div style="display: flex; flex-direction: column; gap: 1.2rem;">
              ${order ? order.items.map(item => `
                <div style="display: flex; align-items: center; gap: 1.4rem; padding: 1rem; background: #fafafa; border-radius: 6px;">
                  <img src="${(item.featured_image && item.featured_image.url) ? item.featured_image.url : (item.image || '/assets/products/argentinaPlayr.jpeg')}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">
                  <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 1.4rem;">${item.product_title || item.title}</div>
                    <div style="font-size: 1.25rem; color: #666;">${item.variant_title || 'Standard'} • Qty: ${item.quantity}</div>
                    ${item.properties && Object.keys(item.properties).length ? `
                      <div style="font-size: 1.15rem; color: var(--color-primary); font-weight: 600;">
                        ${Object.entries(item.properties).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                      </div>
                    ` : ''}
                  </div>
                  <div style="font-weight: 700; font-size: 1.45rem;">
                    Tk ${((item.price > 10000 ? item.price / 100 : item.price) * item.quantity).toLocaleString()}
                  </div>
                </div>
              `).join('') : ''}
            </div>
          </div>

          <div style="display: flex; flex-direction: column; sm:flex-row; gap: 1.2rem; justify-content: center;">
            <a href="https://wa.me/8801754724991?text=${encodeURIComponent('Hello Regards Sports Club! I just placed order ' + (order ? order.id : orderId) + '. Can you please confirm receipt?')}" target="_blank" class="btn btn-whatsapp" style="padding: 1.4rem 2.5rem; font-size: 1.45rem;">
              💬 Chat with Showroom WhatsApp (+880 1754-724991)
            </a>
            <a href="/account" class="btn btn-outline" style="padding: 1.4rem 2.5rem; font-size: 1.45rem;">
              View in My Account &rarr;
            </a>
            <a href="/collections/all" class="btn btn-primary" style="padding: 1.4rem 2.5rem; font-size: 1.45rem;">
              Continue Shopping &rarr;
            </a>
          </div>
        </div>
      </div>
    </main>

    ${getFooterHtml()}
    ${getCartDrawerHtml()}
    <script src="/assets/theme.js"></script>
  </body>
  </html>
  `;
  res.send(html);
});


app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 REGARDS SPORTS CLUB STOREFRONT IS LIVE ON LOCALHOST!`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`⚡ 41 Categorized Products Active with Multi-Angle Zoom!`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
