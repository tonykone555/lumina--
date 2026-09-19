# YNOT large catalogue feed

This layer turns the Shopify Global Catalog into a YNOT-priced catalogue for ads, shopping surfaces and country-specific merchandising.

## Endpoint

`GET /api/commerce/feed`

Query parameters:

- `countries=FR,DE,US`
- `categories=home,tech,beauty`
- `per_category=120`
- `eligible=1` (default; only ad-eligible products)
- `format=json|csv`

Example:

`/api/commerce/feed?countries=FR,DE,GB,US&categories=home,fashion,beauty,tech&per_category=150&format=csv`

## What it does

1. Searches multiple high-commercial-intent seed queries per category against Shopify Global Catalog.
2. Filters to products available to the destination country.
3. Applies a country shipping reserve.
4. Runs YNOT's existing risk-adjusted commerce engine to calculate the customer-facing YNOT price.
5. Groups near-duplicate offers by normalized product fingerprint.
6. Keeps the source/supplier with the strongest margin/routing economics.
7. Marks products ad-eligible only when margin, reliability and buy-with-YNOT requirements pass.
8. Exposes JSON and CSV feeds for future Ads Manager/product-feed ingestion.

## Important

The customer-facing YNOT price is intentionally independent from the original merchant listing price.

The current fingerprinting is conservative title normalization, not image-level duplicate detection. A later pass should add semantic/image similarity so the same physical product from differently titled suppliers can be compared more accurately.

Use `YNOT_CATALOG_SHIPPING_JSON` to override shipping reserves, for example:

```json
{
  "default": 7.9,
  "FR": 5.9,
  "DE": 6.9,
  "merchant.example": {"FR": 4.9, "default": 8.9}
}
```
