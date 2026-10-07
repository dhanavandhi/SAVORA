/**
 * SAVORA - Food & Grocery Delivery Platform
 * Complete Frontend Controller & API Integration
 */

 // API Configuration
// Local development uses localhost:5000.
// Production (Render) uses the same deployed service's /api path.
const API_BASE =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';

// ==========================================
// STATE MANAGEMENT & LOCAL STORAGE
// ==========================================

const State = {
  token: localStorage.getItem('savora_token') || null,
  user: JSON.parse(localStorage.getItem('savora_user') || 'null'),
  cart: JSON.parse(localStorage.getItem('savora_cart') || '[]'),
  location: JSON.parse(localStorage.getItem('savora_location') || JSON.stringify({
    name: 'Koramangala 4th Block',
    city: 'Bengaluru',
    full: 'Flat 402, Green Glen Heights, Koramangala 4th Block, Bengaluru',
    lat: 12.9352,
    lng: 77.6245
  })),
  appliedCoupon: JSON.parse(localStorage.getItem('savora_coupon') || 'null'),
  activeCategory: 'All',
  activeCuisine: 'All',
  onlyVeg: false,
  sortBy: 'featured',
};

function saveState(key, val) {
  if (val === null) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
  }
}

// ==========================================
// API HELPER FUNCTION
// ==========================================

async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(State.token ? { Authorization: `Bearer ${State.token}` } : {}),
    ...(options.headers || {})
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

// ==========================================
// TOAST NOTIFICATION SYSTEM
// ==========================================

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-exclamation';
  if (type === 'info') icon = 'fa-circle-info';

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ==========================================
// CART OPERATIONS & CALCULATIONS
// ==========================================

function getCartTotals() {
  const subtotal = State.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemCount = State.cart.reduce((sum, item) => sum + item.quantity, 0);
  
  // Delivery Fee: Free if >= ₹299, else flat ₹35
  const deliveryFee = subtotal === 0 || subtotal >= 299 ? 0 : 35;
  const platformFee = subtotal > 0 ? 5 : 0;
  
  let discount = 0;
  if (State.appliedCoupon && subtotal > 0) {
    const discPct = State.appliedCoupon.discountPercent || 0;
    const calcDisc = Math.round((subtotal * discPct) / 100);
    discount = Math.min(calcDisc, State.appliedCoupon.maxDiscount || calcDisc);
  }

  const finalTotal = Math.max(0, subtotal + deliveryFee + platformFee - discount);

  // Determine order type
  const hasFood = State.cart.some(i => i.itemType === 'food');
  const hasFresh = State.cart.some(i => i.itemType === 'grocery');
  let orderType = 'food';
  if (hasFood && hasFresh) orderType = 'mixed';
  else if (hasFresh) orderType = 'fresh';

  return {
    subtotal,
    itemCount,
    deliveryFee,
    platformFee,
    discount,
    finalTotal,
    orderType,
  };
}

function addToCart(item) {
  // item: { id, name, price, originalPrice, image, unit, itemType, restaurantId, restaurantName }
  const existingIdx = State.cart.findIndex(i => i.id === item.id);

  if (existingIdx > -1) {
    State.cart[existingIdx].quantity += 1;
  } else {
    State.cart.push({
      ...item,
      quantity: 1
    });
  }

  saveState('savora_cart', State.cart);
  updateCartUI();
  showToast(`Added "${item.name}" to cart`);
}

function updateCartQuantity(itemId, delta) {
  const existingIdx = State.cart.findIndex(i => i.id === itemId);
  if (existingIdx === -1) return;

  State.cart[existingIdx].quantity += delta;

  if (State.cart[existingIdx].quantity <= 0) {
    const removedName = State.cart[existingIdx].name;
    State.cart.splice(existingIdx, 1);
    showToast(`Removed "${removedName}" from cart`, 'info');
  }

  saveState('savora_cart', State.cart);
  updateCartUI();
}

function removeFromCart(itemId) {
  State.cart = State.cart.filter(i => i.id !== itemId);
  saveState('savora_cart', State.cart);
  updateCartUI();
  showToast('Item removed from cart', 'info');
}

function clearCart() {
  State.cart = [];
  State.appliedCoupon = null;
  saveState('savora_cart', []);
  saveState('savora_coupon', null);
  updateCartUI();
}

function updateCartUI() {
  const totals = getCartTotals();

  // Update Header Badge
  const badges = document.querySelectorAll('.cart-badge');
  badges.forEach(b => {
    b.textContent = totals.itemCount;
    b.style.display = totals.itemCount > 0 ? 'inline-block' : 'none';
  });

  // Update Floating Cart Bar
  const floatBar = document.getElementById('floating-cart-bar');
  if (floatBar) {
    if (totals.itemCount > 0) {
      floatBar.classList.add('visible');
      const countEl = document.getElementById('float-cart-count');
      const totalEl = document.getElementById('float-cart-total');
      if (countEl) countEl.textContent = `${totals.itemCount} ${totals.itemCount === 1 ? 'item' : 'items'}`;
      if (totalEl) totalEl.textContent = `₹${totals.finalTotal}`;
    } else {
      floatBar.classList.remove('visible');
    }
  }

  // Sync any product cards or menu item counter buttons visible on screen
  syncProductQuantityButtons();

  // If cart drawer is open, re-render drawer
  renderCartDrawer();

  // If checkout page is open, refresh summary
  if (typeof renderCheckoutSummary === 'function') {
    renderCheckoutSummary();
  }
}

function syncProductQuantityButtons() {
  document.querySelectorAll('[data-product-id]').forEach(container => {
    const pId = container.getAttribute('data-product-id');
    const inCart = State.cart.find(i => i.id === pId);
    
    if (inCart) {
      container.innerHTML = `
        <div class="qty-counter">
          <button class="qty-btn" onclick="updateCartQuantity('${pId}', -1)"><i class="fa-solid fa-minus"></i></button>
          <span class="qty-value">${inCart.quantity}</span>
          <button class="qty-btn" onclick="updateCartQuantity('${pId}', 1)"><i class="fa-solid fa-plus"></i></button>
        </div>
      `;
    } else {
      const pDataStr = container.getAttribute('data-product-json');
      if (pDataStr) {
        container.innerHTML = `
          <button class="add-btn" onclick='handleAddToCartFromAttr(this)'>ADD</button>
        `;
      }
    }
  });
}

function handleAddToCartFromAttr(btn) {
  const container = btn.closest('[data-product-id]');
  if (!container) return;
  try {
    const rawData = decodeURIComponent(container.getAttribute('data-product-json'));
    const item = JSON.parse(rawData);
    addToCart(item);
  } catch (e) {
    console.error('Failed to parse item json:', e);
  }
}

// ==========================================
// CART DRAWER CONTROLLER
// ==========================================

function openCartDrawer() {
  const drawerBackdrop = document.getElementById('cart-drawer-backdrop');
  if (drawerBackdrop) {
    renderCartDrawer();
    drawerBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeCartDrawer() {
  const drawerBackdrop = document.getElementById('cart-drawer-backdrop');
  if (drawerBackdrop) {
    drawerBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function renderCartDrawer() {
  const container = document.getElementById('cart-drawer-items');
  const footerContainer = document.getElementById('cart-drawer-footer');
  if (!container) return;

  const totals = getCartTotals();

  if (State.cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart-view">
        <div class="empty-cart-icon">
          <i class="fa-solid fa-basket-shopping"></i>
        </div>
        <h3>Your SAVORA cart is empty</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 6px;">Explore delicious dishes and fresh farm groceries to fill it up!</p>
        <button class="btn-submit" style="width: auto; padding: 10px 24px; margin-top: 20px;" onclick="closeCartDrawer()">Start Shopping</button>
      </div>
    `;
    if (footerContainer) footerContainer.style.display = 'none';
    return;
  }

  if (footerContainer) footerContainer.style.display = 'block';

  // Group or show store header
  const storeName = State.cart[0].restaurantName || 'SAVORA Fresh Mart';
  let html = `
    <div class="cart-store-banner">
      <i class="fa-solid fa-store"></i>
      <span>Ordering from: <strong>${storeName}</strong></span>
    </div>
  `;

  State.cart.forEach(item => {
    html += `
      <div class="cart-item-row">
        <img src="${item.image}" alt="${item.name}" class="cart-item-thumb" />
        <div class="cart-item-details">
          <h4 class="cart-item-title">${item.name}</h4>
          <span class="cart-item-sub">${item.unit ? item.unit : (item.itemType === 'food' ? 'Food Dish' : 'Fresh Item')}</span>
          <div class="cart-item-price">₹${item.price * item.quantity}</div>
        </div>
        <div class="qty-counter">
          <button class="qty-btn" onclick="updateCartQuantity('${item.id}', -1)"><i class="fa-solid fa-minus"></i></button>
          <span class="qty-value">${item.quantity}</span>
          <button class="qty-btn" onclick="updateCartQuantity('${item.id}', 1)"><i class="fa-solid fa-plus"></i></button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  if (footerContainer) {
    footerContainer.innerHTML = `
      <div class="cart-bill-row">
        <span>Item Subtotal</span>
        <span>₹${totals.subtotal}</span>
      </div>
      <div class="cart-bill-row">
        <span>Delivery Fee</span>
        <span>${totals.deliveryFee === 0 ? '<strong style="color: var(--primary);">FREE</strong>' : `₹${totals.deliveryFee}`}</span>
      </div>
      <div class="cart-bill-row">
        <span>Platform Fee</span>
        <span>₹${totals.platformFee}</span>
      </div>
      ${totals.discount > 0 ? `
        <div class="cart-bill-row" style="color: var(--primary); font-weight: 700;">
          <span>Coupon Discount (${State.appliedCoupon.code})</span>
          <span>-₹${totals.discount}</span>
        </div>
      ` : ''}
      <div class="cart-bill-row total">
        <span>Total Payable</span>
        <span>₹${totals.finalTotal}</span>
      </div>
      <button class="cart-checkout-btn" onclick="window.location.href='checkout.html'">
        <span>Proceed to Checkout</span>
        <span>₹${totals.finalTotal} <i class="fa-solid fa-arrow-right"></i></span>
      </button>
    `;
  }
}

// ==========================================
// LOCATION & ADDRESS CONTROLLER
// ==========================================

function openLocationModal() {
  const modal = document.getElementById('location-modal');
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    loadSavedAddressesInModal();
  }
}

function closeLocationModal() {
  const modal = document.getElementById('location-modal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function setDeliveryLocation(locObj) {
  State.location = locObj;
  saveState('savora_location', locObj);
  updateLocationHeader();
  closeLocationModal();
  showToast(`Delivering to ${locObj.name}`);
}

function updateLocationHeader() {
  const labelEl = document.getElementById('current-location-text');
  if (labelEl) {
    labelEl.textContent = State.location.name || 'Select Location';
  }
}

async function detectCurrentLocation() {
  const btnText = document.getElementById('detect-loc-title');
  if (btnText) btnText.textContent = 'Detecting location...';

  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser', 'error');
    if (btnText) btnText.textContent = 'Use current location';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      // In a real reverse geocoding API, we would lookup lat/lng. Here we provide a localized pinpoint!
      const detected = {
        name: 'Current Location (GPS)',
        city: 'Bengaluru',
        full: `GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)}), Bengaluru`,
        lat,
        lng
      };
      setDeliveryLocation(detected);
      if (btnText) btnText.textContent = 'Use current location';
    },
    (err) => {
      console.warn('Geolocation error:', err.message);
      showToast('Location permission denied or unavailable. Using Koramangala, Bengaluru.', 'info');
      setDeliveryLocation({
        name: 'Koramangala 4th Block',
        city: 'Bengaluru',
        full: 'Flat 402, Green Glen Heights, 80 Feet Road, Koramangala, Bengaluru',
        lat: 12.9352,
        lng: 77.6245
      });
      if (btnText) btnText.textContent = 'Use current location';
    },
    { timeout: 7000 }
  );
}

async function loadSavedAddressesInModal() {
  const listEl = document.getElementById('modal-saved-addresses');
  if (!listEl) return;

  if (!State.token) {
    listEl.innerHTML = `
      <p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 12px 0;">
        <i class="fa-solid fa-user-lock"></i> Log in to view your saved addresses
      </p>
    `;
    return;
  }

  try {
    const res = await apiRequest('/addresses');
    if (res.data && res.data.length > 0) {
      listEl.innerHTML = res.data.map(addr => `
        <div class="saved-address-item ${State.location.full === `${addr.street}, ${addr.area}` ? 'selected' : ''}" onclick='setDeliveryLocation(${JSON.stringify({
          name: `${addr.type}: ${addr.area}`,
          city: addr.city,
          full: `${addr.street}, ${addr.area}, ${addr.city} - ${addr.pincode}`,
          lat: addr.coordinates?.lat || 12.9716,
          lng: addr.coordinates?.lng || 77.5946
        })})'>
          <div class="address-type-icon">
            <i class="fa-solid ${addr.type === 'Home' ? 'fa-house' : (addr.type === 'Work' ? 'fa-briefcase' : 'fa-location-dot')}"></i>
          </div>
          <div class="address-info">
            <div class="address-tag-row">
              <span class="address-tag">${addr.type}</span>
              ${addr.isDefault ? '<span class="address-default-badge">DEFAULT</span>' : ''}
            </div>
            <p class="address-full">${addr.street}, ${addr.area}, ${addr.city} - ${addr.pincode}</p>
          </div>
        </div>
      `).join('');
    } else {
      listEl.innerHTML = `
        <p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 12px 0;">
          No saved addresses yet. Add one in your Profile!
        </p>
      `;
    }
  } catch (err) {
    console.error(err);
  }
}

// ==========================================
// AUTHENTICATION MODAL & LOGIC
// ==========================================

function openAuthModal(tab = 'login') {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    switchAuthTab(tab);
  }
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function switchAuthTab(tab) {
  const loginTab = document.getElementById('tab-login-btn');
  const regTab = document.getElementById('tab-register-btn');
  const loginForm = document.getElementById('auth-login-form');
  const regForm = document.getElementById('auth-register-form');

  if (tab === 'login') {
    loginTab?.classList.add('active');
    regTab?.classList.remove('active');
    if (loginForm) loginForm.style.display = 'block';
    if (regForm) regForm.style.display = 'none';
  } else {
    regTab?.classList.add('active');
    loginTab?.classList.remove('active');
    if (loginForm) loginForm.style.display = 'none';
    if (regForm) regForm.style.display = 'block';
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const submitBtn = document.getElementById('login-submit-btn');

  try {
    if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    State.token = res.token;
    State.user = res.user;
    saveState('savora_token', res.token);
    saveState('savora_user', res.user);

    showToast(`Welcome back, ${res.user.name}!`);
    closeAuthModal();
    updateAuthUI();
  } catch (err) {
    showToast(err.message || 'Login failed. Please check credentials.', 'error');
  } finally {
    if (submitBtn) submitBtn.innerHTML = 'Sign In';
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const phone = document.getElementById('reg-phone').value;
  const password = document.getElementById('reg-password').value;
  const submitBtn = document.getElementById('reg-submit-btn');

  try {
    if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, password })
    });

    State.token = res.token;
    State.user = res.user;
    saveState('savora_token', res.token);
    saveState('savora_user', res.user);

    showToast(`Welcome to SAVORA, ${res.user.name}!`);
    closeAuthModal();
    updateAuthUI();
  } catch (err) {
    showToast(err.message || 'Registration failed.', 'error');
  } finally {
    if (submitBtn) submitBtn.innerHTML = 'Create Account';
  }
}

function handleDemoLogin() {
  document.getElementById('login-email').value = 'demo@savora.com';
  document.getElementById('login-password').value = 'password123';
  document.getElementById('auth-login-form').dispatchEvent(new Event('submit'));
}

function logoutUser() {
  State.token = null;
  State.user = null;
  localStorage.removeItem('savora_token');
  localStorage.removeItem('savora_user');
  showToast('Logged out successfully');
  updateAuthUI();
  // If on protected page like profile, redirect home
  if (window.location.pathname.includes('profile') || window.location.pathname.includes('order')) {
    window.location.href = 'index.html';
  }
}

function updateAuthUI() {
  const authContainer = document.getElementById('nav-auth-container');
  if (!authContainer) return;

  if (State.user && State.token) {
    const initials = State.user.name ? State.user.name.charAt(0).toUpperCase() : 'U';
    authContainer.innerHTML = `
      <div class="user-profile-pill" onclick="window.location.href='profile.html'">
        <div class="user-avatar-mini">${initials}</div>
        <span>${State.user.name.split(' ')[0]}</span>
      </div>
    `;
  } else {
    authContainer.innerHTML = `
      <button class="auth-nav-btn" onclick="openAuthModal('login')">
        <i class="fa-solid fa-arrow-right-to-bracket"></i>
        <span>Sign In</span>
      </button>
    `;
  }
}

// ==========================================
// RESTAURANTS & FOOD MENU RENDERING
// ==========================================

async function loadRestaurants() {
  const grid = document.getElementById('restaurants-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
      <i class="fa-solid fa-spinner fa-spin fa-2x" style="color: var(--primary);"></i>
      <p style="margin-top: 10px; color: var(--text-secondary);">Loading gourmet restaurants...</p>
    </div>
  `;

  try {
    let url = `/restaurants?sort=${State.sortBy}`;
    if (State.activeCuisine && State.activeCuisine !== 'All') {
      url += `&cuisine=${encodeURIComponent(State.activeCuisine)}`;
    }
    if (State.onlyVeg) {
      url += `&isVeg=true`;
    }

    const res = await apiRequest(url);
    if (!res.data || res.data.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; background: white; border-radius: var(--radius-lg);">
          <i class="fa-solid fa-store-slash fa-3x" style="color: var(--text-muted); margin-bottom: 12px;"></i>
          <h3>No restaurants found</h3>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">Try changing your cuisine or dietary filters.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = res.data.map(rest => `
      <div class="restaurant-card" onclick="openRestaurantModal('${rest._id}')">
        <div class="rest-img-wrap">
          <img src="${rest.image}" alt="${rest.name}" loading="lazy" />
          <div class="rest-gradient-overlay"></div>
          ${rest.featured ? '<div class="rest-featured-badge">Featured</div>' : ''}
          <div class="rest-delivery-tag">
            <i class="fa-solid fa-stopwatch" style="color: var(--primary);"></i>
            <span>${rest.deliveryTime}</span>
          </div>
          ${rest.offer ? `
            <div class="rest-offer-tag">
              <i class="fa-solid fa-tags" style="color: #fbbf24;"></i>
              <span>${rest.offer}</span>
            </div>
          ` : ''}
        </div>
        <div class="rest-details">
          <div class="rest-title-row">
            <h3 class="rest-name">${rest.name}</h3>
            <div class="rest-rating-badge">
              <i class="fa-solid fa-star" style="font-size: 0.75rem;"></i>
              <span>${rest.rating.toFixed(1)}</span>
            </div>
          </div>
          <div class="rest-cuisines">${rest.cuisines.join(', ')}</div>
          <div class="rest-footer-row">
            <span class="rest-price">₹${rest.priceForTwo} for two</span>
            <span class="rest-area"><i class="fa-solid fa-location-dot"></i> ${rest.area.split(',')[0]}</span>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = `<div style="grid-column: 1/-1; color: var(--danger); text-align: center; padding: 20px;">Failed to load restaurants: ${err.message}</div>`;
  }
}

async function openRestaurantModal(restaurantId) {
  const modal = document.getElementById('restaurant-modal');
  const body = document.getElementById('restaurant-modal-body');
  if (!modal || !body) return;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  body.innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <i class="fa-solid fa-spinner fa-spin fa-2x" style="color: var(--primary);"></i>
      <p style="margin-top: 12px; color: var(--text-secondary);">Loading restaurant menu...</p>
    </div>
  `;

  try {
    const res = await apiRequest(`/restaurants/${restaurantId}`);
    const rest = res.restaurant;
    const categorizedMenu = res.categorizedMenu;
    const categories = res.categories;

    body.innerHTML = `
      <div class="rest-modal-hero">
        <img src="${rest.image}" alt="${rest.name}" />
        <div class="rest-modal-overlay">
          <div class="rest-modal-info">
            <h2 class="rest-modal-title">${rest.name}</h2>
            <div class="rest-modal-meta">
              <span><i class="fa-solid fa-star" style="color: #fbbf24;"></i> ${rest.rating.toFixed(1)} (${rest.ratingCount}+ ratings)</span>
              <span><i class="fa-solid fa-clock"></i> ${rest.deliveryTime}</span>
              <span><i class="fa-solid fa-indian-rupee-sign"></i> ₹${rest.priceForTwo} for two</span>
              <span><i class="fa-solid fa-location-dot"></i> ${rest.area}</span>
            </div>
          </div>
        </div>
      </div>

      <div style="padding: 24px;">
        <!-- Categories jump navigation -->
        <div class="category-scroller" style="margin-bottom: 24px;">
          ${categories.map(cat => `
            <a href="#cat-${cat.replace(/\s+/g, '-')}" class="cat-chip" onclick="event.preventDefault(); document.getElementById('cat-${cat.replace(/\s+/g, '-')}').scrollIntoView({ behavior: 'smooth' });">
              <span>${cat}</span>
              <span class="cat-count">${categorizedMenu[cat].length}</span>
            </a>
          `).join('')}
        </div>

        <!-- Categorized Menu Sections -->
        ${categories.map(cat => `
          <div class="menu-category-section" id="cat-${cat.replace(/\s+/g, '-')}">
            <div class="menu-cat-title">
              <span>${cat}</span>
              <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: normal;">${categorizedMenu[cat].length} items</span>
            </div>
            <div class="menu-items-list">
              ${categorizedMenu[cat].map(dish => {
                const itemJson = encodeURIComponent(JSON.stringify({
                  id: dish._id,
                  name: dish.name,
                  price: dish.price,
                  originalPrice: dish.originalPrice || dish.price,
                  image: dish.image,
                  itemType: 'food',
                  restaurantId: rest._id,
                  restaurantName: rest.name
                }));

                const inCart = State.cart.find(i => i.id === dish._id);

                return `
                  <div class="menu-item-row">
                    <div class="menu-item-details">
                      ${dish.isVeg ? '<div class="menu-veg-icon" title="Pure Veg"></div>' : '<div class="menu-nonveg-icon" title="Non-Veg"></div>'}
                      <h4 class="menu-item-title">${dish.name}</h4>
                      <div class="menu-item-price">₹${dish.price}</div>
                      ${dish.description ? `<p class="menu-item-desc">${dish.description}</p>` : ''}
                      ${dish.isBestseller ? '<span style="font-size: 0.72rem; font-weight: 700; color: #b45309; background: #fef3c7; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px;">★ BESTSELLER</span>' : ''}
                    </div>
                    <div class="menu-item-media">
                      <img src="${dish.image}" alt="${dish.name}" class="menu-item-img" loading="lazy" />
                      <div class="menu-item-add-container" data-product-id="${dish._id}" data-product-json="${itemJson}">
                        ${inCart ? `
                          <div class="qty-counter">
                            <button class="qty-btn" onclick="updateCartQuantity('${dish._id}', -1)"><i class="fa-solid fa-minus"></i></button>
                            <span class="qty-value">${inCart.quantity}</span>
                            <button class="qty-btn" onclick="updateCartQuantity('${dish._id}', 1)"><i class="fa-solid fa-plus"></i></button>
                          </div>
                        ` : `
                          <button class="add-btn" onclick='handleAddToCartFromAttr(this)'>ADD</button>
                        `}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    body.innerHTML = `<div style="color: var(--danger); text-align: center; padding: 40px;">Failed to load restaurant details: ${err.message}</div>`;
  }
}

function closeRestaurantModal() {
  const modal = document.getElementById('restaurant-modal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// ==========================================
// SAVORA FRESH GROCERY MARKETPLACE
// ==========================================

async function loadGroceryCategories() {
  const scroller = document.getElementById('grocery-category-scroller');
  if (!scroller) return;

  try {
    const res = await apiRequest('/products/categories');
    if (res.data) {
      scroller.innerHTML = res.data.map(cat => `
        <button class="cat-chip ${State.activeCategory === cat.name ? 'active' : ''}" onclick="selectGroceryCategory('${cat.name}', this)">
          <i class="fa-solid ${cat.icon || 'fa-basket-shopping'}"></i>
          <span>${cat.name}</span>
          <span class="cat-count">${cat.count}</span>
        </button>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading grocery categories:', err);
  }
}

function selectGroceryCategory(catName, btnEl) {
  State.activeCategory = catName;
  document.querySelectorAll('#grocery-category-scroller .cat-chip').forEach(c => c.classList.remove('active'));
  btnEl?.classList.add('active');
  loadGroceryProducts();
}

async function loadGroceryProducts() {
  const grid = document.getElementById('grocery-products-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
      <i class="fa-solid fa-spinner fa-spin fa-2x" style="color: var(--primary);"></i>
      <p style="margin-top: 10px; color: var(--text-secondary);">Stocking fresh shelves...</p>
    </div>
  `;

  try {
    let url = `/products?category=${encodeURIComponent(State.activeCategory)}`;
    const res = await apiRequest(url);

    if (!res.data || res.data.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; background: white; border-radius: var(--radius-lg);">
          <i class="fa-solid fa-basket-shopping fa-3x" style="color: var(--text-muted); margin-bottom: 12px;"></i>
          <h3>No products found in this category</h3>
        </div>
      `;
      return;
    }

    grid.innerHTML = res.data.map(prod => {
      const itemJson = encodeURIComponent(JSON.stringify({
        id: prod._id,
        name: prod.name,
        price: prod.price,
        originalPrice: prod.originalPrice,
        image: prod.image,
        unit: prod.unit,
        itemType: 'grocery',
        restaurantName: 'SAVORA Fresh Mart'
      }));

      const inCart = State.cart.find(i => i.id === prod._id);

      return `
        <div class="product-card">
          ${prod.discount > 0 ? `<div class="product-discount-tag">${prod.discount}% OFF</div>` : ''}
          <div class="product-image-wrap">
            <img src="${prod.image}" alt="${prod.name}" loading="lazy" />
          </div>
          <span class="product-unit-badge">${prod.unit}</span>
          <h4 class="product-name" title="${prod.name}">${prod.name}</h4>
          <div class="product-rating">
            <i class="fa-solid fa-star" style="font-size: 0.75rem;"></i>
            <span>${prod.rating.toFixed(1)}</span>
            <span style="color: var(--text-muted); font-size: 0.72rem; font-weight: normal;">(${prod.ratingCount})</span>
          </div>
          <div class="product-card-footer">
            <div class="product-pricing">
              <span class="product-price">₹${prod.price}</span>
              ${prod.originalPrice > prod.price ? `<span class="product-original-price">₹${prod.originalPrice}</span>` : ''}
            </div>
            <div data-product-id="${prod._id}" data-product-json="${itemJson}">
              ${inCart ? `
                <div class="qty-counter">
                  <button class="qty-btn" onclick="updateCartQuantity('${prod._id}', -1)"><i class="fa-solid fa-minus"></i></button>
                  <span class="qty-value">${inCart.quantity}</span>
                  <button class="qty-btn" onclick="updateCartQuantity('${prod._id}', 1)"><i class="fa-solid fa-plus"></i></button>
                </div>
              ` : `
                <button class="add-btn" onclick='handleAddToCartFromAttr(this)'>ADD</button>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    grid.innerHTML = `<div style="grid-column: 1/-1; color: var(--danger); text-align: center; padding: 20px;">Failed to load groceries: ${err.message}</div>`;
  }
}

// ==========================================
// RECOMMENDED FOOD ITEMS CAROUSEL / GRID
// ==========================================

async function loadRecommendedDishes() {
  const grid = document.getElementById('recommended-food-grid');
  if (!grid) return;

  try {
    const res = await apiRequest('/restaurants/dishes/recommended');
    if (res.data) {
      grid.innerHTML = res.data.map(dish => {
        const itemJson = encodeURIComponent(JSON.stringify({
          id: dish._id,
          name: dish.name,
          price: dish.price,
          originalPrice: dish.originalPrice || dish.price,
          image: dish.image,
          itemType: 'food',
          restaurantId: dish.restaurantId?._id,
          restaurantName: dish.restaurantId?.name || 'SAVORA Kitchen'
        }));

        const inCart = State.cart.find(i => i.id === dish._id);

        return `
          <div class="food-dish-card">
            <div class="food-dish-info">
              <div class="food-veg-nonveg">
                ${dish.isVeg ? '<div class="menu-veg-icon" title="Veg"></div>' : '<div class="menu-nonveg-icon" title="Non-Veg"></div>'}
              </div>
              <h4 class="food-dish-name">${dish.name}</h4>
              <p class="food-restaurant-name"><i class="fa-solid fa-store" style="font-size: 0.72rem;"></i> ${dish.restaurantId?.name || 'SAVORA Kitchen'}</p>
              <div class="food-dish-price">₹${dish.price}</div>
            </div>
            <div class="food-dish-img-box">
              <img src="${dish.image}" alt="${dish.name}" loading="lazy" />
              <div data-product-id="${dish._id}" data-product-json="${itemJson}">
                ${inCart ? `
                  <div class="qty-counter" style="position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); width: 85%;">
                    <button class="qty-btn" onclick="updateCartQuantity('${dish._id}', -1)"><i class="fa-solid fa-minus"></i></button>
                    <span class="qty-value">${inCart.quantity}</span>
                    <button class="qty-btn" onclick="updateCartQuantity('${dish._id}', 1)"><i class="fa-solid fa-plus"></i></button>
                  </div>
                ` : `
                  <button class="food-dish-add-btn" onclick='handleAddToCartFromAttr(this)'>ADD</button>
                `}
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Failed to load recommended dishes:', err);
  }
}

// ==========================================
// GLOBAL SEARCH CONTROLLER
// ==========================================

let searchDebounceTimeout = null;

function handleGlobalSearchInput(val) {
  clearTimeout(searchDebounceTimeout);
  const clearBtn = document.getElementById('search-clear-btn');
  const dropdown = document.getElementById('search-results-dropdown');

  if (clearBtn) {
    clearBtn.style.display = val.trim().length > 0 ? 'block' : 'none';
  }

  if (!val || val.trim().length < 2) {
    if (dropdown) dropdown.style.display = 'none';
    return;
  }

  searchDebounceTimeout = setTimeout(async () => {
    try {
      const res = await apiRequest(`/search?q=${encodeURIComponent(val.trim())}`);
      renderSearchResults(res, val.trim());
    } catch (e) {
      console.error(e);
    }
  }, 300);
}

function clearSearch() {
  const input = document.getElementById('global-search-input');
  if (input) input.value = '';
  const clearBtn = document.getElementById('search-clear-btn');
  if (clearBtn) clearBtn.style.display = 'none';
  const dropdown = document.getElementById('search-results-dropdown');
  if (dropdown) dropdown.style.display = 'none';
}

function renderSearchResults(res, query) {
  let dropdown = document.getElementById('search-results-dropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.id = 'search-results-dropdown';
    dropdown.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 8px;
      background: #ffffff;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-xl);
      max-height: 480px;
      overflow-y: auto;
      z-index: 1500;
      padding: 16px;
    `;
    const wrapper = document.querySelector('.search-wrapper');
    if (wrapper) wrapper.appendChild(dropdown);
  }

  dropdown.style.display = 'block';

  if (res.totalCount === 0) {
    dropdown.innerHTML = `
      <div style="text-align: center; padding: 24px; color: var(--text-secondary);">
        <i class="fa-solid fa-magnifying-glass fa-2x" style="color: var(--text-muted); margin-bottom: 8px;"></i>
        <p>No results found for "<strong>${query}</strong>"</p>
      </div>
    `;
    return;
  }

  let html = '';

  // Restaurants Match
  if (res.restaurants && res.restaurants.length > 0) {
    html += `
      <div style="font-size: 0.8rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.05em;">Restaurants (${res.restaurants.length})</div>
      <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
        ${res.restaurants.map(r => `
          <div style="display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: var(--radius-sm); cursor: pointer; transition: background 0.15s;" onmouseover="this.style.background='var(--bg-surface)'" onmouseout="this.style.background='transparent'" onclick="openRestaurantModal('${r._id}'); document.getElementById('search-results-dropdown').style.display='none';">
            <img src="${r.image}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover;" />
            <div style="flex: 1;">
              <h5 style="font-size: 0.92rem; font-weight: 700;">${r.name}</h5>
              <p style="font-size: 0.78rem; color: var(--text-secondary);">${r.cuisines.join(', ')} • ${r.deliveryTime}</p>
            </div>
            <div class="rest-rating-badge" style="font-size: 0.75rem;">★ ${r.rating.toFixed(1)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Food Items Match
  if (res.foodItems && res.foodItems.length > 0) {
    html += `
      <div style="font-size: 0.8rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.05em;">Dishes (${res.foodItems.length})</div>
      <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
        ${res.foodItems.map(d => `
          <div style="display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: var(--radius-sm); cursor: pointer; transition: background 0.15s;" onmouseover="this.style.background='var(--bg-surface)'" onmouseout="this.style.background='transparent'" onclick="openRestaurantModal('${d.restaurantId?._id}'); document.getElementById('search-results-dropdown').style.display='none';">
            <img src="${d.image}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover;" />
            <div style="flex: 1;">
              <h5 style="font-size: 0.92rem; font-weight: 700;">${d.name}</h5>
              <p style="font-size: 0.78rem; color: var(--text-secondary);">${d.restaurantId?.name || 'Restaurant'} • ₹${d.price}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Grocery Products Match
  if (res.products && res.products.length > 0) {
    html += `
      <div style="font-size: 0.8rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.05em;">SAVORA Fresh Groceries (${res.products.length})</div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${res.products.map(p => `
          <div style="display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: var(--radius-sm); transition: background 0.15s;" onmouseover="this.style.background='var(--bg-surface)'" onmouseout="this.style.background='transparent'">
            <img src="${p.image}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover;" />
            <div style="flex: 1;">
              <h5 style="font-size: 0.92rem; font-weight: 700;">${p.name}</h5>
              <p style="font-size: 0.78rem; color: var(--text-secondary);">${p.unit} • ₹${p.price}</p>
            </div>
            <button class="add-btn" style="padding: 4px 12px; font-size: 0.8rem;" onclick='addToCart(${JSON.stringify({
              id: p._id,
              name: p.name,
              price: p.price,
              originalPrice: p.originalPrice,
              image: p.image,
              unit: p.unit,
              itemType: 'grocery',
              restaurantName: 'SAVORA Fresh Mart'
            })}); document.getElementById("search-results-dropdown").style.display="none";'>ADD</button>
          </div>
        `).join('')}
      </div>
    `;
  }

  dropdown.innerHTML = html;
}

// Close search dropdown on click outside
document.addEventListener('click', (e) => {
  const searchWrapper = document.querySelector('.search-wrapper');
  const dropdown = document.getElementById('search-results-dropdown');
  if (searchWrapper && !searchWrapper.contains(e.target) && dropdown) {
    dropdown.style.display = 'none';
  }
});

// ==========================================
// FILTERS & CUISINES INTERACTION
// ==========================================

function toggleVegOnly() {
  State.onlyVeg = !State.onlyVeg;
  const vegBtn = document.getElementById('veg-only-filter-btn');
  if (vegBtn) {
    vegBtn.classList.toggle('active', State.onlyVeg);
  }
  loadRestaurants();
}

function handleSortChange(sortValue) {
  State.sortBy = sortValue;
  loadRestaurants();
}

function selectCuisine(cuisineName, cardEl) {
  State.activeCuisine = cuisineName;
  document.querySelectorAll('.cuisine-card').forEach(c => c.classList.remove('active'));
  cardEl?.classList.add('active');
  loadRestaurants();
}

// ==========================================
// INITIALIZATION ON DOM CONTENT LOADED
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  updateLocationHeader();
  updateAuthUI();
  updateCartUI();

  // If on index.html, load core components
  if (document.getElementById('restaurants-grid')) {
    loadRestaurants();
    loadGroceryCategories();
    loadGroceryProducts();
    loadRecommendedDishes();
  }
});
