const PRODUCTS = {
  "lid-set-6": {
    name: "6-Inch Single-Hole Lid Set — 6 Pack",
    price: 109.00
  },
  "single-four-hole": {
    name: "Single Four-Hole Stainless Lid",
    price: 19.99
  },
  "germination-kit": {
    name: "Complete Germination Kit",
    price: 49.95
  },
  "bamboo-container": {
    name: "Bamboo Germination Container",
    price: 29.99
  }
};

/*
 * Replace this after deploying the Cloudflare Worker.
 * Example: https://smg-stripe-checkout.your-subdomain.workers.dev
 */
const CHECKOUT_API_URL = "PASTE_CLOUDFLARE_WORKER_URL_HERE";

let cart = JSON.parse(localStorage.getItem("smg-cart") || "{}");

function saveCart() {
  localStorage.setItem("smg-cart", JSON.stringify(cart));
  renderCart();
}

function addToCart(id) {
  if (!PRODUCTS[id]) return;
  cart[id] = (cart[id] || 0) + 1;
  saveCart();
  openCart();
}

function changeQuantity(id, delta) {
  if (!cart[id]) return;
  cart[id] += delta;
  if (cart[id] <= 0) delete cart[id];
  saveCart();
}

function removeFromCart(id) {
  delete cart[id];
  saveCart();
}

function openCart() {
  document.getElementById("cart").classList.add("open");
  document.getElementById("overlay").classList.add("show");
}

function closeCart() {
  document.getElementById("cart").classList.remove("open");
  document.getElementById("overlay").classList.remove("show");
}

function renderCart() {
  const body = document.getElementById("cartBody");
  const entries = Object.entries(cart).filter(([id, qty]) => PRODUCTS[id] && qty > 0);
  const count = entries.reduce((sum, [, qty]) => sum + qty, 0);

  document.getElementById("cartCount").textContent = count;

  if (!entries.length) {
    body.innerHTML = '<div class="empty">Your cart is empty.</div>';
    document.getElementById("cartTotal").textContent = "$0.00";
    return;
  }

  let total = 0;
  body.innerHTML = entries.map(([id, qty]) => {
    const product = PRODUCTS[id];
    const lineTotal = product.price * qty;
    total += lineTotal;

    return `<div class="cart-item">
      <div>
        <b>${product.name}</b>
        <small>$${product.price.toFixed(2)} each</small>
        <div class="qty-controls" style="display:flex;align-items:center;gap:9px;margin-top:9px">
          <button type="button" aria-label="Decrease quantity" onclick="changeQuantity('${id}', -1)"
            style="width:30px;height:30px;border:1px solid rgba(255,255,255,.15);border-radius:50%;background:rgba(255,255,255,.05);color:#fff">−</button>
          <strong>${qty}</strong>
          <button type="button" aria-label="Increase quantity" onclick="changeQuantity('${id}', 1)"
            style="width:30px;height:30px;border:1px solid rgba(255,255,255,.15);border-radius:50%;background:rgba(255,255,255,.05);color:#fff">+</button>
          <button type="button" onclick="removeFromCart('${id}')"
            style="margin-left:8px;background:none;color:#f1a678">Remove</button>
        </div>
      </div>
      <b>$${lineTotal.toFixed(2)}</b>
    </div>`;
  }).join("");

  document.getElementById("cartTotal").textContent = `$${total.toFixed(2)}`;
}

async function beginCheckout() {
  const entries = Object.entries(cart)
    .filter(([id, qty]) => PRODUCTS[id] && Number.isInteger(qty) && qty > 0)
    .map(([id, quantity]) => ({ id, quantity }));

  if (!entries.length) return false;

  if (!CHECKOUT_API_URL.startsWith("https://")) {
    alert("Checkout setup is not finished yet. Add the deployed Cloudflare Worker URL in store.js.");
    return false;
  }

  const checkoutButton = document.querySelector(".cart-foot .btn");
  const originalText = checkoutButton.textContent;
  checkoutButton.textContent = "Opening secure checkout…";
  checkoutButton.style.pointerEvents = "none";

  try {
    const response = await fetch(`${CHECKOUT_API_URL.replace(/\/$/, "")}/create-checkout-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: entries })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.url) {
      throw new Error(data.error || "Unable to create checkout session.");
    }

    window.location.assign(data.url);
  } catch (error) {
    console.error(error);
    alert("Checkout could not be opened. Please try again.");
    checkoutButton.textContent = originalText;
    checkoutButton.style.pointerEvents = "";
  }

  return false;
}

document.getElementById("year").textContent = new Date().getFullYear();
renderCart();
