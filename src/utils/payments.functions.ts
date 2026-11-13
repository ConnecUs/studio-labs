import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

export const UPGRADE_PRICE_ID = "profile_upgrade_onetime";

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string | undefined; userId?: string | undefined },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
  if (options.userId) {
    const found = await stripe.customers.search({ query: `metadata['userId']:'${options.userId}'`, limit: 1 });
    if (found.data[0]) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    const customer = existing.data[0];
    if (customer) {
      if (options.userId && customer.metadata?.["userId"] !== options.userId) {
        await stripe.customers.update(customer.id, { metadata: { ...customer.metadata, userId: options.userId } });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

// Signed-in only: userId/email come from the verified session, never the client.
export const createUpgradeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl: string; environment: StripeEnv }) => {
    if (data.environment !== "sandbox" && data.environment !== "live") throw new Error("Invalid environment");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    try {
      const { userId, supabase } = context;
      const { data: u } = await supabase.auth.getUser();
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [UPGRADE_PRICE_ID] });
      const price = prices.data[0];
      if (!price) return { error: "Upgrade price not found" };
      const productId = typeof price.product === "string" ? price.product : price.product.id;
      const product = await stripe.products.retrieve(productId);
      const customerId = await resolveOrCreateCustomer(stripe, { email: u.user?.email ?? undefined, userId });
      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        automatic_tax: { enabled: true },
        payment_intent_data: { description: product.name },
        metadata: { userId, kind: "profile_upgrade", managed_payments: "false" },
      });
      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export interface ToolCheckoutInput {
  toolSlug: string;
  toolName: string;
  tierName: string;
  priceCents: number;
  billingModel: "one_time" | "monthly" | "yearly";
  stripePriceId?: string;
  returnUrl: string;
  environment: StripeEnv;
}

export const createToolCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ToolCheckoutInput) => {
    if (data.environment !== "sandbox" && data.environment !== "live") {
      throw new Error("Invalid environment");
    }
    if (!data.toolSlug || data.priceCents <= 0) {
      throw new Error("Invalid tool tier pricing");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    try {
      const { userId, supabase } = context;
      const { data: u } = await supabase.auth.getUser();
      const stripe = createStripeClient(data.environment);
      const customerId = await resolveOrCreateCustomer(stripe, {
        email: u.user?.email ?? undefined,
        userId,
      });

      const isSubscription = data.billingModel === "monthly" || data.billingModel === "yearly";
      const lineItem = data.stripePriceId
        ? { price: data.stripePriceId, quantity: 1 }
        : {
            price_data: {
              currency: "usd",
              unit_amount: data.priceCents,
              product_data: {
                name: `${data.toolName} — ${data.tierName}`,
              },
              ...(isSubscription && {
                recurring: {
                  interval: data.billingModel === "yearly" ? ("year" as const) : ("month" as const),
                },
              }),
            },
            quantity: 1,
          };

      const session = await stripe.checkout.sessions.create({
        line_items: [lineItem],
        mode: isSubscription ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        automatic_tax: { enabled: true },
        metadata: {
          userId,
          kind: "tool_tier_unlock",
          toolSlug: data.toolSlug,
          tierName: data.tierName,
          managed_payments: "false",
        },
      });
      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
