# YNOT × Grok Bot — Growth Creative Campaign Contract

This file is the human-readable companion to the MCP tool `get_growth_campaign_brief` exposed by YNOT at the deployed `/api/mcp` endpoint.

## Ownership

- **YNOT** is the source of truth for products, creative records, approvals, generation jobs, assets, posting state, and performance.
- **Grok Bot** is the campaign orchestrator and creative director.
- **Grok Imagine** is the preferred image/video renderer for the current workflow.

## Connection

Connect Grok Bot to YNOT as a custom MCP connector using the deployed public YNOT MCP endpoint:

`https://<your-production-domain>/api/mcp`

Grok supports custom MCP connectors over a public URL. Once connected, Grok discovers YNOT's tools automatically.

At the beginning of a creative campaign, Grok must call:

`get_growth_campaign_brief`

That tool returns the authoritative live workflow and trigger contract.

## Trigger contract

### Trigger A — niche campaign

User intent examples:
- "Start a campaign for home products"
- "Make creatives for fitness"
- "Find 5 beauty products and make content"

Action:
1. Call `get_growth_campaign_brief`.
2. Call `get_products_to_promote`.
3. Default to 5 real products unless the user specifies a different count.
4. Branch each product into distinct creative concepts.
5. Save each concept with `save_creative`.

### Trigger B — selected-product campaign

User supplies or selects exact YNOT products.

Action:
1. Call `get_growth_campaign_brief`.
2. Use `get_product` and `get_product_images` for those exact products.
3. Do not replace them with easier alternatives.
4. Build and save creative branches.

### Trigger C — approved creative

A creative is approved in YNOT.

Action:
1. Retrieve approved creatives with `get_approved_creatives`.
2. Build a production-grade image-first prompt.
3. Create the generation job with `create_generation_job`, provider `grok-imagine`.

### Trigger D — generated asset ready

A generation job has assets.

Action:
1. Inspect via `get_generation_job` or `get_generated_assets`.
2. Review the output.
3. Save the review with `review_generated_video`.
4. If needed, request a materially improved version with `request_regeneration`.

## Creative branching

Default niche campaign:
- 5 products
- 5 creative branches per product
- 2 variants per branch
- 9:16 first
- image-first → video
- human approval before generation/posting unless the campaign explicitly enables a different mode

Preferred branches:
1. UGC testimonial
2. Problem / solution
3. Aesthetic / product showcase
4. Native trend / social format
5. Comparison / reviewer
6. Direct response when appropriate

Do not make branches that are only wording variations.

## Prompt-pack standard

Every branch should contain enough production direction to generate a strong asset:
- audience
- creative angle
- hook
- avatar/persona
- setting
- product placement
- image prompt
- video prompt
- script / voice direction
- camera behavior
- movement
- pacing
- CTA
- platform notes
- product-fidelity constraints

## Image-first rule

For UGC and realistic product videos:

1. Start from the original YNOT product image(s).
2. Generate a realistic still with the product clearly present.
3. Preserve product silhouette, color, material, proportions, and important design details.
4. Use the successful still as the visual anchor/reference for video generation.
5. Do not allow the renderer to silently substitute a different product.

## Return path

All campaign artifacts belong back in YNOT:
- product ID
- creative ID
- branch
- variant
- prompt pack
- image
- video
- generation job
- review
- approval state
- posting state
- performance

Grok should not treat its chat history or local files as the authoritative campaign database.

## Safety / approval

- Saving creative hypotheses is allowed.
- Generating media follows the YNOT approval state.
- Posting, scheduling, spending, or contacting external parties must use explicit YNOT actions and their approval rules.
- Never bypass YNOT's approval gates.
