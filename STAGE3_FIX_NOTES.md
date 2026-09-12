# Lumina @ Stage 3 — context-preserving refactor

This revision removes the iframe/single-lumina.html architecture and promotes the experience into a real React client component (`components/lumina/LuminaWorld.tsx`).

## Fixed from the reviewed Stage 3 build
- World title now lives in world coordinates, so it pans/zooms with the semantic map instead of being glued to the viewport.
- Product selection always opens a dedicated right-side product panel.
- Bottom status/taste/zoom controls are managed in one dock to prevent overlap.
- Product bubbles are clean: image + small price only; title/brand are hover/detail content.
- Refine is niche-aware and grouped (silhouette/material/style/occasion/fit/price for fashion; different groups for coffee/home/etc.). Selected refine values determine the main semantic world bubbles.
- Product tags are draggable and can be dropped anywhere in the map to create spatial semantic anchors and trigger a new catalog branch.
- A Not This drop zone turns tags into negative preferences.
- @ is a product-attached orb. It opens a product-specific prompt for things such as “keep this neckline, avoid satin, cheaper”.
- Pin supports multiple products; two or more pinned products can be blended into a new semantic anchor.
- Breadcrumb snapshots restore prior preference/search states.
- A single taste/status/zoom dock replaces overlapping fixed widgets.
- “Drop anything” supports text/product URLs now and reserves image input for visual-search work.
- Shopify Global Catalog remains server-side through `/api/catalog`.

## Still staged for later
- True image-region similarity (“I like this curve here”).
- Image upload / screenshot visual search.
- Production-grade vector similarity and spatial force layout.
- Persistent taste/profile storage in Supabase.
- Existing Lumina fitting-room integration from selected fashion products.
