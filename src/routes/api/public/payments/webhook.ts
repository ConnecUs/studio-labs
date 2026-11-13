import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

async function grantUpgrade(session: any, env: StripeEnv) {
  const userId = session?.metadata?.userId;
  const kind = session?.metadata?.kind;
  if (!userId || (kind !== "profile_upgrade" && kind !== "tool_tier_unlock")) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("purchases")
    .upsert({ user_id: userId, status: "paid", environment: env, stripe_session_id: session.id }, { onConflict: "user_id" });
  if (error) throw error;
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") return Response.json({ received: true, ignored: "invalid env" });
        const env: StripeEnv = rawEnv;
        try {
          // Signature check is the only auth: Stripe sends no session.
          const event = await verifyWebhook(request, env);
          const obj = event.data.object;
          if (event.type === "checkout.session.completed" && obj.payment_status !== "unpaid") await grantUpgrade(obj, env);
          if (event.type === "checkout.session.async_payment_succeeded") await grantUpgrade(obj, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
