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

## Intentionally not live yet

The code does **not** charge cards, purchase from retailers, issue refunds, hold customer money, or automatically place third-party orders. Those capabilities require approved payment accounts, retailer/supplier authorization where applicable, live stock/shipping verification, returns operations, fraud controls, tax setup and market-specific legal review.

The intended rollout is:

1. Plug live product sources into the quote engine.
2. Verify price, stock, shipping and destination eligibility immediately before checkout.
3. Connect persistent storage for wallets, orders, merchant statistics and realized unit economics.
4. Connect a payment provider and use sandbox/test mode first.
5. Add order orchestration and controlled retailer/supplier adapters.
6. Launch within one controlled geography before cross-border scaling.

## Core commercial rule

Organic Lumina ranking must remain based on shopper relevance. Margin, affiliate rate, preferred-supplier status and fulfillment economics are applied only after relevance ranking when deciding the commercial route for a selected product.
