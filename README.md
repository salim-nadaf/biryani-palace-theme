# 🍚 Biryani Royale - Custom Shopify Theme

A premium, Behrouz-inspired custom Shopify theme built from scratch for live biryani ordering.

## Theme Structure

```
shopify-biryani-theme/
├── assets/
│   ├── theme.css          — All styles (colors, animations, layout)
│   └── theme.js           — Cart Ajax, area checker, menu filtering
├── config/
│   ├── settings_schema.json  — All Shopify customizer settings
│   └── settings_data.json    — Default values
├── layout/
│   └── theme.liquid       — Main HTML wrapper
├── sections/
│   ├── header.liquid      — Sticky header, nav, area checker, cart icon
│   ├── hero-banner.liquid — Full-screen hero with image/video
│   ├── live-ordering-menu.liquid — Menu grid with categories + search
│   ├── bulk-order-plans.liquid   — Catering/party plans
│   ├── about-brand.liquid        — Brand story & pillars
│   ├── cart-drawer.liquid        — Slide-out Ajax cart
│   └── footer.liquid             — Footer with social links
├── snippets/
│   └── product-card.liquid  — Reusable menu item card
└── templates/
    ├── index.liquid        — Homepage
    ├── product.liquid      — Product detail page
    ├── collection.liquid   — Category/collection page
    ├── cart.liquid         — Cart fallback page
    └── 404.liquid          — Custom 404 page
```

## How to Upload to Shopify

### Method 1: Manual Upload (Easiest)
1. Zip the `shopify-biryani-theme` folder
2. Go to **Shopify Admin → Online Store → Themes**
3. Click **"Add theme" → "Upload zip file"**
4. Upload the zip
5. Click **"Customize"** to start editing

### Method 2: Shopify CLI (Developer)
```bash
npm install -g @shopify/cli @shopify/theme
shopify theme push --store=yourstore.myshopify.com
```

## Setting Up Products & Collections

1. **Create Collections** in Shopify Admin for each menu category:
   - "Traditional Dum Biryanis"
   - "Biryani Reimagined"
   - "Tandoori & Starters"
   - "Gravies & Curries"
   - "Veg Specials"

2. **Add Products** to each collection with:
   - Product title and description
   - Product image (recommended: 800×600px)
   - Price
   - Tags: `popular`, `must try`, `best seller`, `chef's special`, `new`

3. **Set Metafields** for veg/non-veg indicator:
   - Go to each product → **Metafields**
   - Add: `custom.is_veg` = `true` (veg) or `false` (non-veg)
   - You can also install "Metafields Guru" app for easier management

## Customizer Settings

Everything is editable without code from **Shopify → Online Store → Themes → Customize**:

| Setting | Description |
|---------|-------------|
| Brand Name & Tagline | Change your restaurant name |
| Logo | Upload your logo |
| Colors | Primary gold, backgrounds, text colors |
| Announcement Bar | Text, background color |
| Delivery Areas | Comma-separated list of areas |
| Min Order / Free Delivery | Thresholds |
| Phone & WhatsApp | Contact details |
| Social Links | Instagram, Facebook |
| Hero Banner | Image/video, heading, CTA buttons |
| Menu Categories | Add/remove/reorder categories |
| Bulk Plans | Add/edit/remove catering plans |
| Footer | Links, columns |

## Veg/Non-Veg Indicator Setup

Add the `custom.is_veg` metafield to products:
```
Namespace: custom
Key: is_veg
Type: Boolean (true/false)
```

## WhatsApp Ordering

Set your WhatsApp number in **Theme Settings → Brand & Identity → WhatsApp Number**.
Format: Country code + number, no spaces or + (e.g., `919876543210`)

## Color Customization

All colors use CSS custom properties driven from Shopify settings:
- `--color-primary` — Royal gold
- `--color-bg` — Dark background
- `--color-surface` — Card background
- `--color-text-primary` — Main text
- `--color-text-secondary` — Muted text

No code changes needed — adjust all colors from the Shopify Customizer.
