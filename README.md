# Regards Sports Club (RSC) — D2C Sports E-Commerce Platform

[![Project Type](https://img.shields.io/badge/Project-Public%20Demo%20%7C%20Portfolio%20Showcase-purple.svg)](#about-this-showcase)
[![Platform](https://img.shields.io/badge/Platform-Shopify%20OS%202.0-green.svg)](https://shopify.dev)
[![Local Engine](https://img.shields.io/badge/Local%20Engine-Node.js%20%7C%20Express-blue.svg)](https://nodejs.org)
[![Design](https://img.shields.io/badge/Design-Scandinavian%20Minimalism-crimson.svg)](#design-system)
[![License](https://img.shields.io/badge/License-MIT-lightgrey.svg)](#license)

> 💡 **Portfolio Showcase Notice:** This is an open **public demonstration project** built to showcase advanced Shopify OS 2.0 theme engineering, modern D2C conversion UX, multi-angle product photography galleries with hover zoom lenses, and dynamic line-item customization.

---

## ⚡ Key Architecture & Engineering Features

* **Multi-Category Catalog (41+ Structured Products):**
  * `Club Jersey 26–27` (Real Madrid, Barcelona, Arsenal, Man City, Bayern Munich, Celtic, AC Milan)
  * `World Cup 2026` (Argentina Messi Special Edition, Brazil, England, Portugal, Spain, Germany)
  * `National Team Kits` (International Tournament Editions)
  * `Classic Retro Collection` (1998, 2002, 2006, 2008, 2010, 2012)
  * `Kids & Junior Full Sets` (Match-replica jersey + drawstring shorts)
  * `Player vs. Fan Editions` (Match issue heat-press specs vs. woven stadium editions)
  * `Training Trousers & Shorts` (Ultra-stretch athletic taper)
  * `Turf & Indoor Football Boots` (Multi-stud traction with European sizing EU 40–45)
  * `Pro Gear & Accessories` (Anti-slip grip socks, FIFA quality balls, goalkeeper gloves)

* **Interactive Multi-Angle Gallery with 2.2× Hover Zoom:**
  * **2 to 24 High-Resolution Angles Per Item:** Front, back, collar, fabric close-up, and tags.
  * **Coordinate-Tracking Magnifier Lens:** Real-time mouse position tracking provides optical zoom on desktop without UI lag.
  * **Smooth Carousel & Thumbnail Stepper:** Switch angles via thumbnail click/hover or left/right stepper controls.

* **Custom Line-Item Jersey Personalization:**
  * Line-item property text inputs for player name & squad number with automated upcharge calculation (`+Tk 250`).
  * Seamless validation preventing checkout leakage.

* **Slide-Out AJAX Cart Drawer & Live Predictive Search:**
  * Slide-out cart drawer with free shipping progress bar and real-time recalculation.
  * Debounced predictive live search suggestion modal with instant product matches.

* **Shopify OS 2.0 Theme Structure:**
  * Clean modular architecture (`sections/`, `snippets/`, `layout/`, `templates/json`).
  * Ready-to-deploy zip bundle: `regards-sports-club-theme.zip`.

---

## 🎨 Design System & UI Tokens

* **Typography:**
  * Editorial & Promotional Headings: `Fraunces` (Google Serif)
  * UI Elements, Menus, Buttons & Body: `DM Sans` (400, 500, 700 with `0.05em` letter-spacing)
* **Color Palette:**
  * Primary Accent: Vibrant Crimson Red (`#D63A2F`)
  * Backgrounds: Crisp White (`#FFFFFF`) & Warm Scandinavian Sand (`#F3F0EC`)
  * Contrast & Badges: Obsidian Black (`#0A0A0A`) & Metallic Champagne Gold (`#D4AF37`)
* **Layout Tokens:** Max container width `1410px`, button radius `0.5rem`, product card radius `1.0rem`.

---

## 📁 Repository Structure

```text
SportsClub_Ecommerce/
├── assets/                       # CSS, JS, Brand SVGs, PNGs, and Product Media
│   ├── logo.svg                  # Primary vector brand logo
│   ├── logo-white.svg            # Dark mode / footer vector logo
│   ├── favicon.svg               # Browser favicon & mobile app icon
│   ├── theme.css                 # Core design system & responsive styling
│   └── theme.js                  # AJAX cart, drawer transitions, and modals
├── catalog.json                  # Structured 41-product demo catalog
├── config/                       # Shopify OS 2.0 settings schemas
├── layout/                       # theme.liquid master layout
├── locales/                      # en.default.json language strings
├── sections/                     # Modular Shopify sections (header, hero, tabs, PDP, footer)
├── snippets/                     # Reusable liquid snippets (cards, modals, WhatsApp button)
├── templates/                    # JSON templates (index.json, product.json)
├── package.json                  # Node.js project manifest
├── server.js                     # Local dev server & Shopify simulation engine
└── regards-sports-club-theme.zip # Installable Shopify theme package
```

---

## 🚀 Running the Demo Locally

### Prerequisites
* [Node.js](https://nodejs.org) (v18 or higher)
* [Git](https://git-scm.com)

### Quick Start

1. Clone this repository:
   ```bash
   git clone https://github.com/naimur-rooted/SportsClub_Ecommerce.git
   cd SportsClub_Ecommerce
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the development server:
   ```bash
   npm start
   ```

4. Open your browser:
   ```text
   http://localhost:4000
   ```

---

## 📦 Deploying into Shopify Admin

To test this theme on a live or development Shopify store:
1. Open your **Shopify Store Admin**.
2. Go to **Online Store > Themes**.
3. Under *Theme library*, select **Add theme > Upload zip file**.
4. Upload `regards-sports-club-theme.zip` from the root of this repository.
5. Click **Actions > Preview** or **Publish**.

---

## 📄 Showcase Disclaimer & License

This project is created and maintained as an **open public demonstration and portfolio showcase** by [naimur-rooted](https://github.com/naimur-rooted). Product mockups and brand assets are utilized solely for creative and technical demonstration purposes.

Released under the [MIT License](LICENSE).
