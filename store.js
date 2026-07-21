const STORE_API_URL = "https://smg-stripe-checkout.brandon-3ba.workers.dev";

const FALLBACK_PRODUCTS = {
  "lid-set-6": {
    id: "lid-set-6",
    name: "6-Inch Single-Hole Lid Set — 6 Pack",
    description: "Six stainless steel lids, each with one 6-inch center opening for a single large net pot.",
    price: 109.0,
    image: "assets/lid-installed.jpg",
    imageAlt: "Six-inch single-opening stainless steel lid installed on an AirCube-compatible bucket",
    imageFit: "cover",
    featured: true
  },
  "single-four-hole": {
    id: "single-four-hole",
    name: "Single Four-Hole Stainless Lid",
    description: "A single replacement or expansion lid with four planting openings.",
    price: 19.99,
    image: "assets/lid-four-hole-render.jpg",
    imageAlt: "Single four-hole stainless steel hydroponic lid",
    imageFit: "contain",
    featured: false
  },
  "germination-kit": {
    id: "germination-kit",
    name: "Complete Germination Kit",
    description: "Bamboo container, drainage-ready insert, cotton pads, Seedzers, and instructions.",
    price: 49.95,
    image: "assets/germination-kit-promo.png",
    imageAlt: "Complete Survival Mode Grows germination kit",
    imageFit: "cover",
    featured: false
  },
  "bamboo-container": {
    id: "bamboo-container",
    name: "Bamboo Germination Container",
    description: "The reusable branded bamboo germination container for returning customers.",
    price: 29.99,
    image: "assets/germination-lifestyle-light.png",
    imageAlt: "Survival Mode Grows bamboo germination container",
    imageFit: "cover",
    featured: false
  }
};

let PRODUCTS = { ...FALLBACK_PRODUCTS };
let cart = JSON.parse(localStorage.getItem("smg-cart") || "{}");

function formatPrice(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

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

function renderProductCatalog() {
  const grid = document.querySelector("#shop .products");
  if (!grid) return;

  const products = Object.values(PRODUCTS);
  grid.innerHTML = products.map((product) => {
    const mediaClass = product.imageFit === "contain" ? "product-media contain" : "product-media";
    const buttonClass = product.featured ? "btn primary" : "btn secondary";

    return `
      <article class="card product" data-product-id="${product.id}">
        <div class="${mediaClass}">
          <img src="${product.image}" alt="${product.imageAlt || product.name}">
        </div>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <div class="product-price">${formatPrice(product.price)}</div>
        <button class="${buttonClass}" onclick="addToCart('${product.id}')">Add to Cart</button>
      </article>`;
  }).join("");
}

function renderCart() {
  const body = document.getElementById("cartBody");
  const entries = Object.entries(cart).filter(([id, quantity]) => PRODUCTS[id] && quantity > 0);
  const itemCount = entries.reduce((sum, [, quantity]) => sum + quantity, 0);

  document.getElementById("cartCount").textContent = itemCount;

  if (!entries.length) {
    body.innerHTML = '<div class="empty">Your cart is empty.</div>';
    document.getElementById("cartTotal").textContent = "$0.00";
    return;
  }

  let total = 0;
  body.innerHTML = entries.map(([id, quantity]) => {
    const product = PRODUCTS[id];
    const lineTotal = product.price * quantity;
    total += lineTotal;

    return `
      <div class="cart-item">
        <div>
          <b>${product.name}</b>
          <small>${formatPrice(product.price)} each</small>
          <div style="display:flex;align-items:center;gap:9px;margin-top:9px">
            <button type="button" aria-label="Decrease quantity" onclick="changeQuantity('${id}', -1)" style="width:30px;height:30px;border:1px solid rgba(255,255,255,.15);border-radius:50%;background:rgba(255,255,255,.05);color:#fff">−</button>
            <strong>${quantity}</strong>
            <button type="button" aria-label="Increase quantity" onclick="changeQuantity('${id}', 1)" style="width:30px;height:30px;border:1px solid rgba(255,255,255,.15);border-radius:50%;background:rgba(255,255,255,.05);color:#fff">+</button>
            <button type="button" onclick="removeFromCart('${id}')" style="margin-left:8px;background:none;color:#f1a678">Remove</button>
          </div>
        </div>
        <b>${formatPrice(lineTotal)}</b>
      </div>`;
  }).join("");

  document.getElementById("cartTotal").textContent = formatPrice(total);
}

async function loadProducts() {
  try {
    const response = await fetch(`${STORE_API_URL}/products`, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) throw new Error("Product catalog request failed.");

    const data = await response.json();
    if (!Array.isArray(data.products) || !data.products.length) {
      throw new Error("Product catalog is empty.");
    }

    PRODUCTS = Object.fromEntries(data.products.map((product) => [product.id, product]));
  } catch (error) {
    console.warn("Using local product fallback:", error);
    PRODUCTS = { ...FALLBACK_PRODUCTS };
  }

  for (const id of Object.keys(cart)) {
    if (!PRODUCTS[id]) delete cart[id];
  }

  renderProductCatalog();
  saveCart();
}

async function beginCheckout() {
  const items = Object.entries(cart)
    .filter(([id, quantity]) => PRODUCTS[id] && Number.isInteger(quantity) && quantity > 0)
    .map(([id, quantity]) => ({ id, quantity }));

  if (!items.length) return false;

  const checkoutButton = document.querySelector(".cart-foot .btn");
  const originalText = checkoutButton.textContent;
  checkoutButton.textContent = "Opening secure checkout…";
  checkoutButton.style.pointerEvents = "none";

  try {
    const response = await fetch(`${STORE_API_URL}/create-checkout-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items })
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
loadProducts();
