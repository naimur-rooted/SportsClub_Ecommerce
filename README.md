# Regards Sports Club (RSC) — Modern D2C Sports E-Commerce Platform

[![Platform](https://img.shields.io/badge/Platform-Shopify%20OS%202.0-green.svg)](https://shopify.dev)
[![Node.js](https://img.shields.io/badge/Local%20Engine-Node.js%20%7C%20Express-blue.svg)](https://nodejs.org)
[![Design](https://img.shields.io/badge/Design%20System-Scandinavian%20Minimalism-crimson.svg)](#design-system)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success.svg)](#features)

A mobile-first, omnichannel D2C sportswear and football fan apparel e-commerce storefront specializing in Thailand-imported player-edition kits, club jerseys, classic retro kits, training trousers, turf shoes, and custom line-item jersey printing.

---

## ⚡ Key Highlights & Features

* **Complete Multi-Category Catalog (41+ Products):**
  * `Club Jersey 26–27` (Real Madrid, Barcelona, Arsenal, Man City, Bayern Munich, Celtic, AC Milan)
  * `World Cup 2026` (Argentina Messi Special Edition, Brazil, England, Portugal, Spain, Germany)
  * `National Team Jerseys`
  * `Iconic Classic Retro Kits` (1998, 2002, 2006, 2008, 2010, 2012)
  * `Kids & Junior Full Kits` (Jersey + Matching Shorts)
  * `Player Edition` (Aerodynamic match-issue cut, heat-pressed crests, laser ventilation)
  * `Fan Edition` (Embroidered woven badges, relaxed daily fit)
  * `Athletic Trousers & Training Shorts` (Ultra-stretch taper, zip pockets)
  * `Turf & Indoor Football Shoes` (Multi-stud rubber traction, laceless collars, European sizing EU 40–45)
  * `Training Accessories` (Anti-slip grip socks, FIFA quality match balls, goalkeeper gloves, pumps, captain armbands)

* **Interactive Multi-Angle Gallery & Hover Zoom:**
  * **2 to 24 High-Resolution Angles Per Product:** Front, back, collar, badge close-up, and packaging.
  * **Interactive 2.2× Hover Magnifier:** Cursor-coordinate tracking lens allows customers to inspect stitching, embroidery, and fabric texture in close detail.
  * **Scrollable Thumbnail Strip & Stepper Arrows:** Smooth thumbnail switching with active indicator pill.

* **Line-Item Jersey Personalization Engine:**
  * Custom name and squad number printing inputs with automated `+Tk 250` upcharge calculation.
  * Official league font styling guidelines with wash-care instructions.

* **AJAX Slide-Out Cart Drawer & Predictive Live Search:**
  * Dynamic slide-out cart drawer with real-time subtotal calculation, free shipping threshold meter, and line-item property display.
  * Live predictive search modal with debounced query suggestions across titles, tags, and categories.

* **Shopify OS 2.0 Theme Architecture:**
  * Modular Liquid sections (`sections/`, `snippets/`, `layout/`, `templates/json`).
  * Ready-to-deploy zip theme package: `regards-sports-club-theme.zip`.

---

## 🎨 Design System & UI Tokens

* **Typography:**
  * Headings & Editorial Titles: `Fraunces` (Google Serif)
  * UI, Menus, Buttons & Body: `DM Sans` (400, 500, 700 with `0.05em` letter-spacing)
* **Color Palette:**
  * Primary Accent: Vibrant Crimson Red (`#D63A2F`)
  * Backgrounds: Crisp White (`#FFFFFF`) & Warm Scandinavian Sand (`#F3F0EC`)
  * Dark & Accents: Obsidian Black (`#0A0A0A`) & Metallic Champagne Gold (`#D4AF37`)
* **Layout:** Max container width `1410px`, button border-radius `0.5rem`, product card radius `1.0rem`.

---

## 📁 Repository Structure

```text
RegardsSportsClub/
├── assets/                       # CSS, JS, Brand SVGs, PNGs, and Product Media
│   ├── logo.svg                  # Primary vector brand logo
│   ├── logo-white.svg            # Dark mode / footer vector logo
│   ├── favicon.svg               # Browser favicon & mobile app icon
│   ├── theme.css                 # Core design system & responsive styling
│   └── theme.js                  # AJAX cart, drawer transitions, and modals
├── catalog.json                  # Complete 41-product structured catalog
├── config/                       # Shopify OS 2.0 settings schemas
├── layout/                       # theme.liquid master layout
├── locales/                      # en.default.json language strings
├── sections/                     # Modular Shopify sections (header, hero, tabs, PDP, footer)
├── snippets/                     # Reusable liquid snippets (cards, modals, WhatsApp button)
├── templates/                    # JSON templates (index.json, product.json)
├── package.json                  # Node.js project manifest
├── server.js                     # Local dev server & Shopify simulation engine
└── regards-sports-club-theme.zip # Production-ready installable Shopify theme bundle
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
* [Node.js](https://nodejs.org) (v18 or higher)
* [Git](https://git-scm.com)

### Installation & Launch

1. Clone the repository:
   ```bash
   git clone https://github.com/naimur-rooted/SportsClub_Ecommerce.git
   cd SportsClub_Ecommerce
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to:
   ```text
   http://localhost:4000
   ```

---

## 📦 Deploying to Shopify Store Admin

To install this theme directly onto your Shopify store:
1. Log into your **Shopify Store Admin**.
2. Go to **Online Store > Themes**.
3. Under *Theme library*, click **Add theme > Upload zip file**.
4. Upload `regards-sports-club-theme.zip` located in the root of this repository.
5. Click **Actions > Publish** to activate the theme.

---

## 🏛️ Business & Showroom Anchor
* **Showroom Location:** House #48, Road #03, Block #E, Banasree, Rampura, Dhaka-1219, Bangladesh
* **Hotline / WhatsApp:** +880 1754-724991 / +880 1629-381501
* **Trade License:** TRAD/DSCC/002648/2025 (Dhaka South City Corporation)

---

## 📄 License
This project is proprietary and maintained for **Regards Sports Club**.
