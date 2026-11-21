# CodeQuota reference analysis

Reference only: a separate CodeQuota checkout (MIT, Simão L. Lúcio, 2026). No CodeQuota app, package, token store or checkout is required at runtime. The collector/parser here is independently implemented.

## Useful findings

- `CodeQuota/CopilotUsageManager.swift` queries GitHub's monthly endpoint:
  `GET https://api.github.com/users/{login}/settings/billing/premium_request/usage?year={year}&month={month}`.
- `CodeQuota/CopilotUsageParser.swift` reads `usageItems`/`usage_items`, model names, gross quantities and discounted quantities.
- This can add monthly, per-model premium-request usage beyond the existing `copilot_internal/user` account snapshot.

## Do not copy these assumptions

- The parser defaults to **300 requests**, or rounds consumed discounts into a supposed plan allowance. Neither is an authoritative quota cap, particularly for token-based Business billing.
- It truncates fractional quantities and leaves repeated model names as separate rows. We preserve fractions and aggregate model rows.
- Missing response fields must not become a fabricated `0/300` quota.
- Its broad `user` OAuth scope, device login and raw billing-response logging are not adopted.
- AI credits and premium requests are distinct units. Credits used cannot be divided by an assumed premium-request allowance.

## Implemented safely

- Optional billing enrichment following a successful Copilot snapshot, using the existing token on the selected machine and the current UTC billing month.
- Strict GET-only URL validation: fixed GitHub origin, validated username, exact billing path and bounded year/month query. No redirects or raw response logging.
- Monthly request total and per-model **Used / Discounted / Billed** counts when explicitly reported. No cap or remaining percentage is inferred; missing quantities display as unknown.
- Non-Copilot products and non-request units are excluded. Permission/network/malformed-response failures leave the existing credits, reset date and account identity working.
- Local live probe returned **HTTP 404**, with accepted scope `user`; the existing token does not grant that scope. This does not prove the account lacks Copilot or has zero model usage. No authorization or scope was changed. Detailed billing therefore remains conditional on a token permitted to read that endpoint.

Regression tests cover endpoint restrictions, duplicate models, decimals, camel/snake-case fields, missing/invalid quantities, unit separation, no inferred quota and graceful denial. Native fixtures exercise the optional model table without using real billing data.
