# YNOT large catalogue + intent recommendation layer

This layer turns the Shopify Global Catalog into a YNOT-priced, country-aware catalogue for ads, ChatGPT shopping surfaces, YNOT search and other acquisition channels.

## Large feed

`GET /api/commerce/feed`

Parameters:
- `countries=FR,DE,US`
- `categories=home,tech,beauty`
- `per_category=120`
- `eligible=1` (default; only commercially eligible products)
- `format=json|csv`

Example:

`/api/commerce/feed?countries=FR,DE,GB,US&categories=home,fashion,beauty,tech,office,travel&per_category=150&format=csv`

Current feed categories:
`home, fashion, beauty, tech, fitness, kitchen, pets, office, travel, outdoors, gifts`

## Intent recommendations

`GET /api/commerce/recommendations?q=<shopping request>&country=FR&limit=12`

Example:

`/api/commerce/recommendations?q=black leather crossbody bag under 120&country=FR&limit=12`

The response deliberately gives product choice while optimizing suppliers behind the scenes.

## Product identity and supplier routing

A YNOT product is now separate from a Shopify merchant listing.

Multiple catalog listings that appear to represent the same physical product are clustered into one YNOT product identity using normalized title, category, materials and price similarity. The cluster stores multiple supplier offers, ranks those offers on YNOT economics and reliability, and exposes the strongest offer as the active route.

Each YNOT product therefore contains:
- stable YNOT product ID
- normalized shopper-facing title
- country
- YNOT retail price
- selected source
- gross contribution and margin
- routing/reliability score
- supplier offer count
- up to 8 ranked supplier alternatives
- intent tags
- ad eligibility

The source merchant remains available internally for procurement and auditability, while the shopper-facing brand field is YNOT.

## Price ladder

Intent recommendations produce diversified price positions rather than a random list:
- budget
- value
- premium
- alternatives

This lets YNOT answer a shopping request with real choice while still selecting the best supplier for each option.

## Pricing

The customer-facing YNOT price is intentionally independent from the original merchant listing price.

The pricing engine uses source price, shipping reserve, payment cost, return/cancellation reserves, reliability and category-specific margin floors.

Use `YNOT_CATALOG_SHIPPING_JSON` to override shipping reserves:

```json
{
  "default": 7.9,
  "FR": 5.9,
  "DE": 6.9,
  "merchant.example": {"FR": 4.9, "default": 8.9}
}
```

## What still improves later

The current identity system is semantic/title/material/price based. Image embedding similarity can be added later to identify identical physical products whose merchant titles are completely different.

The feed is channel-neutral by design. A separate adapter should map this canonical YNOT feed to the exact schema required by each advertising or shopping channel instead of coupling the commerce engine directly to one platform.
