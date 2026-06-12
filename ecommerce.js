const SurgeStore = (() => {
  const WHATSAPP = "256776036580";
  const ADMIN_PASSWORD = "Nelly@20";
  const PRODUCTS_KEY = "surgeAdminProducts";
  const RECENT_SEARCHES_KEY = "surgeRecentSearches";
  const SETTINGS_KEY = "surgeSettings";
  const ORDERS_KEY = "surgeOrders";
  const SERVICE_INQUIRIES_KEY = "surgeServiceInquiries";
  const SUPABASE_CACHE_KEY = "surgeSupabaseProductsCache";
  const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const SUPABASE_CONFIG = {
    // Paste keys in supabase-config.js. Never use a service role/private key in frontend code.
    url: typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "",
    anonKey: typeof SUPABASE_ANON_KEY !== "undefined" ? SUPABASE_ANON_KEY : "",
    // Optional: create this public bucket in Supabase Storage if you want admin image uploads.
    storageBucket: "product-images",
  };
  /*
    Supabase security note:
    This frontend must only use the anon public key. Configure Row Level Security in Supabase so
    public visitors can read active products and create orders/service inquiries, while only your
    authenticated admin role can create/update/delete products, read orders, read inquiries, and update settings.
  */
  const DEFAULT_SETTINGS = {
    businessName: "Surge Tech UG",
    phone: "0776036580",
    whatsapp: WHATSAPP,
    location: "Kampala, Uganda",
    deliveryNote: "Delivery in Kampala and upcountry delivery can be arranged after confirmation.",
    warrantyNote: "Warranty depends on product condition and is confirmed before purchase.",
    returnPolicy: "Returns are reviewed based on product condition and issue reported.",
    facebook: "https://facebook.com/",
    instagram: "https://instagram.com/",
    tiktok: "https://tiktok.com/",
    x: "https://x.com/",
    youtube: "https://youtube.com/",
  };
  const fallbackImages = {
    phones: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=80",
    laptops: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
    macbooks: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
    accessories: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=900&q=80",
    services: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    default: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
  };

  const state = {
    products: [],
    orders: [],
    serviceInquiries: [],
    settings: { ...DEFAULT_SETTINGS },
    supabaseOnline: false,
    cart: JSON.parse(localStorage.getItem("surgeCart") || "[]"),
    wishlist: JSON.parse(localStorage.getItem("surgeWishlist") || "[]"),
    recent: JSON.parse(localStorage.getItem("surgeRecent") || "[]"),
    slide: 0,
    filters: {
      category: "all",
      brand: "all",
      condition: "all",
      sort: "popular",
      query: "",
      min: "",
      max: "",
      available: false,
    },
  };
  let supabaseClientPromise = null;

  const parsePrice = (value) => Number(String(value || "").replace(/[^0-9]/g, "")) || 0;
  const money = (value) => `UGX ${Number(value || 0).toLocaleString("en-US")}`;
  const productById = (id) => state.products.find((product) => product.id === id);
  const storefrontProducts = () => state.products.filter((product) => product.active !== false);
  const whatsappIcon = '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16.04 3.2A12.73 12.73 0 0 0 5.12 22.45L3.2 29l6.72-1.77A12.73 12.73 0 1 0 16.04 3.2Zm0 2.32a10.4 10.4 0 0 1 8.84 15.88 10.4 10.4 0 0 1-13.88 3.7l-.48-.28-3.98 1.05 1.06-3.86-.32-.5A10.41 10.41 0 0 1 16.04 5.52Zm-4.3 5.54c-.24 0-.63.09-.96.45-.33.36-1.26 1.23-1.26 3s1.29 3.48 1.47 3.72c.18.24 2.49 3.98 6.16 5.42 3.04 1.2 3.66.96 4.32.9.66-.06 2.13-.87 2.43-1.71.3-.84.3-1.56.21-1.71-.09-.15-.33-.24-.69-.42-.36-.18-2.13-1.05-2.46-1.17-.33-.12-.57-.18-.81.18-.24.36-.93 1.17-1.14 1.41-.21.24-.42.27-.78.09-.36-.18-1.52-.56-2.9-1.79-1.07-.95-1.79-2.13-2-2.49-.21-.36-.02-.55.16-.73.16-.16.36-.42.54-.63.18-.21.24-.36.36-.6.12-.24.06-.45-.03-.63-.09-.18-.81-1.95-1.11-2.67-.29-.7-.59-.6-.81-.61h-.69Z"/></svg>';
  const titleFor = (category) =>
    ({ phones: "Phones", laptops: "Laptops", macbooks: "MacBooks", accessories: "Accessories", services: "Services", all: "Products" }[category] || "Products");
  const cleanPhone = (value) => String(value || "").replace(/[^\d+]/g, "");
  const supabaseReady = () => Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
  const currentPageName = () => (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const pageHrefForCategory = {
    all: "index.html",
    home: "index.html",
    phones: "Phones.html",
    laptops: "Laptops.html",
    macbooks: "Macbooks.html",
    accessories: "accessories.html",
    services: "services.html",
    cart: "cart.html",
    wishlist: "wishlist.html",
    checkout: "checkout.html",
  };
  const isActiveHref = (href) => currentPageName() === href.toLowerCase();
  const navClass = (href) => (isActiveHref(href) ? ' class="active"' : "");
  const selectCurrentCategory = () => pageHrefForCategory[document.querySelector("[data-page]")?.dataset.page || "home"] || "index.html";
  const loadSupabaseClient = async () => {
    if (!supabaseReady()) return null;
    if (supabaseClientPromise) return supabaseClientPromise;
    supabaseClientPromise = new Promise((resolve) => {
      const create = () => {
        try {
          resolve(window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey));
        } catch {
          resolve(null);
        }
      };
      if (window.supabase?.createClient) {
        create();
        return;
      }
      const script = document.createElement("script");
      script.src = SUPABASE_CDN;
      script.onload = create;
      script.onerror = () => resolve(null);
      (document.head || document.body).appendChild(script);
    });
    return supabaseClientPromise;
  };
  const loadSettings = () => {
    try {
      state.settings = { ...DEFAULT_SETTINGS, ...state.settings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
      return state.settings;
    } catch {
      state.settings = { ...DEFAULT_SETTINGS, ...state.settings };
      return state.settings;
    }
  };
  const validImageSrc = (src) => {
    const value = String(src || "").trim();
    return value && !/^(javascript:|#)/i.test(value);
  };
  const imageFor = (product) => {
    const first = Array.isArray(product?.images) ? product.images.find(validImageSrc) : "";
    return first || fallbackImages[product?.category] || fallbackImages.default;
  };
  const imagesFor = (product) => {
    const images = Array.isArray(product?.images) ? product.images.filter(validImageSrc) : [];
    return images.length ? images : [fallbackImages[product?.category] || fallbackImages.default];
  };
  const imageFallbackFor = (product) => fallbackImages[product?.category] || fallbackImages.default;
  const brandLabel = (brand) => {
    const raw = String(brand || "Other").trim();
    const key = raw.toLowerCase().replace(/\s+/g, " ");
    return {
      hp: "HP",
      dell: "Dell",
      lenovo: "Lenovo",
      asus: "Asus",
      apple: "Apple",
      samsung: "Samsung",
      tecno: "Tecno",
      infinix: "Infinix",
      oraimo: "Oraimo",
      anker: "Anker",
      jbl: "JBL",
      logitech: "Logitech",
      redmi: "Redmi/Xiaomi",
      xiaomi: "Redmi/Xiaomi",
      "redmi/xiaomi": "Redmi/Xiaomi",
    }[key] || raw.replace(/\b\w/g, (char) => char.toUpperCase());
  };
  const shortDetails = (product) => {
    const specs = specList(product).slice(0, 3).join(" / ");
    return specs || product?.shortDescription || product?.description || "Available from Surge Tech UG.";
  };
  const stars = (rating = 4.5) => {
    const full = Math.max(0, Math.min(5, Math.round(rating)));
    return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
  };
  const discountFor = (product) => {
    const price = parsePrice(product.price);
    const oldPrice = parsePrice(product.oldPrice || product.originalPrice);
    return oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
  };
  const whatsAppLink = (product, customMessage) => {
    const productSpecs = product ? specList(product).slice(0, 4).join(" / ") : "";
    const text =
      customMessage ||
      (product
        ? `Hello Surge Tech UG, I am interested in ${product.name} priced at ${displayPrice(product)}.${productSpecs ? ` Specs: ${productSpecs}.` : ""} Is it available?`
        : "Hello Surge Tech UG, I need help with your products and services.");
    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
  };
  const orderWhatsAppMessage = (order) => {
    const customer = order.customer || {};
    const lines = (order.items || [])
      .map((line, index) => [
        `${index + 1}. ${line.name}`,
        `   Qty: ${line.qty}`,
        `   Price: ${money(line.lineTotal)}`,
      ].join("\n"))
      .join("\n\n");
    const customerLines = [
      "Hello Surge Tech UG, I want to confirm my order.",
      "",
      `Order No: ${order.orderNumber || "ST-ORDER"}`,
      "",
      "Customer:",
      `Name: ${customer.name || ""}`,
      `Phone: ${customer.phone || ""}`,
      `Location: ${customer.location || ""}`,
      `Delivery Details: ${customer.address || ""}`,
      `Delivery Method: ${customer.deliveryMethod || ""}`,
    ];
    if (customer.secondPhone) customerLines.push(`Second Phone: ${customer.secondPhone}`);
    if (customer.email) customerLines.push(`Email: ${customer.email}`);
    if (customer.payment) customerLines.push(`Payment Method: ${customer.payment}`);
    if (customer.notes) customerLines.push(`Notes: ${customer.notes}`);
    return [
      ...customerLines,
      "",
      "Items:",
      lines || "No products listed",
      "",
      "Total:",
      money(order.total),
      "",
      "Please confirm availability and delivery.",
    ].join("\n");
  };
  const save = () => {
    localStorage.setItem("surgeCart", JSON.stringify(state.cart));
    localStorage.setItem("surgeWishlist", JSON.stringify(state.wishlist));
    localStorage.setItem("surgeRecent", JSON.stringify(state.recent));
  };
  const cartCount = () => state.cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = () => state.cart.reduce((sum, item) => sum + parsePrice(productById(item.id)?.price) * item.qty, 0);
  const loadRecentSearches = () => {
    try {
      const searches = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
      return Array.isArray(searches) ? searches.filter(Boolean).slice(0, 8) : [];
    } catch {
      return [];
    }
  };
  const saveRecentSearch = (query) => {
    const clean = String(query || "").trim();
    if (!clean) return;
    const searches = [clean, ...loadRecentSearches().filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  };

  const categoryKey = (value) => String(value || "accessories").toLowerCase().replace(/\s+/g, "");
  const displayPrice = (product) => money(parsePrice(product?.price));
  const displayOldPrice = (product) => parsePrice(product?.oldPrice || product?.originalPrice) ? money(parsePrice(product?.oldPrice || product?.originalPrice)) : "";
  const todayStamp = () => new Date().toISOString().slice(0, 10);
  const slugify = (value) => String(value || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const specList = (product) => {
    if (Array.isArray(product?.specs)) return product.specs;
    const specs = product?.specs || {};
    return Object.values(specs).filter(Boolean).slice(0, 6);
  };
  const normalizeCategory = (value) => ({ phones: "phones", phone: "phones", laptops: "laptops", laptop: "laptops", macbooks: "macbooks", macbook: "macbooks", accessories: "accessories", accessory: "accessories", services: "services", service: "services" }[categoryKey(value)] || categoryKey(value));
  const titleCase = (value) => String(value || "").replace(/\b\w/g, (char) => char.toUpperCase());
  const statusForStock = (stock) => Number(stock || 0) <= 0 ? "Out of Stock" : Number(stock || 0) <= 3 ? "Low Stock" : "In Stock";
  const allowedCategories = ["phones", "laptops", "macbooks", "accessories", "services"];
  const loadLocalAdminProducts = () => {
    try {
      const data = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || "null");
      const products = Array.isArray(data) ? data : Array.isArray(data?.products) ? data.products : [];
      return products.length ? normalizeProducts(products) : [];
    } catch (error) {
      console.warn("Could not read local admin products.", error);
      return [];
    }
  };
  const hasLocalAdminProducts = () => loadLocalAdminProducts().length > 0;
  const productsForPage = (category, products = storefrontProducts()) => {
    if (category === "all") return products;
    return products.filter((product) => product.category === category);
  };

  const normalizeProducts = (products) => (products || []).filter(Boolean).map((product) => {
    const category = allowedCategories.includes(normalizeCategory(product.category)) ? normalizeCategory(product.category) : "accessories";
    const price = parsePrice(product.price);
    const oldPrice = parsePrice(product.oldPrice || product.originalPrice || product.price);
    const specs = Array.isArray(product.specs)
      ? {
          processor: product.specs.find((item) => /core|apple|processor/i.test(item)) || "",
          ram: (product.specs.join(" ").match(/(\d+GB)\s*RAM/i) || [])[1] || "",
          storage: (product.specs.join(" ").match(/(\d+GB|1TB)\s*(SSD|storage)?/i) || [])[0] || "",
          display: product.specs.find((item) => /inch|display|retina|amoled|oled/i.test(item)) || "",
          graphics: "",
          battery: product.specs.find((item) => /battery|mah/i.test(item)) || "Good battery life",
        }
      : (product.specs || {});
    const stock = Number.isFinite(Number(product.stock)) ? Number(product.stock) : 1;
    return {
      id: product.id || product.slug || slugify(product.name),
      localId: product.localId || product.local_id || product.id || product.slug || slugify(product.name),
      dbId: product.dbId || product.db_id || product.uuid || "",
      slug: product.slug || product.id || slugify(product.name),
      name: product.name || "Untitled Product",
      category,
      subcategory: product.subcategory || titleFor(category),
      brand: product.brand || "Surge Tech",
      model: product.model || product.name || "",
      condition: product.condition || "Brand New",
      price: Number.isFinite(price) ? price : 0,
      oldPrice,
      originalPrice: oldPrice,
      currency: product.currency || "UGX",
      stock,
      status: product.status || statusForStock(stock),
      rating: Number(product.rating || 4.5),
      reviews: Number(product.reviews || 0),
      images: (Array.isArray(product.images) ? product.images : product.image ? [product.image] : []).map((item) => String(item || "").trim()).filter(validImageSrc),
      colors: Array.isArray(product.colors) ? product.colors : [],
      badge: product.badge || "",
      shortDescription: product.shortDescription || product.description || "Available from Surge Tech UG.",
      description: product.description || product.shortDescription || "Available from Surge Tech UG.",
      specs,
      tags: Array.isArray(product.tags) ? product.tags : String(product.tags || "").split(/\\n|,/).map((item) => item.trim()).filter(Boolean),
      featured: Boolean(product.featured),
      topSelling: Boolean(product.topSelling),
      topRated: Boolean(product.topRated || product.top_rated),
      serviceGroup: product.serviceGroup || "",
      active: product.active !== false,
      whatsappTemplate: product.whatsappTemplate || "",
      createdAt: product.createdAt || todayStamp(),
      updatedAt: product.updatedAt || todayStamp(),
    };
  });

  const rowToProduct = (row) => {
    const specs = row.specs && typeof row.specs === "object" && !Array.isArray(row.specs) ? row.specs : {};
    return normalizeProducts([{
      id: row.local_id || row.slug || row.id,
      localId: row.local_id || row.slug || row.id,
      dbId: row.id,
      slug: row.slug || row.id,
      name: row.name,
      category: row.category,
      subcategory: row.subcategory,
      brand: row.brand,
      model: row.model,
      condition: row.condition,
      price: row.price,
      oldPrice: row.old_price,
      originalPrice: row.old_price,
      currency: row.currency || "UGX",
      stock: row.stock,
      status: row.status,
      rating: row.rating,
      reviews: row.reviews,
      description: row.description,
      shortDescription: row.short_description || row.description,
      specs,
      images: Array.isArray(row.images) ? row.images : [],
      tags: Array.isArray(row.tags) ? row.tags : [],
      featured: row.featured,
      topSelling: row.top_selling,
      active: row.active,
      serviceGroup: row.service_group || "",
      whatsappTemplate: row.whatsapp_template || "",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }])[0];
  };

  const productToSupabaseRow = (product) => {
    const normalized = normalizeProducts([product])[0];
    const specs = normalized.specs || {};
    return {
      name: normalized.name,
      local_id: normalized.localId || normalized.id || normalized.slug || slugify(normalized.name),
      slug: normalized.slug || normalized.id || slugify(normalized.name),
      category: normalized.category,
      subcategory: normalized.subcategory || titleFor(normalized.category),
      brand: normalized.brand,
      model: normalized.model,
      condition: normalized.condition,
      price: normalized.price,
      old_price: normalized.oldPrice || null,
      currency: normalized.currency || "UGX",
      stock: normalized.stock,
      status: normalized.status || statusForStock(normalized.stock),
      rating: normalized.rating || 4.5,
      reviews: normalized.reviews || 0,
      short_description: normalized.shortDescription || "",
      description: normalized.description,
      specs,
      tags: normalized.tags || [],
      images: Array.isArray(normalized.images) ? normalized.images.filter(validImageSrc) : [],
      featured: Boolean(normalized.featured),
      top_selling: Boolean(normalized.topSelling),
      service_group: normalized.serviceGroup || "",
      active: normalized.active !== false,
      whatsapp_template: normalized.whatsappTemplate || "",
      updated_at: new Date().toISOString(),
    };
  };

  async function loadProducts(includeInactive = false) {
    let products = [];
    const supabase = await loadSupabaseClient();
    if (supabase) {
      try {
        let query = supabase.from("products").select("*").order("created_at", { ascending: false });
        if (!includeInactive) query = query.eq("active", true);
        const { data, error } = await query;
        if (error) throw error;
        products = (data || []).map(rowToProduct);
        state.supabaseOnline = true;
        if (products.length) {
          localStorage.setItem(SUPABASE_CACHE_KEY, JSON.stringify(products));
          console.info("Surge products loaded from Supabase.");
        } else {
          console.warn("Supabase returned no products. Falling back to localStorage/products.json backup.");
        }
      } catch (error) {
        state.supabaseOnline = false;
        console.warn("Supabase product load failed. Falling back to localStorage.", error);
      }
    }
    if (!products.length) {
      const localProducts = loadLocalAdminProducts();
      if (localProducts.length) {
        products = localProducts;
        console.info("Surge products loaded from localStorage.");
      }
    }
    if (!products.length) {
      try {
        const response = await fetch("products.json");
        const data = await response.json();
        if (Array.isArray(data.products)) products = data.products;
        else if (Array.isArray(data)) products = data;
        console.info("Surge products loaded from products.json.");
      } catch (error) {
        console.warn("products.json load failed. Falling back to products-data.js.", error);
        products = Array.isArray(window.SURGE_PRODUCTS) ? window.SURGE_PRODUCTS : [];
        console.info("Surge products loaded from products-data.js fallback.");
      }
    }
    state.products = normalizeProducts(products);
    window.SURGE_ACTIVE_PRODUCTS = state.products;
    return state.products;
  }

  function saveAdminProducts(products) {
    state.products = normalizeProducts(products);
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(state.products));
    localStorage.setItem(SUPABASE_CACHE_KEY, JSON.stringify(state.products));
    window.SURGE_ACTIVE_PRODUCTS = state.products;
    state.cart = state.cart.filter((item) => productById(item.id));
    state.wishlist = state.wishlist.filter((id) => productById(id));
    save();
    updateBadges();
    renderCartDrawer();
    return state.products;
  }

  async function saveAdminProduct(product) {
    const normalized = normalizeProducts([product])[0];
    const supabase = await loadSupabaseClient();
    if (supabase) {
      const row = productToSupabaseRow(normalized);
      const request = normalized.dbId
        ? supabase.from("products").update(row).eq("id", normalized.dbId).select().single()
        : supabase.from("products").upsert(row, { onConflict: "local_id" }).select().single();
      const { data, error } = await request;
      if (error) throw error;
      state.supabaseOnline = true;
      const saved = rowToProduct(data);
      const rest = state.products.filter((item) => item.dbId !== saved.dbId && item.id !== saved.id);
      saveAdminProducts([saved, ...rest]);
      return saved;
    }
    const rest = state.products.filter((item) => item.id !== normalized.id);
    saveAdminProducts([normalized, ...rest]);
    return normalized;
  }

  async function deactivateAdminProduct(product) {
    const supabase = await loadSupabaseClient();
    if (supabase && product?.dbId) {
      const { error } = await supabase.from("products").update({ active: false, updated_at: new Date().toISOString() }).eq("id", product.dbId);
      if (error) throw error;
      state.supabaseOnline = true;
    }
    saveAdminProducts(state.products.map((item) => item.id === product.id ? { ...item, active: false, updatedAt: todayStamp() } : item));
  }

  function resetAdminProducts(confirmed = false) {
    if (!confirmed) {
      console.warn("Reset blocked. Export local products first and confirm from the admin reset button.");
      return Promise.resolve(state.products);
    }
    localStorage.removeItem(PRODUCTS_KEY);
    return loadProducts(document.querySelector('[data-page="admin"]'));
  }

  function toast(message) {
    let stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      document.body.appendChild(stack);
    }
    const item = document.createElement("div");
    item.className = "toast-msg";
    item.textContent = message;
    stack.appendChild(item);
    setTimeout(() => item.remove(), 2600);
  }

  function updateBadges() {
    document.querySelectorAll("[data-cart-count]").forEach((el) => (el.textContent = cartCount()));
    document.querySelectorAll("[data-wish-count]").forEach((el) => (el.textContent = state.wishlist.length));
  }

  function addToCart(id, qty = 1) {
    const product = productById(id);
    if (!product) return;
    const existing = state.cart.find((item) => item.id === id);
    if (existing) existing.qty += qty;
    else state.cart.push({ id, qty });
    save();
    renderCartDrawer();
    updateBadges();
    toast(`${product.name} added to cart`);
  }

  function setCartQty(id, qty) {
    const item = state.cart.find((line) => line.id === id);
    if (!item) return;
    item.qty = Math.max(1, qty);
    save();
    renderCartDrawer();
    updateBadges();
  }

  function removeFromCart(id) {
    state.cart = state.cart.filter((item) => item.id !== id);
    save();
    renderCartDrawer();
    updateBadges();
    toast("Removed from cart");
  }

  function toggleWishlist(id) {
    const product = productById(id);
    if (!product) return;
    state.wishlist = state.wishlist.includes(id)
      ? state.wishlist.filter((item) => item !== id)
      : [...state.wishlist, id];
    save();
    document.querySelectorAll(`[data-wish="${id}"]`).forEach((button) => button.classList.toggle("active", state.wishlist.includes(id)));
    updateBadges();
    toast(state.wishlist.includes(id) ? "Saved to wishlist" : "Removed from wishlist");
  }

  function productCard(product) {
    const discount = discountFor(product);
    const activeWish = state.wishlist.includes(product.id) ? "active" : "";
    const fallback = imageFallbackFor(product);
    return `
      <article class="product-card ${product.category === "services" ? "service-card" : ""}">
        <button class="wishlist-btn ${activeWish}" data-wish="${product.id}" onclick="event.stopPropagation(); SurgeStore.toggleWishlist('${product.id}')" aria-label="Save ${product.name}">♡</button>
        <a class="product-media" href="product.html?id=${encodeURIComponent(product.id)}" aria-label="View ${product.name}">
          <img loading="lazy" src="${imageFor(product)}" onerror="this.onerror=null;this.src='${fallback}'" alt="${product.name}">
          ${discount ? `<span class="discount-tag">-${discount}%</span>` : ""}
          <span class="stock-pill">${(product.stock || 0) > 0 ? "In stock" : "Pre-order"}</span>
        </a>
        <a class="card-wa" href="${whatsAppLink(product)}" target="_blank" rel="noopener" aria-label="Ask about ${product.name} on WhatsApp">${whatsappIcon}</a>
        <div class="product-body">
          <a class="product-name product-name-link" href="product.html?id=${encodeURIComponent(product.id)}">${product.name}</a>
          <div class="product-specs">${shortDetails(product)}</div>
          <div class="rating"><span>${stars(product.rating)}</span> <small>${product.rating || 4.5} (${product.reviews || 0})</small></div>
          <div class="price-box">
            <div class="price">${displayPrice(product)}</div>
            <div class="price-meta"><span class="old-price">${displayOldPrice(product)}</span>${discount ? `<span class="mini-discount">-${discount}%</span>` : ""}</div>
          </div>
          <div class="card-actions">
            <button class="btn-primary" data-add="${product.id}">Add to Cart</button>
            <a class="quick-view" href="product.html?id=${encodeURIComponent(product.id)}">View details</a>
          </div>
        </div>
      </article>
    `;
  }

  function renderShell() {
    const settings = loadSettings();
    const phone = settings.phone || DEFAULT_SETTINGS.phone;
    document.body.classList.add("surge-app");
    document.body.insertAdjacentHTML(
      "afterbegin",
      `
      <div class="top-announcement">
        <div class="st-container">
          <span>Free delivery in Kampala on selected deals</span>
          <span>Flash sales available - Call ${phone}</span>
        </div>
      </div>
      <header class="site-header">
        <div class="st-container header-main">
          <button class="hamburger" data-mobile-menu-button aria-label="Open menu">☰</button>
          <a class="brand" href="index.html"><img class="brand-logo" src="Images/Surgetech%20logo.png" alt="Surge Tech UG logo"><span class="brand-name">Surge Tech<small>Premium tech store</small></span></a>
          <select class="category-select" data-category-jump aria-label="Category">
            <option value="index.html">All Categories</option>
            <option value="Phones.html">Phones</option>
            <option value="Laptops.html">Laptops</option>
            <option value="Macbooks.html">MacBooks</option>
            <option value="accessories.html">Accessories</option>
            <option value="services.html">Services</option>
          </select>
          <form class="search-wrap" data-search-form>
            <input data-search-input placeholder="Search phones, laptops, accessories..." aria-label="Search products">
            <button type="submit">Search</button>
            <div class="search-suggestions" data-suggestions></div>
          </form>
          <a class="header-action wishlist-action" href="wishlist.html">Wishlist <span class="badge-count" data-wish-count>0</span></a>
          <button class="header-action" data-open-cart>Cart <span class="badge-count" data-cart-count>0</span></button>
          <a class="header-action account-action" href="checkout.html">Account</a>
        </div>
        <nav class="nav-row">
          <div class="st-container">
            <a href="index.html"${navClass("index.html")}>Home</a>
            <a href="Phones.html"${navClass("Phones.html")}>Phones</a>
            <a href="Laptops.html"${navClass("Laptops.html")}>Laptops</a>
            <a href="Macbooks.html"${navClass("Macbooks.html")}>MacBooks</a>
            <a href="accessories.html"${navClass("accessories.html")}>Accessories</a>
            <a href="services.html"${navClass("services.html")}>Services</a>
            <a href="checkout.html"${navClass("checkout.html")}>Checkout</a>
          </div>
        </nav>
        <nav class="mobile-menu" data-mobile-menu>
          <button class="mobile-menu-close" type="button" data-close-mobile-menu>Close</button>
          <a href="index.html"${navClass("index.html")}>Home</a>
          <a href="Phones.html"${navClass("Phones.html")}>Phones</a>
          <a href="Laptops.html"${navClass("Laptops.html")}>Laptops</a>
          <a href="Macbooks.html"${navClass("Macbooks.html")}>MacBooks</a>
          <a href="accessories.html"${navClass("accessories.html")}>Accessories</a>
          <a href="services.html"${navClass("services.html")}>Services</a>
          <a href="cart.html"${navClass("cart.html")}>Cart</a>
          <a href="wishlist.html"${navClass("wishlist.html")}>Wishlist</a>
          <a href="checkout.html"${navClass("checkout.html")}>Checkout</a>
        </nav>
      </header>
      <div class="overlay" data-overlay></div>
      <aside class="cart-drawer" data-cart-drawer>
        <div class="cart-head"><h2>Your Cart</h2><button class="btn-ghost" data-close-cart>Close</button></div>
        <div class="cart-items" data-cart-items></div>
        <div class="cart-foot">
          <div class="cart-total"><span>Total</span><span data-cart-total>UGX 0</span></div>
          <a class="btn-primary" style="width:100%" href="checkout.html">Checkout</a>
        </div>
      </aside>
    `,
    );
    document.body.insertAdjacentHTML(
      "beforeend",
      `<a class="floating-whatsapp" href="${whatsAppLink()}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">WA</a><button class="back-top" data-back-top>↑</button>`,
    );
    const jump = document.querySelector("[data-category-jump]");
    if (jump) jump.value = selectCurrentCategory();
  }

  function renderFooter() {
    const settings = loadSettings();
    const phone = settings.phone || DEFAULT_SETTINGS.phone;
    const phoneHref = cleanPhone(phone);
    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <footer class="site-footer">
        <div class="st-container footer-grid">
          <div>
            <h3>${settings.businessName || DEFAULT_SETTINGS.businessName}</h3>
            <p>Trusted gadgets, accessories, repairs, design, and digital services in ${settings.location || DEFAULT_SETTINGS.location}.</p>
            <form class="newsletter"><input placeholder="Email for offers" aria-label="Newsletter email"><button class="btn-secondary">Join</button></form>
          </div>
          <div><h4>Categories</h4><a href="Phones.html">Phones</a><a href="Laptops.html">Laptops</a><a href="accessories.html">Accessories</a><a href="services.html">Services</a></div>
          <div><h4>Support</h4><a href="cart.html">Cart</a><a href="checkout.html">Checkout</a><a href="tel:${phoneHref}">Call ${phone}</a><a href="${whatsAppLink()}" target="_blank" rel="noopener">WhatsApp</a></div>
          <div><h4>Social</h4><a href="${settings.facebook}" target="_blank" rel="noopener">Facebook</a><a href="${settings.instagram}" target="_blank" rel="noopener">Instagram</a><a href="${settings.tiktok}" target="_blank" rel="noopener">TikTok</a><a href="${settings.x}" target="_blank" rel="noopener">X</a><a href="${settings.youtube}" target="_blank" rel="noopener">YouTube</a></div>
        </div>
        <div class="st-container" style="padding:0 0 18px;color:#c9c0dd">© 2026 ${settings.businessName || DEFAULT_SETTINGS.businessName}. All rights reserved.</div>
      </footer>
    `,
    );
  }

  function renderCartDrawer() {
    const list = document.querySelector("[data-cart-items]");
    if (!list) return;
    if (!state.cart.length) {
      list.innerHTML = `<div class="empty-state"><h3>Your cart is empty</h3><p>Add products to see your order summary.</p></div>`;
    } else {
      list.innerHTML = state.cart
        .map((item) => {
          const product = productById(item.id);
          if (!product) return "";
          return `
            <div class="cart-line">
              <img src="${imageFor(product)}" onerror="this.onerror=null;this.src='${imageFallbackFor(product)}'" alt="${product.name}">
              <div>
                <h4>${product.name}</h4>
                <strong>${money(parsePrice(product.price) * item.qty)}</strong>
                <div class="cart-qty"><button data-dec="${product.id}">-</button><span>${item.qty}</span><button data-inc="${product.id}">+</button></div>
              </div>
              <button class="btn-danger" data-remove="${product.id}">Remove</button>
            </div>
          `;
        })
        .join("");
    }
    document.querySelectorAll("[data-cart-total]").forEach((el) => (el.textContent = money(cartTotal())));
  }

  function filterProducts(items) {
    const filter = state.filters;
    let output = [...items];
    if (filter.category !== "all") output = productsForPage(filter.category, output);
    if (filter.brand !== "all") output = output.filter((product) => (product.brand || "").toLowerCase() === filter.brand.toLowerCase());
    if (filter.condition !== "all") output = output.filter((product) => (product.condition || "").toLowerCase().includes(filter.condition));
    if (filter.available) output = output.filter((product) => (product.stock || 0) > 0);
    if (filter.min) output = output.filter((product) => parsePrice(product.price) >= Number(filter.min));
    if (filter.max) output = output.filter((product) => parsePrice(product.price) <= Number(filter.max));
    if (filter.query) {
      const query = filter.query.toLowerCase();
      output = output.filter((product) =>
        [product.name, product.brand, product.category, product.subcategory, product.model, product.description, (product.tags || []).join(" "), specList(product).join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(query),
      );
    }
    if (filter.sort === "low") output.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    if (filter.sort === "high") output.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    if (filter.sort === "rated") output.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (filter.sort === "popular") output.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
    if (filter.sort === "new") output.reverse();
    return output;
  }

  function renderGrid(element, items) {
    element.innerHTML = items.length
      ? items.map(productCard).join("")
      : `<div class="empty-state"><h3>No products found</h3><p>Try changing your search or filters.</p></div>`;
  }

  function renderHome(root) {
    const products = storefrontProducts();
    const slideData = [
      ["Flash Sales", "Save up to 50% on selected gadgets", "Shop Deals", "accessories", "accessories.html"],
      ["New Arrivals", "Fresh phones, laptops and accessories in stock", "Explore Now", "phones", "Phones.html"],
      ["Weekly Discounts", "Better prices on trusted tech every week", "View Offers", "laptops", "Laptops.html"],
      ["MacBook Deals", "Premium Apple laptops for work and school", "Shop MacBooks", "macbooks", "Macbooks.html"],
      ["iPhone Deals", "Clean iPhones with warranty and support", "Shop iPhones", "phones", "Phones.html"],
      ["Accessories Offers", "Chargers, stands, audio and essentials", "Shop Accessories", "accessories", "accessories.html"],
    ];
    root.innerHTML = `
      <div class="hero-shell">
        <aside class="side-cats">
          <a href="Phones.html">Phones and tablets</a><a href="Laptops.html">Laptops</a><a href="Macbooks.html">MacBooks</a>
          <a href="accessories.html">Accessories</a><a href="services.html">Repairs and services</a>
        </aside>
        <section class="hero-slider">
          ${slideData
            .map(
              ([label, headline, cta, category, href], index) => `
              <div class="hero-slide ${index === 0 ? "active" : ""}" style="background-image:url('${fallbackImages[category]}')">
                <div class="hero-copy"><span>${label}</span><h1>${headline}</h1><p>Quality products, fast support, and easy ordering through cart or WhatsApp.</p><a class="btn-secondary" href="${href}">${cta}</a></div>
              </div>`,
            )
            .join("")}
          <div class="hero-dots">${slideData.map((_, index) => `<button class="hero-dot ${index === 0 ? "active" : ""}" data-slide="${index}"></button>`).join("")}</div>
        </section>
        <aside class="promo-card"><span class="eyebrow">Today only</span><h3>Order by WhatsApp or cart</h3><p>Ask for availability, delivery and warranty before you buy.</p><a class="btn-whatsapp" href="${whatsAppLink()}" target="_blank" rel="noopener">Chat now</a></aside>
      </div>
      <div class="trust-strip"><div>Fast delivery</div><div>Warranty support</div><div>Secure payment</div><div>Tested gadgets</div></div>
      ${collection("Flash Sales", products.filter((product) => discountFor(product) > 8).slice(0, 10), "accessories.html")}
      ${collection("Top Phones", products.filter((product) => product.category === "phones").slice(0, 10), "Phones.html")}
      ${collection("Laptops and MacBooks", products.filter((product) => ["laptops", "macbooks"].includes(product.category)).slice(0, 10), "Laptops.html")}
      ${collection("Accessories", products.filter((product) => product.category === "accessories").slice(0, 10), "accessories.html")}
      <section class="section stats"><div class="stat"><strong>500+</strong>Customers served</div><div class="stat"><strong>4.8</strong>Average rating</div><div class="stat"><strong>24h</strong>Support response</div><div class="stat"><strong>6</strong>Core services</div></section>
    `;
    startHero();
  }

  function collection(title, items, href) {
    return `<section class="section"><div class="section-head"><h2>${title}</h2><a href="${href}">See all</a></div><div class="product-grid">${items.map(productCard).join("")}</div></section>`;
  }

  function renderCategory(root, category) {
    state.filters = { ...state.filters, category, brand: "all", condition: "all", sort: "popular", min: "", max: "", available: false };
    const title = titleFor(category);
    const products = productsForPage(category);
    const brands = [...new Map(products.map((product) => [(product.brand || "Other").toLowerCase(), brandLabel(product.brand)])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1]));
    root.innerHTML = `
      <section class="page-hero"><span class="eyebrow">Surge Tech Store</span><h1>${title}</h1><p>Browse trusted ${title.toLowerCase()} with live search, filters, sorting, cart and WhatsApp ordering.</p></section>
      <div class="filters-layout section">
        <aside class="filter-panel">
          <button class="filter-close" type="button" data-filter-close>Close filters</button>
          <h3>Filter products</h3>
          <label>Search</label><input data-filter="query" placeholder="Search ${title.toLowerCase()}">
          <label>Brand</label><select data-filter="brand"><option value="all">All brands</option>${brands.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select>
          <label>Condition</label><select data-filter="condition"><option value="all">Any condition</option><option value="new">New</option><option value="refurbished">Refurbished</option><option value="service">Service</option></select>
          <label>Price range</label><div class="form-grid"><input data-filter="min" type="number" placeholder="Min"><input data-filter="max" type="number" placeholder="Max"></div>
          <label>Sort</label><select data-filter="sort"><option value="popular">Most popular</option><option value="low">Lowest price</option><option value="high">Highest price</option><option value="rated">Best rated</option><option value="new">New arrivals</option></select>
          <label><input data-filter="available" type="checkbox"> In stock only</label>
        </aside>
        <main><div class="section-head"><h2>${title}</h2><span data-result-count></span></div><button class="filter-toggle" type="button" data-filter-toggle>Filter & Sort</button><div class="product-grid" data-category-grid></div></main>
      </div>
    `;
    document.querySelectorAll("[data-filter]").forEach((input) => {
      input.addEventListener("input", () => {
        state.filters[input.dataset.filter] = input.type === "checkbox" ? input.checked : input.value;
        refreshCategory();
      });
    });
    document.querySelector("[data-filter-toggle]")?.addEventListener("click", () => {
      document.querySelector(".filter-panel")?.classList.add("open");
      document.querySelector("[data-overlay]")?.classList.add("open");
      document.body.classList.add("menu-locked");
    });
    document.querySelector("[data-filter-close]")?.addEventListener("click", () => {
      document.querySelector(".filter-panel")?.classList.remove("open");
      document.querySelector("[data-overlay]")?.classList.remove("open");
      document.body.classList.remove("menu-locked");
    });
    refreshCategory();
  }

  function refreshCategory() {
    const grid = document.querySelector("[data-category-grid]");
    if (!grid) return;
    const results = filterProducts(productsForPage(state.filters.category));
    renderGrid(grid, results);
    const count = document.querySelector("[data-result-count]");
    if (count) count.textContent = `${results.length} items`;
  }

  function renderProduct(root) {
    const products = storefrontProducts();
    const id = new URLSearchParams(location.search).get("id") || products[0]?.id;
    const product = productById(id) || products[0];
    if (!product) return;
    const galleryImages = imagesFor(product);
    const fallback = imageFallbackFor(product);
    const productColors = Array.isArray(product.colors) ? product.colors.filter(Boolean) : [];
    const firstColor = productColors[0] || "";
    const detailWhatsApp = (color = "") => whatsAppLink(product, `Hello Surge Tech UG, I am interested in ${product.name} priced at ${displayPrice(product)}${color ? ` in ${color}` : ""}. Is it available?`);
    state.recent = [product.id, ...state.recent.filter((item) => item !== product.id)].slice(0, 8);
    save();
    const similar = products.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 5);
    root.innerHTML = `
      <nav class="section"><a href="index.html">Home</a> / <a href="${categoryHref(product.category)}">${titleFor(product.category)}</a> / ${product.name}</nav>
      <div class="detail-layout">
        <div><div class="gallery-main"><img data-main-img src="${galleryImages[0]}" onerror="this.onerror=null;this.src='${fallback}'" alt="${product.name}"></div><div class="gallery-thumbs">${galleryImages.map((src, index) => `<button class="${index === 0 ? "active" : ""}" data-thumb="${src}"><img src="${src}" onerror="this.onerror=null;this.src='${fallback}'" alt="${product.name} thumbnail ${index + 1}"></button>`).join("")}</div>${galleryImages.length === 1 ? '<p class="gallery-note">More photos can be shared on WhatsApp before purchase.</p>' : ''}</div>
        <div class="detail-card">
          <span class="eyebrow">${(product.brand || "Surge Tech").toUpperCase()}</span><h1>${product.name}</h1>
          <div class="rating">${stars(product.rating)} (${product.reviews || 0} reviews)</div><div class="stock">${(product.stock || 0) > 0 ? "Available now" : "Pre-order"} · ${product.condition}</div>
          <div class="detail-price">${displayPrice(product)}</div><div class="old-price">${displayOldPrice(product)} ${discountFor(product) ? ` - Save ${discountFor(product)}%` : ""}</div>
          ${productColors.length ? `<div class="color-options"><strong>Color</strong><div>${productColors.map((color, index) => `<button class="${index === 0 ? "active" : ""}" type="button" data-color="${color}">${color}</button>`).join("")}</div></div>` : ""}
          <p>${product.description || "Premium product available from Surge Tech UG."}</p>
          <div class="detail-specs">${specList(product).slice(0, 5).map((spec) => `<span>${spec}</span>`).join("")}</div>
          <div class="qty"><strong>Quantity</strong><button data-q-dec>-</button><span data-q>1</span><button data-q-inc>+</button></div>
          <div class="detail-actions"><button class="btn-primary" data-detail-add="${product.id}">Add to Cart</button><button class="btn-secondary" data-buy="${product.id}">Buy Now</button><a class="btn-whatsapp" data-detail-whatsapp href="${detailWhatsApp(firstColor)}" target="_blank" rel="noopener">Ask on WhatsApp</a><button class="btn-ghost" data-wish="${product.id}">Wishlist</button></div>
        </div>
      </div>
      <div class="tabs"><div class="tab-buttons"><button class="active" data-tab="description">Description</button><button data-tab="specs">Specifications</button><button data-tab="delivery">Delivery</button><button data-tab="reviews">Reviews</button></div><div class="tab-panel" data-tab-panel><p>${product.description}</p></div></div>
      ${collection("Similar products", similar, categoryHref(product.category))}
      ${collection("Recently viewed", state.recent.map(productById).filter((item) => item && item.active !== false).slice(0, 5), "index.html")}
    `;
    bindProductPage(product);
  }

  function categoryHref(category) {
    return { phones: "Phones.html", laptops: "Laptops.html", macbooks: "Macbooks.html", accessories: "accessories.html", services: "services.html" }[category] || "index.html";
  }

  function bindProductPage(product) {
    let qty = 1;
    let selectedColor = Array.isArray(product.colors) ? product.colors.filter(Boolean)[0] || "" : "";
    const detailSpecs = specList(product).slice(0, 4).join(" / ");
    const updateWhatsApp = () => {
      const link = document.querySelector("[data-detail-whatsapp]");
      if (link) link.href = whatsAppLink(product, `Hello Surge Tech UG, I am interested in ${product.name} priced at ${displayPrice(product)}${selectedColor ? ` in ${selectedColor}` : ""}.${detailSpecs ? ` Specs: ${detailSpecs}.` : ""} Is it available?`);
    };
    document.querySelectorAll("[data-color]").forEach((button) =>
      button.addEventListener("click", () => {
        selectedColor = button.dataset.color || "";
        document.querySelectorAll("[data-color]").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        updateWhatsApp();
      }),
    );
    document.querySelector("[data-q-inc]")?.addEventListener("click", () => {
      qty += 1;
      document.querySelector("[data-q]").textContent = qty;
    });
    document.querySelector("[data-q-dec]")?.addEventListener("click", () => {
      qty = Math.max(1, qty - 1);
      document.querySelector("[data-q]").textContent = qty;
    });
    document.querySelector("[data-detail-add]")?.addEventListener("click", () => addToCart(product.id, qty));
    document.querySelector("[data-buy]")?.addEventListener("click", () => {
      addToCart(product.id, qty);
      location.href = "checkout.html";
    });
    document.querySelectorAll("[data-thumb]").forEach((button) =>
      button.addEventListener("click", () => {
        document.querySelector("[data-main-img]").src = button.dataset.thumb;
        document.querySelectorAll("[data-thumb]").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
      }),
    );
    document.querySelectorAll("[data-tab]").forEach((button) =>
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-tab]").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        const panel = document.querySelector("[data-tab-panel]");
        if (button.dataset.tab === "specs") panel.innerHTML = `<ul>${specList(product).map((spec) => `<li>${spec}</li>`).join("")}</ul>`;
        if (button.dataset.tab === "delivery") {
          const settings = loadSettings();
          panel.innerHTML = `<p>${settings.deliveryNote}</p><p>${settings.warrantyNote}</p><p>${settings.returnPolicy}</p>`;
        }
        if (button.dataset.tab === "reviews") panel.innerHTML = "<p>Customers rate Surge Tech highly for communication, product testing, and after-sale support.</p>";
        if (button.dataset.tab === "description") panel.innerHTML = `<p>${product.description}</p>`;
      }),
    );
  }

  function serviceCard(service) {
    const group = service.serviceGroup === "repair" ? "Repair" : "Graphic Design";
    const fallback = imageFallbackFor(service);
    return `
      <article class="service-tile" data-service-chat="${service.id}" data-service-group="${service.serviceGroup || "design"}">
        <div class="service-icon"><img loading="lazy" src="${imageFor(service)}" onerror="this.onerror=null;this.src='${fallback}'" alt="${service.name}"></div>
        <div class="service-copy">
          <span>${group}</span>
          <h3>${service.name}</h3>
          <p>${service.description || shortDetails(service)}</p>
          <strong>From ${displayPrice(service)}</strong>
        </div>
        <button class="btn-secondary" type="button">Chat now</button>
      </article>
    `;
  }

  function renderServices(root) {
    const services = storefrontProducts().filter((product) => product.category === "services");
    const design = services.filter((service) => (service.serviceGroup || "design") === "design");
    const repair = services.filter((service) => service.serviceGroup === "repair");
    root.innerHTML = `
      <section class="page-hero services-hero"><span class="eyebrow">Surge Tech Services</span><h1>Design, websites, and device repair support</h1><p>Talk to the right person fast. Choose a design service to chat with a designer, or a repair service to chat with a technician.</p></section>
      <section class="section service-intro"><div><h2>Professional help for your brand and devices</h2><p>We support businesses, students, creators, and everyday tech users with clear communication, practical timelines, and WhatsApp follow-up.</p></div><a class="btn-whatsapp" href="${whatsAppLink()}" target="_blank" rel="noopener">WhatsApp Surge Tech</a></section>
      <section class="section"><div class="section-head"><h2>Graphic Design Services</h2><span>Branding, digital content, and visual design</span></div><div class="service-grid">${design.map(serviceCard).join("")}</div></section>
      <section class="section"><div class="section-head"><h2>Repair Services</h2><span>Laptop, phone, software, and diagnosis support</span></div><div class="service-grid">${repair.map(serviceCard).join("")}</div></section>
      <section class="section service-cta"><h2>Need something custom?</h2><p>Send us your request and we will guide you on availability, timing, and pricing.</p><a class="btn-whatsapp" href="${whatsAppLink()}" target="_blank" rel="noopener">Start a WhatsApp chat</a></section>
    `;
  }

  function openServiceChat(service) {
    const role = service.serviceGroup === "repair" ? "Technician" : "Designer";
    const title = service.serviceGroup === "repair" ? "Chat with Technician" : "Chat with Designer";
    const existing = document.querySelector("[data-service-modal]");
    if (existing) existing.remove();
    const modal = document.createElement("div");
    modal.className = "service-modal";
    modal.dataset.serviceModal = "true";
    modal.innerHTML = `
      <div class="service-modal-backdrop" data-close-service></div>
      <form class="service-dialog" data-service-form>
        <button class="service-close" type="button" data-close-service aria-label="Close">×</button>
        <span class="eyebrow">${service.name}</span>
        <h2>${title}</h2>
        <p>Share a few details and we will continue the conversation on WhatsApp with a Surge Tech ${role.toLowerCase()}.</p>
        <label>Client name<input required name="name" placeholder="Your name"></label>
        <label>Phone number<input required name="phone" placeholder="0776036580"></label>
        <label>Message<textarea required name="message" rows="5">I need help with ${service.name}. Please advise on price, timing, and requirements.</textarea></label>
        <button class="btn-whatsapp" type="submit">Send on WhatsApp</button>
      </form>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll("[data-close-service]").forEach((button) => button.addEventListener("click", () => modal.remove()));
    modal.querySelector("[data-service-form]").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const inquiry = {
        id: `SI-${Date.now().toString().slice(-6)}`,
        createdAt: new Date().toISOString(),
        service: service.name,
        group: service.serviceGroup === "repair" ? "Repair Services" : "Graphic Design",
        name: form.get("name").trim(),
        phone: form.get("phone").trim(),
        message: form.get("message").trim(),
        status: "New",
      };
      try {
        await saveServiceInquiry(inquiry);
      } catch (error) {
        console.error("Service inquiry save failed", error);
        toast("Could not save inquiry online. Please continue on WhatsApp.");
      }
      const message = `Hello Surge Tech UG, I need help with ${service.name}. My name is ${inquiry.name}. My phone number is ${inquiry.phone}. Details: ${inquiry.message}.`;
      window.open(whatsAppLink(null, message), "_blank", "noopener");
      modal.remove();
      toast("Service inquiry saved");
    });
  }


  const defaultCategories = {
    Phones: ["iPhones", "Samsung", "Tecno", "Infinix", "Redmi/Xiaomi"],
    Laptops: ["HP", "Dell", "Lenovo", "Asus", "Apple"],
    MacBooks: ["MacBook Air", "MacBook Pro"],
    Accessories: ["Phone Accessories", "Laptop Accessories", "Storage Devices", "Chargers", "Audio Accessories"],
    Services: ["Graphic Design", "Repair Services"],
  };
  const loadOrders = () => state.orders.length ? state.orders : JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
  const saveOrders = (orders) => {
    state.orders = orders;
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  };
  const loadServiceInquiries = () => state.serviceInquiries.length ? state.serviceInquiries : JSON.parse(localStorage.getItem(SERVICE_INQUIRIES_KEY) || "[]");
  const saveServiceInquiries = (inquiries) => {
    state.serviceInquiries = inquiries;
    localStorage.setItem(SERVICE_INQUIRIES_KEY, JSON.stringify(inquiries.slice(0, 80)));
  };
  const rowToOrder = (row) => ({
    orderNumber: row.order_number || row.id,
    createdAt: row.created_at,
    status: row.status || "Pending",
    customer: row.customer || {},
    items: Array.isArray(row.items) ? row.items : [],
    subtotal: row.subtotal || 0,
    delivery: row.delivery || 0,
    total: row.total || 0,
  });
  const orderToSupabaseRow = (order) => ({
    order_number: order.orderNumber,
    customer: order.customer || {},
    items: order.items || [],
    subtotal: order.subtotal || 0,
    delivery: order.delivery || 0,
    total: order.total || 0,
    status: order.status || "Pending",
  });
  async function loadOrdersOnline() {
    const supabase = await loadSupabaseClient();
    if (!supabase) return loadOrders();
    try {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      saveOrders((data || []).map(rowToOrder));
    } catch (error) {
      console.warn("Supabase orders load failed. Using local order cache.", error);
    }
    return loadOrders();
  }
  async function saveOrderOnline(order) {
    const supabase = await loadSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("orders").insert(orderToSupabaseRow(order)).select().single();
        if (error) throw error;
        const saved = rowToOrder(data);
        saveOrders([saved, ...loadOrders()].slice(0, 80));
        return saved;
      } catch (error) {
        console.warn("Supabase order save failed. Saved locally instead.", error);
      }
    }
    saveOrders([order, ...loadOrders()].slice(0, 80));
    return order;
  }
  const rowToInquiry = (row) => ({
    id: row.id,
    createdAt: row.created_at,
    service: row.service || row.service_type || "",
    group: row.service_type || "",
    name: row.customer_name || "",
    phone: row.phone || "",
    message: row.message || "",
    status: titleCase(row.status || "new"),
  });
  const inquiryToSupabaseRow = (inquiry) => ({
    service: inquiry.service || "",
    service_type: inquiry.group || inquiry.service || "",
    customer_name: inquiry.name || "",
    phone: inquiry.phone || "",
    message: inquiry.message || "",
    status: inquiry.status || "New",
  });
  async function loadServiceInquiriesOnline() {
    const supabase = await loadSupabaseClient();
    if (!supabase) return loadServiceInquiries();
    try {
      const { data, error } = await supabase.from("service_inquiries").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      saveServiceInquiries((data || []).map(rowToInquiry));
    } catch (error) {
      console.warn("Supabase inquiry load failed. Using local inquiry cache.", error);
    }
    return loadServiceInquiries();
  }
  async function saveServiceInquiry(inquiry) {
    const supabase = await loadSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("service_inquiries").insert(inquiryToSupabaseRow(inquiry)).select().single();
        if (error) throw error;
        const saved = rowToInquiry(data);
        saveServiceInquiries([saved, ...loadServiceInquiries()]);
        return saved;
      } catch (error) {
        console.warn("Supabase service inquiry save failed. Saved locally instead.", error);
      }
    }
    saveServiceInquiries([inquiry, ...loadServiceInquiries()]);
    return inquiry;
  }
  async function loadSettingsOnline() {
    const supabase = await loadSupabaseClient();
    if (!supabase) return loadSettings();
    try {
      const { data, error } = await supabase.from("site_settings").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      if (data) {
        state.settings = {
          ...loadSettings(),
          businessName: data.business_name || DEFAULT_SETTINGS.businessName,
          phone: data.phone || DEFAULT_SETTINGS.phone,
          whatsapp: data.whatsapp || DEFAULT_SETTINGS.whatsapp,
          location: data.location || DEFAULT_SETTINGS.location,
          facebook: data.facebook || DEFAULT_SETTINGS.facebook,
          instagram: data.instagram || DEFAULT_SETTINGS.instagram,
          tiktok: data.tiktok || DEFAULT_SETTINGS.tiktok,
          x: data.x || DEFAULT_SETTINGS.x,
          youtube: data.youtube || DEFAULT_SETTINGS.youtube,
          deliveryNote: data.delivery_note || DEFAULT_SETTINGS.deliveryNote,
          warrantyNote: data.warranty_note || DEFAULT_SETTINGS.warrantyNote,
          returnPolicy: data.return_policy || DEFAULT_SETTINGS.returnPolicy,
          dbId: data.id,
        };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
      }
    } catch (error) {
      console.warn("Supabase settings load failed. Using local settings.", error);
    }
    return loadSettings();
  }
  async function saveSettingsOnline(settings) {
    const next = { ...loadSettings(), ...settings };
    const row = {
      business_name: next.businessName,
      phone: next.phone,
      whatsapp: next.whatsapp,
      location: next.location,
      facebook: next.facebook,
      instagram: next.instagram,
      tiktok: next.tiktok,
      x: next.x,
      youtube: next.youtube,
      delivery_note: next.deliveryNote,
      warranty_note: next.warrantyNote,
      return_policy: next.returnPolicy,
      updated_at: new Date().toISOString(),
    };
    const supabase = await loadSupabaseClient();
    if (supabase) {
      const request = next.dbId
        ? supabase.from("site_settings").update(row).eq("id", next.dbId).select().single()
        : supabase.from("site_settings").insert(row).select().single();
      const { data, error } = await request;
      if (error) throw error;
      state.supabaseOnline = true;
      next.dbId = data.id;
    }
    state.settings = next;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    return next;
  }
  const loadCategories = () => JSON.parse(localStorage.getItem("surgeCategories") || "null") || defaultCategories;
  const productStatus = (product) => product.status || statusForStock(product.stock);
  const productValue = (product) => parsePrice(product.price) * Number(product.stock || 0);
  const orderTotal = (order) => parsePrice(order.total || order.totalAmount || 0);
  const adminEsc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function productFormValues(form, previous = {}) {
    const data = new FormData(form);
    const name = data.get("name").trim();
    const price = parsePrice(data.get("price"));
    const oldPrice = parsePrice(data.get("oldPrice"));
    const stock = Number(data.get("stock") || 0);
    return { ...previous, id: slugify(data.get("id") || name), slug: slugify(data.get("id") || name), name, category: normalizeCategory(data.get("category")), subcategory: data.get("subcategory").trim(), brand: data.get("brand").trim(), model: data.get("model").trim(), condition: data.get("condition"), price, oldPrice, originalPrice: oldPrice, currency: "UGX", stock, badge: data.get("badge").trim(), status: data.get("status") || statusForStock(stock), rating: Number(data.get("rating") || 4.5), reviews: Number(data.get("reviews") || 0), images: data.get("images").split(/\n/).map((item) => item.trim()).filter(Boolean), shortDescription: data.get("shortDescription").trim(), description: data.get("description").trim(), specs: { processor: data.get("processor").trim(), ram: data.get("ram").trim(), storage: data.get("storage").trim(), display: data.get("display").trim(), graphics: data.get("graphics").trim(), battery: data.get("battery").trim() }, tags: data.get("tags").split(/\n|,/).map((item) => item.trim()).filter(Boolean), featured: data.get("featured") === "on", topSelling: data.get("topSelling") === "on", topRated: data.get("topRated") === "on", serviceGroup: data.get("serviceGroup") || "", active: data.get("active") === "active", whatsappTemplate: data.get("whatsappTemplate").trim(), createdAt: previous.createdAt || todayStamp(), updatedAt: todayStamp() };
  }

  function compressImageFile(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject(new Error("Only image files are supported"));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read image"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Could not load image"));
        img.onload = () => {
          const maxSize = 1200;
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve({ src: canvas.toDataURL("image/jpeg", 0.78), originalSize: file.size });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function dataUrlToBlob(dataUrl) {
    const [meta, content] = String(dataUrl || "").split(",");
    const mime = (meta.match(/data:(.*?);base64/) || [])[1] || "image/jpeg";
    const binary = atob(content || "");
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mime });
  }

  async function uploadProductImage(dataUrl, fileName = "product-image.jpg") {
    const supabase = await loadSupabaseClient();
    if (!supabase || !SUPABASE_CONFIG.storageBucket || !String(dataUrl || "").startsWith("data:image/")) return dataUrl;
    const safeName = slugify(fileName.replace(/\.[^.]+$/, "")) || "product-image";
    const path = `${Date.now()}-${safeName}.jpg`;
    const { error } = await supabase.storage.from(SUPABASE_CONFIG.storageBucket).upload(path, dataUrlToBlob(dataUrl), {
      contentType: "image/jpeg",
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(SUPABASE_CONFIG.storageBucket).getPublicUrl(path);
    return data.publicUrl || dataUrl;
  }

  function initAdminImageManager(form) {
    const manager = form.querySelector("[data-image-manager]");
    if (!manager) return;
    const textarea = form.querySelector('textarea[name="images"]');
    const picker = manager.querySelector("[data-image-picker]");
    const drop = manager.querySelector("[data-image-drop]");
    const urlInput = manager.querySelector("[data-image-url]");
    const addUrl = manager.querySelector("[data-add-image-url]");
    const list = manager.querySelector("[data-image-list]");
    const warning = manager.querySelector("[data-image-warning]");
    let images = textarea.value.split(/\n/).map((item) => item.trim()).filter(Boolean);
    const sync = () => {
      textarea.value = images.join("\n");
      list.innerHTML = images.length
        ? images.map((src, index) => `<div class="admin-image-item"><img src="${src}" alt="Product image ${index + 1}"><span>${index === 0 ? "Main image" : "Image " + (index + 1)}</span><div><button type="button" data-image-up="${index}" ${index === 0 ? "disabled" : ""}>Up</button><button type="button" data-image-down="${index}" ${index === images.length - 1 ? "disabled" : ""}>Down</button><button type="button" data-image-remove="${index}">Remove</button></div></div>`).join("")
        : `<div class="admin-image-empty">No product images yet. Upload one or add an online URL.</div>`;
    };
    const setWarning = (message) => {
      warning.textContent = message || "";
      warning.hidden = !message;
    };
    const addFiles = async (files) => {
      const incoming = Array.from(files || []);
      if (!incoming.length) return;
      setWarning("");
      for (const file of incoming) {
        try {
          if (file.size > 1800000) setWarning("Large image compressed before saving. Very large Base64 images can fill browser storage quickly.");
          const result = await compressImageFile(file);
          try {
            images.push(await uploadProductImage(result.src, file.name));
          } catch {
            setWarning("Image kept in this browser because Supabase Storage upload failed. Check bucket and policies.");
            images.push(result.src);
          }
        } catch (error) {
          setWarning(error.message || "Could not process one image.");
        }
      }
      sync();
    };
    drop.addEventListener("click", () => picker.click());
    drop.addEventListener("dragover", (event) => {
      event.preventDefault();
      drop.classList.add("dragging");
    });
    drop.addEventListener("dragleave", () => drop.classList.remove("dragging"));
    drop.addEventListener("drop", (event) => {
      event.preventDefault();
      drop.classList.remove("dragging");
      addFiles(event.dataTransfer.files);
    });
    picker.addEventListener("change", () => addFiles(picker.files));
    addUrl.addEventListener("click", () => {
      const url = urlInput.value.trim();
      if (!validImageSrc(url)) {
        setWarning("Enter a valid image URL or relative path, for example Images/product.jpg.");
        return;
      }
      images.push(url);
      urlInput.value = "";
      setWarning("");
      sync();
    });
    list.addEventListener("click", (event) => {
      const remove = event.target.closest("[data-image-remove]");
      const up = event.target.closest("[data-image-up]");
      const down = event.target.closest("[data-image-down]");
      if (remove) images.splice(Number(remove.dataset.imageRemove), 1);
      if (up) {
        const index = Number(up.dataset.imageUp);
        [images[index - 1], images[index]] = [images[index], images[index - 1]];
      }
      if (down) {
        const index = Number(down.dataset.imageDown);
        [images[index + 1], images[index]] = [images[index], images[index + 1]];
      }
      sync();
    });
    sync();
  }

  function backupFilename(prefix = "surge-products-backup") {
    return `${prefix}-${todayStamp()}.json`;
  }

  function productsBackupData(products = state.products) {
    return { products: normalizeProducts(products) };
  }

  async function productsJsonFallback() {
    try {
      const response = await fetch("products.json");
      const data = await response.json();
      const products = Array.isArray(data) ? data : Array.isArray(data?.products) ? data.products : [];
      return normalizeProducts(products);
    } catch {
      return normalizeProducts(Array.isArray(window.SURGE_PRODUCTS) ? window.SURGE_PRODUCTS : []);
    }
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyJson(data) {
    const text = JSON.stringify(data, null, 2);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand?.("copy");
    textarea.remove();
    return Boolean(copied);
  }

  async function migrateLocalProductsToSupabase() {
    const localProducts = loadLocalAdminProducts();
    let source = "localStorage";
    let sourceProducts = localProducts;
    if (!sourceProducts.length) {
      source = "current admin catalogue";
      sourceProducts = normalizeProducts(state.products);
    }
    if (!sourceProducts.length) {
      source = "products.json/products-data.js";
      sourceProducts = await productsJsonFallback();
    }
    if (!sourceProducts.length) throw new Error("No products found to migrate. Restore a backup or load products.json first.");
    if (!confirm("Please export a local backup first. Migration will not delete your local products. Continue?")) {
      throw new Error("Migration cancelled. Export a local backup first.");
    }
    const supabase = await loadSupabaseClient();
    if (!supabase) throw new Error("Add your Supabase URL and anon key before migrating.");
    const validProducts = validateImportedProducts(sourceProducts);
    const migrated = [];
    const failed = [];
    for (const product of validProducts) {
      try {
        const { error } = await supabase.from("products").upsert(productToSupabaseRow(product), { onConflict: "local_id" });
        if (error) throw error;
        migrated.push(product.name);
      } catch (error) {
        failed.push(`${product.name}: ${error.message || "failed"}`);
      }
    }
    return {
      source,
      found: validProducts.length,
      migrated,
      failed,
      message: failed.length
        ? `Found ${validProducts.length} products. Migrated ${migrated.length}. Failed ${failed.length}. First error: ${failed[0]}`
        : `Found and migrated ${migrated.length} products from ${source}.`,
    };
  }

  async function testSupabaseConnection() {
    const supabase = await loadSupabaseClient();
    if (!supabase) return { ok: false, message: "Supabase is not configured. Add URL and anon key in supabase-config.js." };
    try {
      const { error } = await supabase.from("products").select("id", { head: true, count: "exact" }).limit(1);
      if (error) throw error;
      state.supabaseOnline = true;
      return { ok: true, message: "Online Database Connected: Product edits update live from Supabase." };
    } catch (error) {
      state.supabaseOnline = false;
      return { ok: false, message: error.message || "Supabase connection failed. Check keys, tables, and RLS policies." };
    }
  }

  function validateImportedProducts(rawProducts) {
    if (!Array.isArray(rawProducts) || !rawProducts.length) throw new Error("Import must include a products array.");
    const errors = [];
    const prepared = rawProducts.map((product, index) => {
      const row = { ...(product || {}) };
      row.id = String(row.id || slugify(row.name || `product-${index + 1}`)).trim();
      row.images = Array.isArray(row.images) ? row.images : row.image ? [row.image] : [];
      row.price = parsePrice(row.price);
      row.category = normalizeCategory(row.category || "accessories");
      row.active = row.active !== false;
      row.stock = Number.isFinite(Number(row.stock)) ? Number(row.stock) : 1;
      row.specs = row.specs && typeof row.specs === "object" ? row.specs : {};
      row.brand = String(row.brand || "Surge Tech").trim() || "Surge Tech";
      if (!String(row.name || "").trim()) errors.push(`Product ${index + 1} is missing a name.`);
      if (!row.id) errors.push(`Product ${index + 1} is missing an ID.`);
      if (!allowedCategories.includes(row.category)) errors.push(`${row.name || row.id} has an invalid category.`);
      if (!Number.isFinite(Number(row.price))) errors.push(`${row.name || row.id} has an invalid price.`);
      if (!Array.isArray(row.images)) errors.push(`${row.name || row.id} images must be an array.`);
      return row;
    });
    if (errors.length) throw new Error(errors.slice(0, 4).join(" "));
    return normalizeProducts(prepared);
  }

  function renderAdmin(root) {
    if (sessionStorage.getItem("surgeAdminAuth") !== "true") {
      root.innerHTML = '<section class="page-hero"><h1>Admin Dashboard</h1><p>Enter the admin password to manage Surge Tech UG products.</p></section><section class="section admin-login"><form data-admin-login><h2>Admin login</h2><input type="password" name="password" placeholder="Password" required><button class="btn-primary" type="submit">Unlock Admin</button><p class="admin-note">Temporary local password protection for product editing.</p></form></section>';
      root.querySelector("[data-admin-login]").addEventListener("submit", (event) => { event.preventDefault(); if (new FormData(event.currentTarget).get("password") === ADMIN_PASSWORD) { sessionStorage.setItem("surgeAdminAuth", "true"); renderAdmin(root); } else toast("Incorrect admin password"); });
      return;
    }
    let section = "overview";
    let selectedId = state.products[0]?.id || "";
    let filters = { query: "", category: "all", brand: "all", status: "all", condition: "all" };
    let orderFilter = "all";
    const selected = () => productById(selectedId) || state.products[0] || {};
    const brands = () => [...new Set(state.products.map((p) => p.brand).filter(Boolean))].sort();
    const conditions = () => [...new Set(state.products.map((p) => p.condition).filter(Boolean))].sort();
    const filtered = () => state.products.filter((p) => { const text = [p.name, p.brand, p.category, p.subcategory, p.model].join(" ").toLowerCase(); return (!filters.query || text.includes(filters.query)) && (filters.category === "all" || p.category === filters.category) && (filters.brand === "all" || p.brand === filters.brand) && (filters.status === "all" || productStatus(p) === filters.status) && (filters.condition === "all" || p.condition === filters.condition); });
    const statData = () => { const orders = loadOrders(); return [["Total products", state.products.length], ["Total categories", new Set(state.products.map((p) => p.category)).size], ["Total stock items", state.products.reduce((a, p) => a + Number(p.stock || 0), 0)], ["Out of stock products", state.products.filter((p) => Number(p.stock || 0) <= 0).length], ["Low stock products", state.products.filter((p) => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= 3).length], ["Total orders", orders.length], ["Pending orders", orders.filter((o) => !o.status || o.status === "Pending").length], ["Service inquiries", loadServiceInquiries().length], ["Estimated stock value", money(state.products.reduce((a, p) => a + productValue(p), 0))]]; };
    const tabs = () => ["overview", "products", "orders", "categories", "services", "settings", "backup"].map((id) => '<button class="' + (section === id ? 'active' : '') + '" data-admin-section="' + id + '">' + titleCase(id) + '</button>').join('');
    const dbStatus = () => '<section class="admin-panel admin-db-status ' + (supabaseReady() && state.supabaseOnline ? 'online' : 'local') + '"><div><strong>' + (supabaseReady() && state.supabaseOnline ? 'Online Database Connected' : 'Local Mode') + '</strong><p>' + (supabaseReady() && state.supabaseOnline ? 'Product edits update live from Supabase.' : 'Product edits are saved only in this browser. Connect Supabase for live online updates.') + '</p><small data-db-status-output>Supabase config: ' + (supabaseReady() ? 'keys added' : 'not configured') + '</small></div><div class="admin-backup"><button class="btn-secondary" type="button" data-test-supabase>Test Supabase Connection</button><button class="btn-primary" type="button" data-migrate-local-products>Migrate Local Products to Supabase</button><button class="btn-ghost" type="button" data-download-local-products>Export Local Products Backup</button><button class="btn-ghost" type="button" data-export-products>Export products.json</button></div><pre data-export-output></pre></section>';
    const overview = () => '<section class="admin-overview">' + statData().map(([label, value]) => '<article><span>' + label + '</span><strong>' + value + '</strong></article>').join('') + '</section>';
    const productRows = (items) => items.map((p) => '<tr><td data-label="Image"><img src="' + imageFor(p) + '" alt="' + adminEsc(p.name) + '"></td><td data-label="Name"><strong>' + adminEsc(p.name) + '</strong><small>' + adminEsc(p.model || '') + '</small></td><td data-label="Category">' + titleFor(p.category) + '</td><td data-label="Brand">' + adminEsc(p.brand) + '</td><td data-label="Price">' + displayPrice(p) + '</td><td data-label="Old price">' + displayOldPrice(p) + '</td><td data-label="Stock">' + p.stock + '</td><td data-label="Condition">' + adminEsc(p.condition) + '</td><td data-label="Status"><span class="admin-status ' + productStatus(p).toLowerCase().replace(/\s+/g, '-') + '">' + productStatus(p) + '</span></td><td data-label="Actions"><button type="button" data-edit-product="' + p.id + '">Edit</button><button type="button" data-duplicate-product="' + p.id + '">Duplicate</button><button type="button" data-delete-product="' + p.id + '">Delete</button></td></tr>').join('');
    const productForm = () => { const p = selected(); const specs = p.specs || {}; return '<form class="admin-editor admin-panel" data-admin-form><div class="admin-panel-head"><div><h2>Add/Edit Product</h2><p>Editing: <strong>' + adminEsc(p.name || 'New product') + '</strong></p></div><button class="btn-ghost" type="button" data-new-product>New product</button></div><div class="form-grid"><label>Product ID<input name="id" value="' + adminEsc(p.id || '') + '"></label><label>Product name<input name="name" required value="' + adminEsc(p.name || '') + '"></label></div><div class="form-grid"><label>Category<select name="category"><option value="phones">Phones</option><option value="laptops">Laptops</option><option value="macbooks">MacBooks</option><option value="accessories">Accessories</option><option value="services">Services</option></select></label><label>Subcategory<input name="subcategory" value="' + adminEsc(p.subcategory || '') + '"></label></div><div class="form-grid"><label>Brand<input name="brand" value="' + adminEsc(p.brand || '') + '"></label><label>Model<input name="model" value="' + adminEsc(p.model || '') + '"></label></div><div class="form-grid"><label>Badge<input name="badge" value="' + adminEsc(p.badge || '') + '"></label><label>Price<input name="price" value="' + displayPrice(p) + '"></label></div><div class="form-grid"><label>Old price<input name="oldPrice" value="' + displayOldPrice(p) + '"></label><label>Stock quantity<input name="stock" type="number" min="0" value="' + (p.stock ?? 0) + '"></label></div><div class="form-grid"><label>Availability<select name="status"><option>In Stock</option><option>Low Stock</option><option>Out of Stock</option></select></label><label>Condition<select name="condition"><option>Brand New</option><option>Used</option><option>Refurbished</option></select></label></div><div class="form-grid"><label>Service group<select name="serviceGroup"><option value="">Not a service</option><option value="design">Graphic Design</option><option value="repair">Repair</option></select></label></div><label class="admin-image-source">Product images<textarea name="images" rows="3">' + adminEsc((p.images || []).join('\n')) + '</textarea></label><div class="admin-image-manager" data-image-manager><input type="file" accept="image/*" multiple hidden data-image-picker><button class="admin-image-drop" type="button" data-image-drop><strong>Drop product images here</strong><span>or click to upload. Images are resized and saved in this browser.</span></button><div class="admin-image-url-row"><input type="text" data-image-url placeholder="Image URL or relative path, e.g. Images/product.jpg"><button class="btn-ghost" type="button" data-add-image-url>Add URL</button></div><p class="admin-image-warning" data-image-warning hidden></p><div class="admin-image-list" data-image-list></div></div><label>Short description<textarea name="shortDescription" rows="2">' + adminEsc(p.shortDescription || '') + '</textarea></label><label>Full description<textarea name="description" rows="4">' + adminEsc(p.description || '') + '</textarea></label><div class="form-grid"><label>Processor<input name="processor" value="' + adminEsc(specs.processor || '') + '"></label><label>RAM<input name="ram" value="' + adminEsc(specs.ram || '') + '"></label></div><div class="form-grid"><label>Storage<input name="storage" value="' + adminEsc(specs.storage || '') + '"></label><label>Display<input name="display" value="' + adminEsc(specs.display || '') + '"></label></div><div class="form-grid"><label>Graphics<input name="graphics" value="' + adminEsc(specs.graphics || '') + '"></label><label>Battery<input name="battery" value="' + adminEsc(specs.battery || '') + '"></label></div><div class="form-grid"><label>Rating<input name="rating" type="number" min="0" max="5" step="0.1" value="' + (p.rating || 4.5) + '"></label><label>Reviews<input name="reviews" type="number" min="0" value="' + (p.reviews || 0) + '"></label></div><label>Tags<textarea name="tags" rows="3">' + adminEsc((p.tags || []).join('\n')) + '</textarea></label><label>WhatsApp message template<textarea name="whatsappTemplate" rows="2">' + adminEsc(p.whatsappTemplate || '') + '</textarea></label><div class="admin-checks"><label><input name="featured" type="checkbox" ' + (p.featured ? 'checked' : '') + '> Featured product</label><label><input name="topSelling" type="checkbox" ' + (p.topSelling ? 'checked' : '') + '> Top selling</label><label><input name="topRated" type="checkbox" ' + (p.topRated ? 'checked' : '') + '> Top rated</label><label><input name="active" type="checkbox" value="active" ' + (p.active !== false ? 'checked' : '') + '> Active</label></div><div class="admin-actions"><button class="btn-primary" type="submit">Save product</button><button class="btn-danger" type="button" data-delete-product="' + (p.id || '') + '">Deactivate product</button></div></form>'; };
    const products = () => productForm() + '<section class="admin-panel"><div class="admin-panel-head"><h2>Product Management</h2><button class="btn-primary" type="button" data-new-product>New product</button></div><div class="admin-filters"><input data-product-filter="query" placeholder="Search by name"><select data-product-filter="category"><option value="all">All categories</option><option value="phones">Phones</option><option value="laptops">Laptops</option><option value="macbooks">MacBooks</option><option value="accessories">Accessories</option><option value="services">Services</option></select><select data-product-filter="brand"><option value="all">All brands</option>' + brands().map((b) => '<option value="' + adminEsc(b) + '">' + adminEsc(b) + '</option>').join('') + '</select><select data-product-filter="status"><option value="all">All status</option><option>In Stock</option><option>Low Stock</option><option>Out of Stock</option></select><select data-product-filter="condition"><option value="all">All conditions</option>' + conditions().map((c) => '<option>' + adminEsc(c) + '</option>').join('') + '</select></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Brand</th><th>Price</th><th>Old price</th><th>Stock</th><th>Condition</th><th>Status</th><th>Actions</th></tr></thead><tbody>' + productRows(filtered()) + '</tbody></table></div></section>';
    const orders = () => { const all = loadOrders(); const list = all.filter((o) => orderFilter === 'all' || (o.status || 'Pending') === orderFilter); return '<section class="admin-panel"><div class="admin-panel-head"><h2>Orders</h2><select data-order-filter><option value="all">All orders</option><option>Pending</option><option>Confirmed</option><option>Delivered</option><option>Cancelled</option></select></div><div class="admin-order-list">' + (list.length ? list.map((o) => { const i = all.indexOf(o); const c = o.customer || {}; return '<article class="admin-order"><div><strong>' + adminEsc(o.orderNumber || 'Order') + '</strong><span>' + (o.createdAt ? new Date(o.createdAt).toLocaleString() : '') + '</span></div><div class="admin-order-details"><p><strong>Customer:</strong> ' + adminEsc(c.name || o.name || 'Customer') + '</p><p><strong>Phone:</strong> ' + adminEsc(c.phone || o.phone || '') + '</p><p><strong>Location:</strong> ' + adminEsc(c.location || '') + '</p><p><strong>Delivery:</strong> ' + adminEsc(c.deliveryMethod || '') + ' - ' + adminEsc(c.address || o.deliveryLocation || '') + '</p></div><small>' + adminEsc((o.items || []).map((item) => item.name + ' x ' + item.qty + ' = ' + money(item.lineTotal)).join(', ')) + '</small><div class="admin-order-foot"><strong>' + money(orderTotal(o)) + '</strong><select data-order-status="' + i + '"><option>Pending</option><option>Confirmed</option><option>Delivered</option><option>Cancelled</option></select><a class="btn-whatsapp" href="' + whatsAppLink(null, orderWhatsAppMessage(o)) + '" target="_blank" rel="noopener">WhatsApp</a><button data-complete-order="' + i + '">Mark completed</button></div></article>'; }).join('') : '<div class="empty-state"><h3>No orders found</h3><p>Orders created from checkout will appear here.</p></div>') + '</div></section>'; };
    const categories = () => { const cats = loadCategories(); return '<section class="admin-panel"><h2>Categories</h2><div class="admin-category-grid">' + Object.entries(cats).map(([cat, subs]) => '<article><h3>' + cat + '</h3><textarea data-category-edit="' + cat + '" rows="6">' + subs.join('\n') + '</textarea></article>').join('') + '</div><button class="btn-primary" data-save-categories>Save categories</button></section>'; };
    const services = () => { const inquiries = loadServiceInquiries(); return '<section class="admin-panel"><h2>Services Management</h2><p>Edit service name, group, starting price, image, description, WhatsApp template, and active status from the Product Management form.</p><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Image</th><th>Service</th><th>Group</th><th>Starting price</th><th>Status</th><th>Actions</th></tr></thead><tbody>' + state.products.filter((p) => p.category === 'services').map((p) => '<tr><td data-label="Image"><img src="' + imageFor(p) + '" alt="' + adminEsc(p.name) + '"></td><td data-label="Service">' + adminEsc(p.name) + '</td><td data-label="Group">' + (p.serviceGroup === 'repair' ? 'Repair' : 'Graphic Design') + '</td><td data-label="Starting price">' + displayPrice(p) + '</td><td data-label="Status">' + (p.active === false ? 'Inactive' : 'Active') + '</td><td data-label="Actions"><button type="button" data-edit-product="' + p.id + '">Edit</button></td></tr>').join('') + '</tbody></table></div></section><section class="admin-panel"><h2>Service Inquiries</h2>' + (inquiries.length ? '<div class="admin-order-list">' + inquiries.map((q) => '<article class="admin-order service-inquiry"><div><strong>' + adminEsc(q.service) + '</strong><span>' + (q.createdAt ? new Date(q.createdAt).toLocaleString() : '') + '</span></div><p>' + adminEsc(q.name) + ' - ' + adminEsc(q.phone) + '</p><p>' + adminEsc(q.message) + '</p><small>' + adminEsc(q.group || '') + ' - ' + adminEsc(q.status || 'New') + '</small><a class="btn-whatsapp" href="' + whatsAppLink(null, 'Hello Surge Tech UG, I am following up on service inquiry ' + (q.id || '') + ' for ' + q.service + '.') + '" target="_blank" rel="noopener">WhatsApp</a></article>').join('') + '</div>' : '<div class="empty-state"><h3>No service inquiries yet</h3><p>Service chatbox requests will appear here.</p></div>') + '</section>'; };
    const settings = () => { const st = loadSettings(); return '<section class="admin-panel"><h2>Settings</h2><form class="admin-editor" data-settings-form><div class="form-grid"><label>Business name<input name="businessName" value="' + adminEsc(st.businessName) + '"></label><label>Main phone<input name="phone" value="' + adminEsc(st.phone) + '"></label></div><div class="form-grid"><label>WhatsApp number<input name="whatsapp" value="' + adminEsc(st.whatsapp) + '"></label><label>Location<input name="location" value="' + adminEsc(st.location) + '"></label></div><label>Delivery note<textarea name="deliveryNote" rows="3">' + adminEsc(st.deliveryNote) + '</textarea></label><label>Warranty note<textarea name="warrantyNote" rows="3">' + adminEsc(st.warrantyNote) + '</textarea></label><label>Return policy<textarea name="returnPolicy" rows="3">' + adminEsc(st.returnPolicy) + '</textarea></label><div class="form-grid"><label>Facebook<input name="facebook" value="' + adminEsc(st.facebook) + '"></label><label>Instagram<input name="instagram" value="' + adminEsc(st.instagram) + '"></label><label>TikTok<input name="tiktok" value="' + adminEsc(st.tiktok) + '"></label><label>X<input name="x" value="' + adminEsc(st.x) + '"></label><label>YouTube<input name="youtube" value="' + adminEsc(st.youtube) + '"></label></div><button class="btn-primary">Save settings</button></form></section>'; };
    const backup = () => '<section class="admin-panel"><h2>Backup / Restore</h2><p class="admin-note">Products, settings, orders, and service inquiries save to Supabase when your URL, anon key, and RLS policies are configured. Local admin edits in <strong>surgeAdminProducts</strong> are protected and used first until you export, restore, or migrate them.</p><div class="admin-backup"><button class="btn-primary" data-download-local-products>Download Local Products Backup</button><button class="btn-ghost" data-copy-local-products>Copy Local Products JSON</button><button class="btn-secondary" data-export-products>Export products.json compatible file</button><button class="btn-ghost" data-export-orders>Export orders JSON</button><button class="btn-primary" data-migrate-local-products>Migrate Local Products to Supabase</button><button class="btn-danger" data-reset-products>Reload default products</button></div><label>Restore from backup JSON<textarea data-import-json rows="10" placeholder="Paste a products.json compatible backup here. It can be { &quot;products&quot;: [...] } or an array."></textarea></label><button class="btn-secondary" data-import-products>Restore from backup JSON</button><pre data-export-output></pre></section>';
    const content = () => ({ overview, products, orders, categories, services, settings, backup }[section] || overview)();
    const render = () => { root.innerHTML = '<section class="page-hero"><h1>Admin Dashboard</h1><p>Manage products, orders, services, categories, settings, and backups. Supabase is available when configured; local edited products are protected and shown first.</p></section>' + dbStatus() + (hasLocalAdminProducts() ? '<section class="admin-panel admin-local-rescue"><strong>You have locally edited products saved in this browser.</strong><p>Export or migrate them before resetting.</p></section>' : '') + '<nav class="admin-tabs">' + tabs() + '</nav>' + content(); bind(); };
    const bind = () => {
      root.querySelectorAll('[data-admin-section]').forEach((b) => b.addEventListener('click', () => { section = b.dataset.adminSection; render(); }));
      root.querySelectorAll('[data-product-filter]').forEach((input) => { input.value = filters[input.dataset.productFilter] || 'all'; input.addEventListener('input', () => { filters[input.dataset.productFilter] = input.dataset.productFilter === 'query' ? input.value.toLowerCase() : input.value; render(); }); });
      root.querySelectorAll('[data-edit-product]').forEach((b) => b.addEventListener('click', () => { selectedId = b.dataset.editProduct; section = 'products'; render(); root.querySelector('[data-admin-form]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
      root.querySelectorAll('[data-duplicate-product]').forEach((b) => b.addEventListener('click', async () => { try { const p = productById(b.dataset.duplicateProduct); if (!p) return; const copySlug = p.id + '-copy-' + Date.now().toString().slice(-4); const copy = { ...p, dbId: '', id: copySlug, slug: copySlug, name: p.name + ' Copy', createdAt: todayStamp(), updatedAt: todayStamp() }; const saved = await saveAdminProduct(copy); selectedId = saved.id; section = 'products'; toast(state.supabaseOnline ? 'Product duplicated in Supabase' : 'Product duplicated in local cache'); render(); } catch (error) { toast(error.message || 'Could not duplicate product'); } }));
      root.querySelectorAll('[data-delete-product]').forEach((b) => b.addEventListener('click', async () => { try { const product = productById(b.dataset.deleteProduct); if (!product) return; if (!confirm('Deactivate ' + product.name + '? It will stop showing on the storefront but stay in the database.')) return; await deactivateAdminProduct(product); selectedId = state.products[0]?.id || ''; toast('Product deactivated'); render(); } catch (error) { toast(error.message || 'Could not deactivate product'); } }));
      root.querySelectorAll('[data-new-product]').forEach((b) => b.addEventListener('click', async () => { try { const p = normalizeProducts([{ id: 'new-product-' + Date.now().toString().slice(-5), name: 'New Product', category: 'accessories', subcategory: 'Phone Accessories', brand: 'Surge Tech', model: '', price: 0, oldPrice: 0, stock: 1, status: 'In Stock', images: [fallbackImages.accessories], shortDescription: 'Available from Surge Tech UG.', description: 'Available from Surge Tech UG.', specs: {}, tags: [] }])[0]; const saved = await saveAdminProduct(p); selectedId = saved.id; section = 'products'; render(); root.querySelector('[data-admin-form] input[name="name"]')?.focus(); toast(state.supabaseOnline ? 'New product created in Supabase' : 'New product created in local cache'); } catch (error) { toast(error.message || 'Could not create product'); } }));
      root.querySelector('[data-admin-form]')?.addEventListener('submit', async (event) => { event.preventDefault(); try { const previous = selected(); const nextProduct = productFormValues(event.currentTarget, previous); const saved = await saveAdminProduct(nextProduct); selectedId = saved.id; toast(state.supabaseOnline ? 'Product saved to Supabase.' : 'Product saved locally. It will show on this browser. To make it permanent online, export products JSON or migrate to Supabase.'); render(); } catch (error) { toast(error.message || 'Could not save product'); } });
      const form = root.querySelector('[data-admin-form]'); if (form) { form.category.value = selected().category || 'accessories'; form.status.value = productStatus(selected()); form.condition.value = selected().condition || 'Brand New'; form.serviceGroup.value = selected().serviceGroup || ''; initAdminImageManager(form); }
      root.querySelectorAll('[data-order-status]').forEach((select) => { const orders = loadOrders(); select.value = orders[select.dataset.orderStatus]?.status || 'Pending'; select.addEventListener('change', async () => { try { orders[select.dataset.orderStatus].status = select.value; const supabase = await loadSupabaseClient(); if (supabase && orders[select.dataset.orderStatus]?.orderNumber) { const { error } = await supabase.from('orders').update({ status: select.value }).eq('order_number', orders[select.dataset.orderStatus].orderNumber); if (error) throw error; } saveOrders(orders); toast('Order updated'); render(); } catch (error) { toast(error.message || 'Could not update order'); } }); });
      root.querySelector('[data-order-filter]')?.addEventListener('input', (event) => { orderFilter = event.target.value; render(); });
      const orderFilterInput = root.querySelector('[data-order-filter]'); if (orderFilterInput) orderFilterInput.value = orderFilter;
      root.querySelectorAll('[data-complete-order]').forEach((b) => b.addEventListener('click', async () => { const orders = loadOrders(); orders[b.dataset.completeOrder].status = 'Delivered'; const supabase = await loadSupabaseClient(); if (supabase && orders[b.dataset.completeOrder]?.orderNumber) await supabase.from('orders').update({ status: 'Delivered' }).eq('order_number', orders[b.dataset.completeOrder].orderNumber); saveOrders(orders); toast('Order marked completed'); render(); }));
      root.querySelector('[data-save-categories]')?.addEventListener('click', () => { const cats = {}; root.querySelectorAll('[data-category-edit]').forEach((input) => { cats[input.dataset.categoryEdit] = input.value.split(/\n|,/).map((item) => item.trim()).filter(Boolean); }); localStorage.setItem('surgeCategories', JSON.stringify(cats)); toast('Categories saved'); });
      root.querySelector('[data-settings-form]')?.addEventListener('submit', async (event) => { event.preventDefault(); try { const data = { ...loadSettings(), ...Object.fromEntries(new FormData(event.currentTarget).entries()) }; await saveSettingsOnline(data); toast(state.supabaseOnline ? 'Settings saved to Supabase' : 'Settings saved locally because Supabase is not configured'); render(); } catch (error) { toast(error.message || 'Could not save settings'); } });
      root.querySelectorAll('[data-test-supabase]').forEach((b) => b.addEventListener('click', async () => { const result = await testSupabaseConnection(); root.querySelectorAll('[data-db-status-output]').forEach((node) => { node.textContent = result.message; }); toast(result.message); }));
      root.querySelectorAll('[data-download-local-products]').forEach((b) => b.addEventListener('click', () => { const local = loadLocalAdminProducts(); const exportData = productsBackupData(local.length ? local : state.products); root.querySelectorAll('[data-export-output]').forEach((node) => { node.textContent = JSON.stringify(exportData, null, 2); }); downloadJson(backupFilename(), exportData); toast(local.length ? 'Local products backup downloaded.' : 'No local products found. Current products backup downloaded.'); }));
      root.querySelectorAll('[data-copy-local-products]').forEach((b) => b.addEventListener('click', async () => { const local = loadLocalAdminProducts(); const exportData = productsBackupData(local.length ? local : state.products); root.querySelectorAll('[data-export-output]').forEach((node) => { node.textContent = JSON.stringify(exportData, null, 2); }); try { await copyJson(exportData); toast('Products JSON copied to clipboard.'); } catch { toast('Could not copy automatically. Select and copy the JSON shown below.'); } }));
      root.querySelectorAll('[data-export-products]').forEach((b) => b.addEventListener('click', () => { const local = loadLocalAdminProducts(); const exportData = productsBackupData(local.length ? local : state.products); root.querySelectorAll('[data-export-output]').forEach((node) => { node.textContent = JSON.stringify(exportData, null, 2); }); downloadJson(backupFilename('products'), exportData); toast('products.json compatible backup downloaded.'); }));
      root.querySelector('[data-export-orders]')?.addEventListener('click', () => { root.querySelector('[data-export-output]').textContent = JSON.stringify(loadOrders(), null, 2); });
      root.querySelectorAll('[data-migrate-local-products]').forEach((b) => b.addEventListener('click', async () => { try { const result = await migrateLocalProductsToSupabase(); root.querySelectorAll('[data-export-output]').forEach((node) => { node.textContent = JSON.stringify(result, null, 2); }); toast(result.message || `Migrated ${result.migrated.length} products to Supabase${result.failed.length ? '; check failed list below.' : '.'}`); } catch (error) { toast(error.message || 'Could not migrate products'); } }));
      root.querySelector('[data-reset-products]')?.addEventListener('click', async () => { if (!confirm('This may remove locally edited admin products from this browser. Export backup first. Continue?')) return; await resetAdminProducts(true); selectedId = state.products[0]?.id || ''; toast('Products reloaded'); render(); });
      root.querySelector('[data-import-products]')?.addEventListener('click', async () => { try { const raw = root.querySelector('[data-import-json]').value; const data = JSON.parse(raw); const products = validateImportedProducts(Array.isArray(data) ? data : data.products); saveAdminProducts(products); if (supabaseReady() && confirm('Also upload restored products to Supabase?')) for (const product of products) await saveAdminProduct(product); selectedId = state.products[0]?.id || ''; toast(supabaseReady() ? 'Products restored locally. Supabase upload attempted if confirmed.' : 'Products restored locally.'); render(); } catch (error) { toast(error.message || 'Invalid JSON import'); } });
    };
    render();
  }


  function renderCheckout(root) {
    const items = state.cart.map((item) => ({ item, product: productById(item.id) })).filter((line) => line.product);
    const subtotal = cartTotal();
    const delivery = subtotal > 0 ? 10000 : 0;
    const settings = loadSettings();
    root.innerHTML = `
      <section class="page-hero"><h1>Checkout</h1><p>Complete your order with delivery and payment details.</p></section>
      <div class="checkout-grid">
        <form class="checkout-form" data-checkout>
          <h2>Customer information</h2>
          <div class="form-grid"><input required name="name" autocomplete="name" placeholder="Full name"><input required name="phone" autocomplete="tel" placeholder="Phone number"></div>
          <h2>Delivery</h2>
          <div class="form-grid"><input required name="location" placeholder="Location / area"><select required name="deliveryMethod"><option value="">Delivery method</option><option>Pickup</option><option>Kampala delivery</option><option>Upcountry delivery</option></select></div>
          <textarea required name="address" rows="4" placeholder="Delivery details / exact address"></textarea>
          <details class="optional-checkout"><summary>More details optional</summary><div class="form-grid"><input name="secondPhone" autocomplete="tel" placeholder="Second phone number (optional)"><input name="email" type="email" autocomplete="email" placeholder="Email address (optional)"><select name="payment"><option value="">Payment method (optional)</option><option>Mobile Money</option><option>Cash on Delivery</option><option>Bank Transfer</option></select></div><textarea name="notes" rows="3" placeholder="Extra notes (optional)"></textarea></details>
          <p class="checkout-help">We shall confirm payment after checking availability.</p>
          <button class="btn-primary" type="submit">Continue to WhatsApp Confirmation</button>
        </form>
        <aside class="summary-card"><h2>Order Summary</h2>${items.length ? items.map(({ item, product }) => `<div class="summary-row"><span>${product.name} x ${item.qty}</span><strong>${money(parsePrice(product.price) * item.qty)}</strong></div>`).join("") : `<div class="empty-state"><h3>Your cart is empty</h3><p>Add products before checkout.</p><a class="btn-primary" href="index.html">Continue Shopping</a></div>`}<div class="summary-row"><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div class="summary-row"><span>Delivery estimate</span><strong>${money(delivery)}</strong></div><div class="summary-row"><span>Grand total</span><strong>${money(subtotal + delivery)}</strong></div><p>${settings.deliveryNote}</p><p class="checkout-help">After submitting, send the full order on WhatsApp so Surge Tech can confirm availability and delivery.</p></aside>
      </div>
    `;
    document.querySelector("[data-checkout]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!items.length) {
        toast("Your cart is empty");
        return;
      }
      const form = new FormData(event.currentTarget);
      const order = {
        orderNumber: `ST-${Date.now().toString().slice(-6)}`,
        createdAt: new Date().toISOString(),
        customer: {
          name: form.get("name").trim(),
          phone: form.get("phone").trim(),
          secondPhone: form.get("secondPhone").trim(),
          email: form.get("email").trim(),
          location: form.get("location").trim(),
          address: form.get("address").trim(),
          deliveryMethod: form.get("deliveryMethod"),
          payment: form.get("payment"),
          notes: form.get("notes").trim(),
        },
        items: items.map(({ item, product }) => ({
          id: product.id,
          name: product.name,
          price: parsePrice(product.price),
          qty: item.qty,
          lineTotal: parsePrice(product.price) * item.qty,
        })),
        subtotal,
        delivery,
        total: subtotal + delivery,
      };
      if (!order.customer.name || !order.customer.phone || !order.customer.location || !order.customer.address || !order.customer.deliveryMethod) {
        toast("Please complete all checkout details");
        return;
      }
      try {
        const savedOrder = await saveOrderOnline(order);
        localStorage.setItem("surgeLastOrder", JSON.stringify(savedOrder));
      } catch (error) {
        console.error("Order save failed", error);
        toast("Could not save order online. Please try again or confirm on WhatsApp.");
        return;
      }
      state.cart = [];
      save();
      location.href = `confirmation.html?order=${order.orderNumber}`;
    });
  }

  function renderCartPage(root) {
    const delivery = cartTotal() > 0 ? 10000 : 0;
    root.innerHTML = `<section class="page-hero"><h1>Your Cart</h1><p>Review products, update quantities, and proceed to checkout.</p></section><div class="checkout-grid"><div class="summary-card"><div data-page-cart></div></div><aside class="summary-card"><h2>Summary</h2><div class="summary-row"><span>Total items</span><strong>${cartCount()}</strong></div><div class="summary-row"><span>Subtotal</span><strong>${money(cartTotal())}</strong></div><div class="summary-row"><span>Delivery</span><strong>${money(delivery)}</strong></div><div class="summary-row"><span>Grand total</span><strong>${money(cartTotal() + delivery)}</strong></div><a class="btn-primary" style="width:100%;margin-top:12px" href="checkout.html">Proceed to Checkout</a></aside></div>`;
    const list = document.querySelector("[data-page-cart]");
    const lines = state.cart.map((item) => ({ item, product: productById(item.id) })).filter((line) => line.product);
    list.innerHTML = lines.length
      ? lines
          .map(({ item, product }) => `<div class="cart-line"><img src="${imageFor(product)}" onerror="this.onerror=null;this.src='${imageFallbackFor(product)}'" alt="${product.name}"><div><h4>${product.name}</h4><strong>${money(parsePrice(product.price) * item.qty)}</strong><div class="cart-qty"><button data-dec="${product.id}">-</button><span>${item.qty}</span><button data-inc="${product.id}">+</button></div></div><button class="btn-danger" data-remove="${product.id}">Remove</button></div>`)
          .join("")
      : `<div class="empty-state"><h3>Your cart is empty</h3><a class="btn-primary" href="index.html">Continue Shopping</a></div>`;
  }

  function renderWishlist(root) {
    const products = state.wishlist.map(productById).filter(Boolean);
    root.innerHTML = `<section class="page-hero"><h1>Wishlist</h1><p>Saved products for later.</p></section><section class="section"><div class="product-grid">${products.length ? products.map(productCard).join("") : `<div class="empty-state"><h3>No saved products yet</h3></div>`}</div></section>`;
  }

  function renderConfirmation(root) {
    const fallbackOrder = { orderNumber: new URLSearchParams(location.search).get("order") || "ST-ORDER", customer: {}, items: [], subtotal: 0, delivery: 0, total: 0 };
    let order = fallbackOrder;
    try {
      order = JSON.parse(localStorage.getItem("surgeLastOrder") || "null") || fallbackOrder;
    } catch {
      order = fallbackOrder;
    }
    root.innerHTML = `<section class="page-hero"><h1>Order received</h1><p>Your order number is ${order.orderNumber}. Surge Tech will confirm availability and delivery.</p></section><section class="section trust-card confirmation-card"><h2>Next steps</h2><p>Send your order on WhatsApp so we can confirm availability, delivery, and payment.</p><div class="confirmation-summary"><strong>${order.orderNumber}</strong><span>${order.customer?.name || "Customer"} · ${order.customer?.phone || ""}</span><span>${order.customer?.location || ""}</span><span>${(order.items || []).length} item(s) · ${money(order.total)}</span></div><a class="btn-whatsapp" href="${whatsAppLink(null, orderWhatsAppMessage(order))}" target="_blank" rel="noopener">Send Order on WhatsApp</a></section>`;
  }

  function bindGlobalEvents() {
    const closeMobileSurfaces = () => {
      document.querySelector("[data-cart-drawer]")?.classList.remove("open");
      document.querySelector("[data-mobile-menu]")?.classList.remove("open");
      document.querySelector(".filter-panel.open")?.classList.remove("open");
      document.querySelector("[data-overlay]")?.classList.remove("open");
      document.body.classList.remove("menu-locked");
    };
    document.addEventListener("click", (event) => {
      const add = event.target.closest("[data-add]");
      if (add) addToCart(add.dataset.add);
      const wish = event.target.closest("[data-wish]");
      if (wish) {
        event.preventDefault();
        toggleWishlist(wish.dataset.wish);
      }
      if (event.target.closest("[data-open-cart]")) {
        document.querySelector("[data-cart-drawer]").classList.add("open");
        document.querySelector("[data-overlay]").classList.add("open");
        document.body.classList.add("menu-locked");
      }
      if (event.target.closest("[data-close-cart]") || event.target.matches("[data-overlay]")) {
        closeMobileSurfaces();
      }
      const inc = event.target.closest("[data-inc]");
      if (inc) {
        const item = state.cart.find((line) => line.id === inc.dataset.inc);
        setCartQty(inc.dataset.inc, (item?.qty || 1) + 1);
        if (document.querySelector('[data-page="cart"]')) renderCartPage(document.querySelector('[data-page="cart"]'));
      }
      const dec = event.target.closest("[data-dec]");
      if (dec) {
        const item = state.cart.find((line) => line.id === dec.dataset.dec);
        setCartQty(dec.dataset.dec, (item?.qty || 1) - 1);
        if (document.querySelector('[data-page="cart"]')) renderCartPage(document.querySelector('[data-page="cart"]'));
      }
      const remove = event.target.closest("[data-remove]");
      if (remove) {
        removeFromCart(remove.dataset.remove);
        if (document.querySelector('[data-page="cart"]')) renderCartPage(document.querySelector('[data-page="cart"]'));
      }
      const slide = event.target.closest("[data-slide]");
      if (slide) {
        state.slide = Number(slide.dataset.slide);
        updateHero();
      }
      if (event.target.closest("[data-mobile-menu-button]")) {
        event.preventDefault();
        document.querySelector("[data-mobile-menu]")?.classList.add("open");
        document.querySelector("[data-overlay]")?.classList.add("open");
        document.body.classList.add("menu-locked");
      }
      if (event.target.closest("[data-close-mobile-menu]")) closeMobileSurfaces();
      const serviceTrigger = event.target.closest("[data-service-chat]");
      if (serviceTrigger) {
        const service = productById(serviceTrigger.dataset.serviceChat);
        if (service) openServiceChat(service);
      }
      if (event.target.closest("[data-back-top]")) scrollTo({ top: 0, behavior: "smooth" });
    });

    document.querySelector("[data-category-jump]")?.addEventListener("change", (event) => (location.href = event.target.value));
    const form = document.querySelector("[data-search-form]");
    const input = document.querySelector("[data-search-input]");
    const suggestions = document.querySelector("[data-suggestions]");
    const renderSearchSuggestions = () => {
      if (!input || !suggestions) return;
      const query = input.value.toLowerCase().trim();
      if (!query) {
        const recentSearches = loadRecentSearches();
        suggestions.innerHTML = recentSearches.length
          ? `<div class="suggestion-title">Recent searches</div>${recentSearches.map((item) => `<a class="suggestion-item recent-search" href="search.html?q=${encodeURIComponent(item)}"><span><strong>${item}</strong><br><small>Search again</small></span><small>Recent</small></a>`).join("")}`
          : `<div class="suggestion-item">Start typing to search products</div>`;
        suggestions.classList.add("active");
        return;
      }
      const found = storefrontProducts()
        .filter((product) => [product.name, product.brand, product.category, product.subcategory, product.model, product.shortDescription, product.description, (product.tags || []).join(" "), specList(product).join(" ")].join(" ").toLowerCase().includes(query))
        .slice(0, 8);
      suggestions.innerHTML = found.length
        ? found.map((product) => `<a class="suggestion-item" href="product.html?id=${encodeURIComponent(product.id)}"><img src="${imageFor(product)}" onerror="this.onerror=null;this.src='${imageFallbackFor(product)}'" alt="${product.name}"><span><strong>${product.name}</strong><br><small>${displayPrice(product)}</small></span><small>${titleFor(product.category)}</small></a>`).join("")
        : `<div class="suggestion-item">No results found</div>`;
      suggestions.classList.add("active");
    };
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = input.value.trim();
      saveRecentSearch(query);
      location.href = `search.html?q=${encodeURIComponent(query)}`;
    });
    input?.addEventListener("input", renderSearchSuggestions);
    input?.addEventListener("focus", renderSearchSuggestions);
    document.addEventListener("click", (event) => {
      if (!event.target.closest("[data-search-form]")) suggestions?.classList.remove("active");
    });
    window.addEventListener("scroll", () => document.querySelector("[data-back-top]")?.classList.toggle("show", scrollY > 480));
  }

  function updateHero() {
    document.querySelectorAll(".hero-slide").forEach((slide, index) => slide.classList.toggle("active", index === state.slide));
    document.querySelectorAll(".hero-dot").forEach((dot, index) => dot.classList.toggle("active", index === state.slide));
  }

  function startHero() {
    setInterval(() => {
      const slides = document.querySelectorAll(".hero-slide");
      if (!slides.length) return;
      state.slide = (state.slide + 1) % slides.length;
      updateHero();
    }, 4300);
  }

  async function init() {
    await loadSettingsOnline();
    renderShell();
    bindGlobalEvents();
    const root = document.querySelector("[data-page]");
    await loadProducts(root?.dataset.page === "admin");
    await Promise.all([loadOrdersOnline(), loadServiceInquiriesOnline()]);
    state.cart = state.cart.filter((item) => productById(item.id));
    state.wishlist = state.wishlist.filter((id) => productById(id));
    save();
    if (root) {
      const page = root.dataset.page;
      document.body.dataset.page = page;
      document.body.classList.add(`page-${page}`);
      if (page === "home") renderHome(root);
      else if (page === "product") renderProduct(root);
      else if (page === "checkout") renderCheckout(root);
      else if (page === "cart") renderCartPage(root);
      else if (page === "wishlist") renderWishlist(root);
      else if (page === "admin") renderAdmin(root);
      else if (page === "confirmation") renderConfirmation(root);
      else if (page === "services") {
        renderServices(root);
      } else if (page === "search") {
        state.filters.query = new URLSearchParams(location.search).get("q") || "";
        saveRecentSearch(state.filters.query);
        renderCategory(root, "all");
        const queryInput = document.querySelector('[data-filter="query"]');
        if (queryInput) queryInput.value = state.filters.query;
        refreshCategory();
      } else {
        renderCategory(root, page);
      }
    }
    renderFooter();
    renderCartDrawer();
    updateBadges();
  }

  return { init, addToCart, toggleWishlist, loadProducts, saveAdminProducts, resetAdminProducts };
})();

document.addEventListener("DOMContentLoaded", SurgeStore.init);
