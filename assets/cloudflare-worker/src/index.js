const ALLOWED_PRODUCT_IDS = {
  "lid-set-6": "STRIPE_PRICE_LID_SET_6",
  "single-four-hole": "STRIPE_PRICE_SINGLE_FOUR_HOLE",
  "germination-kit": "STRIPE_PRICE_GERMINATION_KIT",
  "bamboo-container": "STRIPE_PRICE_BAMBOO_CONTAINER"
};

const MAX_DISTINCT_ITEMS = 20;
const MAX_QUANTITY_PER_ITEM = 25;

function corsHeaders(origin, allowedOrigin) {
  return {
    "Access-Control-Allow-Origin": origin === allowedOrigin ? origin : allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function jsonResponse(body, status, origin, allowedOrigin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin, allowedOrigin)
    }
  });
}

function validateCart(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_DISTINCT_ITEMS) {
    return { error: "Invalid cart." };
  }

  const combined = new Map();

  for (const item of items) {
    if (!item || typeof item.id !== "string" || !Object.hasOwn(ALLOWED_PRODUCT_IDS, item.id)) {
      return { error: "Cart contains an invalid product." };
    }

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_ITEM) {
      return { error: "Invalid product quantity." };
    }

    combined.set(item.id, (combined.get(item.id) || 0) + quantity);
    if (combined.get(item.id) > MAX_QUANTITY_PER_ITEM) {
      return { error: "Product quantity is too high." };
    }
  }

  return {
    items: [...combined.entries()].map(([id, quantity]) => ({ id, quantity }))
  };
}

async function createStripeCheckoutSession(env, cartItems) {
  const form = new URLSearchParams();

  form.set("mode", "payment");
  form.set("success_url", `${env.STOREFRONT_URL}/?order=success&session_id={CHECKOUT_SESSION_ID}`);
  form.set("cancel_url", `${env.STOREFRONT_URL}/?order=cancelled`);
  form.set("billing_address_collection", "auto");
  form.set("shipping_address_collection[allowed_countries][0]", "US");
  form.set("phone_number_collection[enabled]", "true");
  form.set("allow_promotion_codes", "true");

  if (env.ENABLE_AUTOMATIC_TAX === "true") {
    form.set("automatic_tax[enabled]", "true");
  }

  if (env.STRIPE_SHIPPING_RATE_ID) {
    form.set("shipping_options[0][shipping_rate]", env.STRIPE_SHIPPING_RATE_ID);
  }

  cartItems.forEach((item, index) => {
    const priceId = env[ALLOWED_PRODUCT_IDS[item.id]];
    if (!priceId || !priceId.startsWith("price_")) {
      throw new Error(`Missing Stripe Price ID for ${item.id}.`);
    }

    form.set(`line_items[${index}][price]`, priceId);
    form.set(`line_items[${index}][quantity]`, String(item.quantity));
    form.set(`line_items[${index}][adjustable_quantity][enabled]`, "true");
    form.set(`line_items[${index}][adjustable_quantity][minimum]`, "0");
    form.set(`line_items[${index}][adjustable_quantity][maximum]`, String(MAX_QUANTITY_PER_ITEM));
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: form.toString()
  });

  const result = await response.json();

  if (!response.ok) {
    console.error("Stripe error:", JSON.stringify(result));
    throw new Error(result?.error?.message || "Stripe could not create the Checkout Session.");
  }

  return result;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.STOREFRONT_URL;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin, allowedOrigin)
      });
    }

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse({ ok: true }, 200, origin, allowedOrigin);
    }

    if (request.method !== "POST" || url.pathname !== "/create-checkout-session") {
      return jsonResponse({ error: "Not found." }, 404, origin, allowedOrigin);
    }

    if (origin !== allowedOrigin) {
      return jsonResponse({ error: "Origin not allowed." }, 403, origin, allowedOrigin);
    }

    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_SECRET_KEY.startsWith("sk_")) {
      return jsonResponse({ error: "Checkout service is not configured." }, 503, origin, allowedOrigin);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON." }, 400, origin, allowedOrigin);
    }

    const validation = validateCart(payload.items);
    if (validation.error) {
      return jsonResponse({ error: validation.error }, 400, origin, allowedOrigin);
    }

    try {
      const session = await createStripeCheckoutSession(env, validation.items);
      return jsonResponse({ url: session.url }, 200, origin, allowedOrigin);
    } catch (error) {
      console.error(error);
      return jsonResponse({ error: "Unable to create checkout session." }, 500, origin, allowedOrigin);
    }
  }
};
