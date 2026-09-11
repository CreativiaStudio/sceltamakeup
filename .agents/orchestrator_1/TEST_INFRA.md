# E2E Test Infra: Scelta Makeup FASE 3

## Test Philosophy
- Opaque-box, requirement-driven testing derived from `ORIGINAL_REQUEST.md` and domain specifications.
- Dual-track independence: Verification of queue pacing, email generation, financial math, and build integrity without coupling to internal implementation quirks.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial + Real-World Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Standalone Supabase SQL Schema | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 2 | WhatsApp Anti-Ban Queue Engine | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 3 | Human Pacing 20–45s Random Jitter | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 4 | Dynamic Text & Anti-Spam Variation | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 5 | WhatsApp Message Templates (3 types) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 6 | Luxury Resend Email Service | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 7 | Official Visual Palette & Claim | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 8 | Email Templates (3 types) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 9 | Financial Calculations Invariance | ORIGINAL_REQUEST §R2, §AC | 5 | 5 | ✓ |
| 10 | Admin Queue Monitor & Status Dashboard | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 11 | Evolution API Session & QR Display | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |

## Test Architecture
- Test runner: Node.js test runner / vitest or custom automated test script (`scripts/test-queue-pacing.ts`, `scripts/test-email-financials.ts`).
- Verification Semantics:
  - Queue Pacing: Measure consecutive dispatches across multiple messages; verify $20000\text{ms} \le \Delta t \le 45000\text{ms}$ and random jitter distribution.
  - Financial Engine: Iterate over all 6 catalog services and edge-case prices; verify $P_{on} = P_{list} \times 0.90$, $Dep = P_{on} \times 0.20$, $Bal = P_{on} - Dep$, and $Dep + Bal = P_{on}$ down to the exact cent.
  - Email HTML: Verify responsive structure, table wrapping, inlined CSS, presence of `#5E1788`, `#D8C2E7`, `#FFFFFF`, `#D462A6`, and claim "L'eleganza di essere autentica".
  - Production Build: `npx tsc --noEmit` exit 0, `npm run lint` exit 0, `npm run build` exit 0.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Full Booking Wizard to WA + Email Dispatch | Booking wizard, 20% deposit, WhatsApp queue, Resend confirmation email, calendar links | High |
| 2 | 24h Reminder Automated Dispatch | Reminder trigger, vademecum injection, cancellation disclaimer, Google Maps link, queue jitter | Medium |
| 3 | E-Commerce Checkout (Courier Delivery) | Cart checkout, shipping fee calculation, order placement, WhatsApp confirmation, luxury email | High |
| 4 | E-Commerce Checkout (Boutique Pickup) | Cart checkout, free shipping override, boutique pickup instructions, WhatsApp confirmation | Medium |
| 5 | Multi-Message Rapid Enqueue Stress Test | Enqueue 5 booking/order notifications within 100ms; verify zero concurrent dispatches and strict sequential 20-45s delays | High |

## Coverage Thresholds
- Tier 1: ≥5 test cases per feature (Happy-path isolation)
- Tier 2: ≥5 boundary & corner test cases (zero price, max jitter, missing optional fields, invalid phone formats)
- Tier 3: Pairwise coverage of major feature interactions
- Tier 4: ≥5 realistic application scenarios
