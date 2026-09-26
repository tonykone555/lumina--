# YNOT — Claude Plugin / Remote MCP Submission

## Submission type

Single remote MCP connector with MCP Apps interactive UI.

## Production endpoint

`https://ynotworld.app/api/chatgpt/mcp`

The endpoint name is historical; it is a standard Streamable HTTP MCP endpoint and is intended to be host-neutral. YNOT should use the same catalogue backend for Claude and ChatGPT rather than maintaining separate product databases or MCP servers.

## Product name

YNOT

## Short description

Visual multi-store product discovery. Search YNOT's live catalogue, inspect products and alternatives, view product images, and explore results through the interactive YNOT Bubble World.

## Intended Claude experience

When a product-search, product-detail, or similar-product tool is used, Claude should render the attached MCP App UI (`ui://ynot/bubble-world/...`) directly in the conversation when the host supports MCP Apps. The user should remain inside Claude unless they explicitly ask to open or continue on the YNOT website.

YNOT does not execute purchases or financial transactions inside Claude. `open_in_ynot` only returns a YNOT URL when the user explicitly asks to visit/continue on the website.

## Public tools

1. `search_products` — Search YNOT's live multi-source product catalogue.
2. `get_product` — Retrieve a specific product from live YNOT results.
3. `find_similar_products` — Find alternatives/similar products.
4. `get_product_images` — Retrieve product images for a catalogue item.
5. `open_in_ynot` — Return a YNOT website URL only when explicitly requested by the user.

All five tools are read-only from the MCP client's perspective. They do not expose YNOT administration, environment variables, API keys, Supabase credentials, merchant credentials, or internal MCP tokens.

## MCP Apps UI

- Resource URI: versioned `ui://ynot/bubble-world/<version>.html`
- MIME type: `text/html;profile=mcp-app`
- Tool metadata uses the MCP Apps `ui.resourceUri` linkage.
- The app performs the MCP Apps `ui/initialize` / `ui/notifications/initialized` bridge handshake.
- OpenAI compatibility metadata may coexist with the host-neutral MCP Apps metadata and should be ignored by other hosts.

## Tool annotations

All tools should expose:

- `readOnlyHint: true`
- `destructiveHint: false`
- `idempotentHint: true`
- `openWorldHint: true`
- human-readable `title`

## Three review/test prompts

1. `Use YNOT to find modern black sofas under €1,500.`
2. `Find alternatives similar to this YNOT product but cheaper and available for delivery to France.`
3. `Show me YNOT products for minimalist living-room lighting and let me explore them visually.`

Expected behavior: product results come from the live YNOT catalogue and, on hosts supporting MCP Apps, render in the YNOT Bubble World inside the conversation.

## Data handling summary

YNOT's public MCP connector receives the user's explicit product-search parameters (for example search text, country code, product identifier, preference text and result limit) needed to perform a catalogue request. It does not require the user's Claude conversation history, memory, unrelated files, or unrelated personal data.

The MCP response can include product identifiers, titles, descriptions, images, prices, currencies, merchants/sources, product tags and product/merchant URLs obtained from YNOT's live catalogue.

## Authentication

No authentication is required for the initial public read-only connector.

If authentication is introduced later, the connector must use secure OAuth 2.0 and be re-reviewed for the Claude directory.

## Privacy and support

- Privacy policy: `https://ynotworld.app/privacy`
- Support/privacy contact: `tonykone555@gmail.com`
- Website: `https://ynotworld.app`

The existing YNOT privacy policy describes YNOT data handling, third-party services, deletion requests, security, international processing, and Meta/Threads integrations.

## Directory-review items still required before public submission

- Confirm ownership/control of `ynotworld.app` during submission.
- Complete Anthropic's data-handling and compliance questionnaire.
- Standard test account/sample data only if Anthropic requests credentials for functionality that cannot be tested publicly. The current read-only search flow should not require login.
- Run Claude-side tests on web/desktop/mobile to confirm the Bubble World renders and interactions work.

## Review notes

YNOT is a product-discovery/search connector. It must not serve sponsored placements as if they were organic results inside Claude, and it must not execute purchases in the interactive connector. Any commercial or sponsored ranking introduced in the future should be clearly separated and reviewed against the current Anthropic directory policy before deployment.

## Release checklist

- [x] Public HTTPS MCP endpoint
- [x] Streamable HTTP MCP implementation
- [x] Read-only tool annotations
- [x] Versioned MCP App resource
- [x] MCP Apps bridge initialization
- [x] Three documented example prompts
- [x] No in-chat purchase execution
- [x] Public privacy policy
- [x] Verified support contact in the privacy page
- [ ] Claude custom-connector smoke test
- [ ] Claude MCP App rendering test
- [ ] Directory submission
