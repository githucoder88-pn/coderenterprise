# Billing & Analytics API

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/billing-analytics/plans` | Available plans |
| GET | `/billing-analytics/subscriptions` | Current subscription |
| GET | `/billing-analytics/invoices` | Invoice list |
| GET | `/billing-analytics/usage` | Usage metrics (requests, tokens, cost) |
| POST | `/billing-analytics/portal` | Stripe portal URL |

The `billing/` routes (not `billing-analytics/`) expose management endpoints (create subscription, change plan, cancel).
