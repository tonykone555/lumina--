# Google Merchant Center — EU first-time setup

## Status
This branch prepares a safe, **not yet published** Merchant Center feed. It does not create or verify a Google account, or prove any item is commercially eligible.

## EU target markets
Initial currency-compatible target market feeds: France, Germany, Italy, Spain, Netherlands, Belgium. A market must not be activated until delivery, returns, consumer rights, applicable taxes, and checkout are supported there.

- `/api/google-merchant-feed?country=FR`
- `/api/google-merchant-feed?country=DE`
- `/api/google-merchant-feed?country=IT`
- `/api/google-merchant-feed?country=ES`
- `/api/google-merchant-feed?country=NL`
- `/api/google-merchant-feed?country=BE`

`&diagnostics=1` reports counts and withheld reasons (not raw supplier rows).

## Release gate
The feed deliberately remains empty until an operator sets `YNOT_GOOGLE_MERCHANT_LAUNCH_ENABLED=true` in production, after merchant verification, shipping/return policies, checkout checks, and country-by-country review.

The export reads persisted `ynot_catalog_products` in pages instead of re-running keyword searches. It only exports records marked active, ad-eligible and commerce-ready, with verified stock status, condition, valid image, YNOT price in the country currency, approved supplier YNOT checkout, and configured shipping. It does not invent stock status or condition.

## Before activating
1. Create Merchant Center account with the operator's **real** business name, operational address and contact info. Do not substitute an arbitrary address. If the operator has no fixed address, resolve eligibility/registration requirements before submission.
2. Verify/claim `ynotworld.app`. A Search Console verification tag is already in `app/layout.tsx` but ownership must be verified from the actual Google account.
3. Ensure exact product landing pages (including `/p/[id]` redirect into the YNOT Room) are crawlable and show matching title, price, currency, stock, language, variant, shipping and buy button without user interaction. Google may disapprove landing pages which cannot be crawled.
4. Verify the Stripe checkout and supplier dispatch on each market, stable availability updates, delivery estimates, and consumer-facing support/contact/shipping/return pages.
5. Add real explicit stock and condition fields to approved product records. The feed intentionally withholds unknown values.
6. Check item diagnostics for each market; confirm no disallowed products, misleading brand attribution, supplier duplicates or mismatched identifiers.
7. Create one scheduled-fetch data source per market in Merchant Center using the corresponding URL. Configure matching country shipping and return policies, plus language/localization where required.
8. Only after review enable `YNOT_GOOGLE_MERCHANT_LAUNCH_ENABLED=true`. Monitor Merchant Center diagnostics and disapprovals.

**Do not treat a zero-item feed as a bug if checkout or availability are unverified.** This is a safety gate.

Google references:
- https://support.google.com/merchants/answer/7052112
- https://support.google.com/merchants/answer/4752265
- https://support.google.com/merchants/answer/14991840
- https://support.google.com/merchants/answer/11586344
