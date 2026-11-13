# Tools Hub ("Labs"-style showcase)

## What visitors get
- **Landing page**: bold intro + grid of tool cards (image, name, short description, tag). Distinctive experimental "lab" look, not generic.
- **Tool page** (one per tool): live demo embedded right in the hub, plus an "Open as its own app" button that launches the tool in a new tab.
- **Sign up / sign in** with email.

## Admin page
- Only admins can open it.
- Add, edit, reorder, hide/show and delete tools: name, short + long description, cover image, tool URL, tag, whether it can be embedded.
- Changes appear on the landing page instantly.

## Upgrade (one-time purchase)
- Free accounts: try every tool.
- Upgraded accounts unlock a **Profile page**:
  - Gallery of saved links (save a tool or a specific project URL with a title and note).
  - Saved work per tool, shown grouped by tool.
- "Upgrade" button leads to checkout; after paying, the profile unlocks automatically.

## Build order
1. Turn on Lovable Cloud (accounts, data storage).
2. Landing, tool pages, sign in, admin page, profile + saved links.
3. Payments: run the provider eligibility check, then ask you to confirm before enabling the test checkout and setting the price.

## Things I need from you later
- Hub name and the list of your tool URLs (or add them yourself in the admin page).
- Upgrade price.
- Note: tools inside your other apps saving work back to the hub would require small changes in each of those apps; first version saves links/projects in the hub itself.

## Technical details
- Tables: tools, user_roles (admin role, separate table + has_role function), saved_items, purchases. RLS on all; admins manage tools; users own their saved items.
- Embedding via iframe; tools that block embedding fall back to "open in new tab".
- First signed-up user is granted admin via a one-time step.
