const PRODUCTS = {
  "lid-set-6": { name: "Stainless Lid Set — 6 Pack", price: 109.00, checkout: "" },
  "single-four-hole": { name: "Single Four-Hole Stainless Lid", price: 19.99, checkout: "" },
  "germination-kit": { name: "Complete Germination Kit", price: 49.95, checkout: "" },
  "bamboo-container": { name: "Bamboo Germination Container", price: 29.99, checkout: "" }
};
let cart = JSON.parse(localStorage.getItem("smg-cart") || "{}");
function saveCart(){localStorage.setItem("smg-cart",JSON.stringify(cart));renderCart()}
function addToCart(id){cart[id]=(cart[id]||0)+1;saveCart();openCart()}
function removeFromCart(id){delete cart[id];saveCart()}
function openCart(){document.getElementById("cart").classList.add("open");document.getElementById("overlay").classList.add("show")}
function closeCart(){document.getElementById("cart").classList.remove("open");document.getElementById("overlay").classList.remove("show")}
function renderCart(){
 const body=document.getElementById("cartBody"),entries=Object.entries(cart);
 document.getElementById("cartCount").textContent=entries.reduce((s,[,q])=>s+q,0);
 if(!entries.length){body.innerHTML='<div class="empty">Your cart is empty.</div>';document.getElementById("cartTotal").textContent="$0.00";return}
 let total=0;
 body.innerHTML=entries.map(([id,q])=>{const p=PRODUCTS[id];total+=p.price*q;return `<div class="cart-item"><div><b>${p.name}</b><small>Quantity: ${q} × $${p.price.toFixed(2)}</small><button onclick="removeFromCart('${id}')">Remove</button></div><b>$${(p.price*q).toFixed(2)}</b></div>`}).join("");
 document.getElementById("cartTotal").textContent=`$${total.toFixed(2)}`;
}
function beginCheckout(){
 const entries=Object.entries(cart);if(!entries.length)return false;
 if(entries.length===1&&entries[0][1]===1){const p=PRODUCTS[entries[0][0]];if(p.checkout){location.href=p.checkout;return false}}
 alert("Checkout is not connected yet. Add live Stripe Payment Link URLs in store.js.");return false
}
document.getElementById("year").textContent=new Date().getFullYear();renderCart();