# Imran Sports World — Production Deployment & Configuration Guide

**Store Name:** Imran Sports World  
**Brand Positioning:** High-Converting Omnichannel D2C Sportswear, Football Kits & Turf Shoes  
**Target Market:** Bangladesh Nationwide (Dhaka & 64 Districts)  
**Theme Architecture:** Shopify Online Store 2.0 (OS 2.0)  

---

## 1. Project Directory Structure

Your project workspace has been engineered into a full, production-ready Shopify 2.0 theme repository:

```text
ImranSportsClub/
├── assets/
│   ├── theme.css                  # Core design tokens, micro-animations, typography, colors
│   └── theme.js                   # AJAX Cart Drawer, Line-Item Personalizer, Sticky ATC, WhatsApp Engine
├── config/
│   ├── settings_schema.json       # Shopify Theme Editor customizer controls
│   └── settings_data.json         # Pre-configured default brand tokens (Crimson Red #D63A2F)
├── layout/
│   └── theme.liquid               # Master root layout with Google Fonts, SEO tags, Drawer embeds
├── locales/
│   └── en.default.json            # E-commerce text and button strings
├── sections/
│   ├── header.liquid              # Sticky header, announcement ticker, mobile drawer
│   ├── hero-slideshow.liquid      # Full-width cinematic slider with shop now CTAs
│   ├── ajax-tab-showcase.liquid   # "What's New" AJAX zero-reload category switcher
│   ├── scrolling-marquee.liquid   # Infinite CSS marquee banner with sports urgency badges
│   ├── value-props.liquid         # Multi-column value cards (Turf Under ৳2500, Player Edition)
│   ├── shoppable-lookbook.liquid  # Interactive lifestyle image with pulsing hotspot pins
│   ├── trust-anchors.liquid       # Banasree Showroom profile + Collapsible FAQ accordion
│   ├── main-product.liquid        # PDP customization engine (+Tk 250), size pills, sticky ATC
│   ├── cart-drawer.liquid         # Slide-out AJAX cart drawer with free shipping progress bar
│   └── footer.liquid              # Multi-column links, trade license info, payment badges
├── snippets/
│   ├── product-card.liquid        # 1.0rem rounded card with secondary hover photo & badges
│   ├── size-chart-modal.liquid    # Accurate Chest/Length inches & EU shoe size chart
│   └── whatsapp-order-button.liquid # Fast-order WhatsApp link prefilled with variant & URL
├── templates/
│   ├── index.json                 # Homepage modular section sequence
│   └── product.json               # Product page layout definition
└── IMRAN_SPORTS_WORLD_DEPLOYMENT_GUIDE.md
```

---

## 2. Step-by-Step Installation into Shopify

### Method A: Uploading as a ZIP file (Recommended)
1. Compress the following folders into a zip file named `imran-sports-world-theme.zip`:
   * `assets/`
   * `config/`
   * `layout/`
   * `locales/`
   * `sections/`
   * `snippets/`
   * `templates/`
2. Log in to your **Shopify Admin** dashboard (`admin.shopify.com`).
3. Navigate to **Online Store > Themes**.
4. In the **Theme library** section, click **Add theme > Upload zip file**.
5. Select `imran-sports-world-theme.zip` and click **Upload file**.
6. Once uploaded, click **Actions > Preview** to inspect the live animations and AJAX drawer.
7. Click **Publish** to make it your active live storefront.

### Method B: Deploying via Shopify CLI
If you use the developer terminal:
```bash
shopify theme dev --store=imran-sports-world.myshopify.com
shopify theme push
```

---

## 3. Design System & CSS Token Implementation

All visual tokens are defined in [`assets/theme.css`](file:///c:/Users/nahid/OneDrive/Desktop/ImranSportsClub/assets/theme.css):

| Token | Value / Font | Purpose |
| :--- | :--- | :--- |
| `--font-heading` | `'Fraunces', serif` | Google Serif font for editorial headings, banners, and collection titles. |
| `--font-body` | `'DM Sans', sans-serif` | Clean geometric sans-serif for high readability, menus, prices, and buttons. |
| `--color-primary` | `#D63A2F` | Vibrant Crimson Red for CTAs, sale tags, and cart badges. |
| `--color-dark` | `#000000` | Stark black for buttons, footer, and announcement banner. |
| `--color-bg-sand` | `#F3F0EC` | Warm Scandinavian cream/sand background for lifestyle sections. |
| `--radius-btn` | `0.5rem` (5px) | Rounded rectangle for interactive buttons and inputs. |
| `--radius-card` | `1.0rem` (10px) | Smooth card boundary for product grids. |
| `--container-max` | `1410px` | Maximum content width for modern widescreen monitors. |

---

## 4. Custom Line-Item Personalization Engine

In football jersey merchandising, name and number printing is the highest-margin upcharge service. This theme implements a native Shopify Line-Item Property:

*   **Field Name:** `properties[Personalize Your Jersey (+Tk 250)]`
*   **Behavior:** When the customer types e.g. `MESSI 10` or `RONALDO 7`, this string is attached to the cart line item without requiring third-party subscription apps.
*   **Order Fulfillment:** The customer's custom printing request appears automatically on your Shopify Order Admin screen, packing slips, and order notification emails.

---

## 5. Slide-Out AJAX Cart Drawer & Conversion Hooks

The theme replaces the slow, redirect-based `/cart` page with an instant side drawer:

1.  **Dynamic Free Shipping Progress Bar:**
    *   Configured threshold: **Tk 2,000**.
    *   When subtotal is under Tk 2,000, it computes the remaining amount: *"Add Tk X more to reach FREE SHIPPING!"*.
    *   Once reached, the bar turns 100% full with celebratory messaging: *"🎉 You get FREE delivery nationwide!"*.
2.  **In-Drawer Custom Instructions / Note Box:**
    *   Allows customers to specify packaging notes, building gate instructions, or preferred call times.
3.  **Cross-Sell Cards:**
    *   Recommends complementary gear (anti-slip grip socks at Tk 250, shin guards at Tk 350) right before checkout.

---

## 6. Omnichannel Payments & Logistics Setup

### 6.1 Payment Gateway Configuration (Shopify Admin > Settings > Payments)

To match the operational model of leading Bangladeshi sports brands:

1.  **Inside Dhaka City (100% Cash on Delivery):**
    *   Set up a **Manual Payment Method** named: `Cash on Delivery (COD) - Inside Dhaka`.
    *   *Instructions for Customer:* *"Pay with cash directly to the delivery hero when your package arrives at your doorstep. No advance payment required."*
2.  **Outside Dhaka (Partial Advance COD):**
    *   Set up a **Manual Payment Method** named: `Outside Dhaka Delivery (Tk 120 Advance via bKash/Nagad)`.
    *   *Instructions for Customer:* *"For orders outside Dhaka, please pay the Tk 120 courier charge in advance to our bKash/Nagad Merchant Number: 01754-724991. The jersey price will be collected upon delivery."*
3.  **Instant Online Payments (Credit Cards & Mobile Wallets):**
    *   Integrate **SSLCommerz**, **Aamarpay**, or **Shurjopay** to allow instant credit card and automated bKash/Nagad checkout.

---

### 6.2 Tiered Domestic Shipping Rates (Shopify Admin > Settings > Shipping)

Create two primary shipping zones under Bangladesh:

| Zone Name | Destination | Condition | Shipping Rate |
| :--- | :--- | :--- | :--- |
| **Dhaka Metro** | Dhaka City Corporation | Standard Rate | **Tk 70.00 – Tk 80.00** |
| **Dhaka Metro (Free)** | Dhaka City Corporation | Orders **Tk 2,000.00 and up** | **FREE (Tk 0.00)** |
| **All Other 63 Districts** | Nationwide Bangladesh | Standard Rate | **Tk 120.00** |
| **Nationwide (Free)** | All Districts | Orders **Tk 3,500.00 and up** | **FREE (Tk 0.00)** |

---

## 7. Recommended Shopify Apps for Growth & Automation

1.  **Steadfast Courier / Pathao Courier Sync App:**
    *   *Role:* Automatically push Shopify orders into Steadfast Courier or Pathao with one click to generate consignment tracking IDs and SMS.
2.  **Globo Back in Stock / Klaviyo:**
    *   *Role:* When popular jersey sizes (e.g. Size L, XL) sell out, displays a *"Notify Me When Available"* button that captures customer phone numbers.
3.  **PageFly AI Page Builder:**
    *   *Role:* Create bespoke tournament landing pages (e.g. 2026 FIFA World Cup hubs, Ramadan tournament specials).

---

## 8. SEO & Collection URL Slugs Hygiene

Ensure your collection handles in Shopify use accurate, clean URLs:
*   `/collections/club-jerseys`
*   `/collections/2026-27-player-edition`
*   `/collections/world-cup-2026`
*   `/collections/retro-jerseys`
*   `/collections/turf-shoes`
*   `/collections/trousers-shorts`
*   `/collections/football-accessories` (avoid spelling errors such as `/shocks`)

---

*Theme architecture engineered for Imran Sports World. Designed for maximum mobile speed, trust, and conversion.*
