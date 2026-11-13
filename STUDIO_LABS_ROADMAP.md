# Studio Labs — Official Platform Roadmap

**Platform:** Studio Labs (`https://kushnovels.com/studio-labs/`)  
**Rights Holder:** Kush Novels LLC (Rights holder to `25th-dynasty.com` and `Studio Labs`)  
**Repository:** `https://github.com/ConnecUs/studio-labs`  
**Current Milestone:** `v1.0.0` (Stamped 2026-11-13)

---

## Vision

Studio Labs is Kush Novels LLC's live experimental software hub—allowing visitors to test creative, narrative, audio, and AI tools directly in the browser, launch them as standalone apps, and save their personal projects into a sovereign vault, while giving commanders a live catalog and monetization control plane.

---

## Milestone `v1.0.0` — Sovereign Hub & Live VPS Mirror (Completed)

- **Public Hub & Tool Launcher (`/`, `/tools/$slug`):**
  - Experimental tools showcase with live iframe embedding and standalone app launch.
  - Kush Novels LLC rights-holder footer linking `25th-dynasty.com`, `kushnovels.com`, Privacy Policy, Terms of Service, and Manager Access.
- **Live VPS Catalog Sync (`/api/studio-labs/tools`):**
  - Visitors receive the live default tool listing from `kushnovels.com/api/studio-labs/tools` with IndexedDB and `localStorage` fallback.
  - Commander changes made in `/admin` (`X-CEO-Code`) persist to the live VPS catalog without silent overwrites on sync errors.
- **Admin Control Plane (`/admin`):**
  - **Cover Image Picker:** Vault gallery, file upload/compression, and cross-environment path normalization (`/` and `/studio-labs/`).
  - **Session Notification Terminal:** Persistent session activity log (`OK`, `INFO`, `WARN`, `ERR`) retained until logoff (`Lock Portal` / `Sign out`).
  - **Local Model Integration:** JSON-verified probing for local Ollama (`:11434`) and Cortex (`:8000`) with live status badge and manual re-check.
  - **Flexible Monetization Tier Editor:** Decimal pricing, multi-currency (`USD`, `EUR`, `GBP`, `CAD`, `AUD`), custom access levels, weekly/monthly/quarterly/yearly/custom billing, trial days, custom badges, multi-line features, and tier reordering/duplication.
- **Personal User Vault (`/profile`):**
  - Per-user saved project links and notes stored in browser IndexedDB (`sovereignDb.ts`) alongside the global default tools list.
- **Version Control & Deployment:**
  - Tracked on GitHub (`ConnecUs/studio-labs`) and deployed as a prerendered SPA bundle to Hostwinds (`/var/www/25th-dynasty-website/studio-labs/`).

---

## Phase 2 — Global Tier Sync & Entitlements

- **Server-Side Tier Persistence:** Sync per-tool `monetizationTiers` in `/api/studio-labs/tools` and/or Supabase with Row-Level Security (RLS) so admin pricing and tier updates apply globally across all visitor browsers.
- **Verified Entitlements:** Persist `tool_entitlements` server-side via Stripe webhooks (`/api/public/payments/webhook`) and Supabase `is_premium` / `purchases` checks.
- **One-Command VPS Deploy Script:** Add an automated deploy target (`bun run deploy:vps`) mirroring the Hostwinds SFTP/nginx workflow.

---

## Phase 3 — Live Media Vault & Creator Analytics

- **VPS Media Manifest:** Connect `CoverImagePicker.tsx` to a live media manifest (`kushnovels.com/media`) for centralized asset management across `kushnovels.com`, `25th-dynasty.com`, and `Studio Labs`.
- **Creator & Admin Telemetry:** Track tool launches, embed vs. standalone usage, tier checkout starts, and conversion metrics in `/admin`.

---

## Phase 4 — Cross-Platform SSO & Ecosystem SDK

- **Unified Sovereign Identity:** Seamless session handoff between `kushnovels.com`, `25th-dynasty.com`, and embedded Studio Labs apps.
- **Studio Labs App SDK:** Lightweight postMessage / OAuth bridge allowing embedded tools to read user entitlements and save projects directly back into the user's Studio Labs vault.
- **Partner & Community Submissions:** Curated submission and review queue in `/admin` for new experimental tools.
