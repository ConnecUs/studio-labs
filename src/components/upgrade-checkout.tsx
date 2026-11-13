import { useCallback } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createUpgradeCheckout } from "@/utils/payments.functions";

export function UpgradeCheckout() {
  const create = useServerFn(createUpgradeCheckout);
  const fetchClientSecret = useCallback(async () => {
    const r = await create({
      data: { returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`, environment: getStripeEnvironment() },
    });
    if ("error" in r) throw new Error(r.error);
    if (!r.clientSecret) throw new Error("Checkout could not start");
    return r.clientSecret;
  }, [create]);
  return (
    <div className="overflow-hidden rounded-2xl bg-card">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
