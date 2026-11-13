# Kush Tools (`Projects_Web/kush-tools`) — Handoff & Future Phases Roadmap

> **Handoff Targets:** Paperclip Companies (**Dazyners Lab** & **Rock**), **Hermes**, and **MyViber**

## Quick Context
- **Stack:** TanStack Start + React 19 + Tailwind CSS v4 + Supabase + Stripe + Nitro (Cloudflare Workers target).
- **Local Dev Port:** `8085` (`bun run dev` or `C:\25th_Dynasty_Workspace\Launchers\Launch_Kush_Tools.bat`).
- **Key Files:**
  - `src/routes/_authenticated/admin.tsx` — Admin catalog manager, AI copywriter, Cover Picker, Monetization Tier Editor, and Export Bundle panel.
  - `src/lib/monetization.ts` & `src/components/MonetizationTierEditor.tsx` — Per-tool Free/Freemium/Pro/Enterprise pricing tiers.
  - `src/utils/payments.functions.ts` & `src/routes/api/public/payments/webhook.ts` — `createUpgradeCheckout` + `createToolCheckout` dynamic Stripe Checkout.
  - `src/lib/coverGallery.ts` & `src/components/CoverImagePicker.tsx` — Curated vault covers (`/public/covers/`) + file upload + smart fallback.
  - `src/lib/modelHubRouter.ts` — Local Ollama (`:11434`) & Cortex (`:8000`) router.
  - `wrangler.toml` & `.env.example` — Production deployment config.

## Future Development Phases
1. **Phase 2 (Online Launch):**
   - Run `git init`, push to GitHub, and deploy with `bun run deploy:cf` (Cloudflare) or VPS.
   - Set production secrets (`SUPABASE_*`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_PAYMENTS_CLIENT_TOKEN`, `SITE_URL`).
2. **Phase 3 (Supabase Tier Persistence & Entitlements):**
   - Migrate `monetization_tiers` and `tool_entitlements` from `localStorage` into Supabase tables with RLS so admin-configured tiers persist globally across all users.
3. **Phase 4 (VPS Media Gallery & Creator Analytics):**
   - Connect `CoverImagePicker.tsx` to live VPS media manifest (`kushnovels.com/media`) and add per-tool revenue/conversion metrics in `/admin`.
