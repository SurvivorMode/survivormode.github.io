SURVIVAL MODE GROWS — MULTI-ITEM STRIPE CHECKOUT
================================================

Architecture
------------
GitHub Pages hosts the storefront.
A Cloudflare Worker creates Stripe Checkout Sessions securely.
Stripe hosts the payment page.

The Stripe secret key is never placed in the public website repository.

Required Stripe products/prices
-------------------------------
Create one-time USD Prices for:

1. 6-Inch Single-Hole Lid Set — 6 Pack ($109.00)
2. Single Four-Hole Stainless Lid ($19.99)
3. Complete Germination Kit ($49.95)
4. Bamboo Germination Container ($29.99)

Copy each Price ID. Price IDs begin with:

price_

Cloudflare Worker variables
---------------------------
Set these as normal variables:

STOREFRONT_URL=https://survivalmodegrows.com
STRIPE_PRICE_LID_SET_6=price_...
STRIPE_PRICE_SINGLE_FOUR_HOLE=price_...
STRIPE_PRICE_GERMINATION_KIT=price_...
STRIPE_PRICE_BAMBOO_CONTAINER=price_...
ENABLE_AUTOMATIC_TAX=false

Optional shipping-rate variable:

STRIPE_SHIPPING_RATE_ID=shr_...

Set this as an encrypted secret:

STRIPE_SECRET_KEY=sk_live_...

Never place STRIPE_SECRET_KEY in store.js, index.html, GitHub, or wrangler.toml.

Deploy from the Cloudflare dashboard
------------------------------------
1. Open Workers & Pages.
2. Create a Worker named smg-stripe-checkout.
3. Replace the starter Worker code with src/index.js.
4. Add the variables above under Settings > Variables and Secrets.
5. Store STRIPE_SECRET_KEY as a Secret.
6. Deploy.
7. Open:
   https://YOUR-WORKER.workers.dev/health
   It should return {"ok":true}.

Connect the storefront
----------------------
Open the website's store.js and replace:

const CHECKOUT_API_URL = "PASTE_CLOUDFLARE_WORKER_URL_HERE";

with the deployed Worker base URL, for example:

const CHECKOUT_API_URL = "https://smg-stripe-checkout.example.workers.dev";

Commit and push the website repository.

Checkout behavior
-----------------
- Customers can combine different products in one cart.
- Quantities can be changed in the website cart.
- Quantities can also be adjusted on Stripe Checkout.
- Stripe collects US shipping addresses and phone numbers.
- Promotion codes are enabled.
- Successful payment redirects to:
  https://survivalmodegrows.com/?order=success
- Cancelling redirects to:
  https://survivalmodegrows.com/?order=cancelled

Before going live
-----------------
- Configure shipping in Stripe and set STRIPE_SHIPPING_RATE_ID, or decide to include shipping.
- Decide whether to enable Stripe Tax.
- Test with Stripe test-mode Price IDs and an sk_test_ key first.
- Perform one complete test order before switching to live-mode keys.
