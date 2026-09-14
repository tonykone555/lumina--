# Lumina Commerce implementation

This repository now contains the first production-oriented commerce layer beneath Lumina @.

## Implemented in code

- Risk-adjusted landed-cost engine
- Category-specific dynamic margin floors
- Source reliability scoring
- Multi-source ranking / smart routing
- Affiliate-vs-retail risk-adjusted monetization choice
- Preferred supplier weighting
- Lumina Fulfilled routing flag
- Basket optimization
- Replacement scoring
- Four-part installment display calculation
- Price-protection credit calculation
- Lumina wallet credit primitive
- Merchant conversion / partnership opportunity trigger
- Commerce quote API
- Basket optimization API
- Merchant opportunity API
- Wallet / price protection / replacement operations API
- Commerce operations dashboard at `/commerce`
- Stripe Checkout authorization with manual capture
- Private owner procurement queue at `/commerce`
- Exact supplier link, delivery address and quantity in each approval
- Capture only after a merchant order number and actual supplier total are recorded
- Authorization release on owner rejection or approval-window expiry
- Customer order-confirmation status with live polling
- Optional owner notification webhook

## Authorization-first order flow

The initial fulfillment mode is deliberately operator-assisted:

1. Stripe authorizes the customer amount without capturing it.
2. The customer sees a ten-minute confirmation message.
3. The owner opens the exact merchant product from `/commerce` and places the supplier order manually.
4. The owner records the merchant order number and actual supplier total.
5. YNOT captures the authorization only when the supplier order is confirmed and the margin floor still passes.
6. A rejected or expired order cancels the PaymentIntent, releasing the authorization without capturing funds.

Automated browser purchasing is intentionally a later supplier adapter. The current build does not submit payment on arbitrary merchant websites.

## Required Vercel environment variables

| Variable | Purpose |
| --- | --- |
| `YNOT_CHECKOUT_ENABLED=true` | Enables quote and Checkout Session creation |
| `YNOT_MANUAL_PROCUREMENT_ENABLED=true` | Allows catalog merchants to enter the owner-approval flow |
| `STRIPE_RESTRICTED_KEY` | Server-only Stripe key with Checkout Session and PaymentIntent read/write access |
| `STRIPE_WEBHOOK_SECRET` | Verifies Stripe webhook signatures |
| `YNOT_CHECKOUT_SIGNING_SECRET` | Signs short-lived server checkout quotes |
| `YNOT_OPERATOR_SECRET` | Private owner key for `/commerce`; minimum 16 characters |
| `NEXT_PUBLIC_APP_URL` | Production app origin, for example `https://ynotworld.vercel.app` |
| `YNOT_APPROVAL_WINDOW_MINUTES=10` | Hold approval target, constrained by code to 5–60 minutes |
| `YNOT_MIN_REALIZED_MARGIN_EUR=0` | Lowest permitted amount remaining after actual supplier total |

Optional variables:

| Variable | Purpose |
| --- | --- |
| `YNOT_OPERATOR_NOTIFICATION_URL` | Receives a JSON notification when an authorization needs approval |
| `YNOT_MANUAL_SHIPPING_JSON` | Country/domain shipping reserves used before authorization |

Example shipping configuration: `{"default":0,"FR":5.90,"example.com":{"FR":4.90,"default":8.90}}`.

The Stripe webhook endpoint is `/api/checkout/webhook` and must subscribe to `checkout.session.completed`. Secrets must be stored only in Vercel’s sensitive environment variables and never committed.

## Next automation phase

1. Prepare the exact merchant cart and variant automatically.
2. Stop for owner confirmation when CAPTCHA, 3DS or merchant review is required.
3. Submit payment through a YNOT-owned purchasing card.
4. Verify the merchant confirmation before calling Stripe capture.
5. Persist tracking, cancellation and refund events in an auditable order ledger.

## Core commercial rule

Organic Lumina ranking must remain based on shopper relevance. Margin, affiliate rate, preferred-supplier status and fulfillment economics are applied only after relevance ranking when deciding the commercial route for a selected product.
