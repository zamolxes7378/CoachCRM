# Phase 2 — Factur-X Implementation Plan

**Scope:** Full e-invoicing compliance (emission + reception)
**Target:** Q3 2026 — reception by 2026-09-01, emission by 2027-09-01

## Prerequisites (from Phase 1 P1-T)
- [ ] PDP vendor selected (Pennylane recommended — see `docs/compliance/factur-x_roadmap.md`)
- [ ] Schema gap closed (10 fields missing + 2 partial from `docs/compliance/invoice_content_gap.md`)

## Track outline
1. **Schema migration** — add SIRET, TVA fields, sequential invoice number, buyer identity, unit price HT, payment conditions, late penalties to `billing_reminders`
2. **PDP integration** — REST API client for selected PDP; submit/receive Factur-X XML
3. **PDF generation** — Factur-X embedded XML in PDF (use `factur-x` npm package or equivalent)
4. **Rename back** — `billing_reminders` → `invoices` once legally compliant
5. **Chorus Pro reception** — parse incoming Factur-X from public-sector clients

## Estimated effort
3–4 engineer-weeks + legal review + PDP onboarding (2–4 weeks vendor side).
