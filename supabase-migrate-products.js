/*
  Surge Tech UG product migration helper

  How to use:
  1. Run supabase-schema.sql in Supabase first.
  2. Paste your Supabase URL and anon public key below.
  3. Make sure your RLS/admin policy allows this browser session to insert/update products.
     For a one-time migration, you can temporarily allow the insert/update policy, run the
     migration, then lock the policy back down to admin-only access.
  4. Open the website in a browser and run:
       <script src="supabase-migrate-products.js"></script>
     or paste this file into the browser console, then call:
       SURGE_SUPABASE_MIGRATION.run()

  Never paste a Supabase service role/private key into this file.
*/

window.SURGE_SUPABASE_MIGRATION = (() => {
  const SUPABASE_URL = ""; // Paste your Supabase project URL here.
  const SUPABASE_ANON_KEY = ""; // Paste your anon public key here. Never use the service role key.
  const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

  const slugify = (value) => String(value || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const parsePrice = (value) => Number(String(value || "").replace(/[^0-9]/g, "")) || 0;
  const categoryKey = (value) => String(value || "accessories").toLowerCase().replace(/\s+/g, "");
  const normalizeCategory = (value) =>
    ({ phones: "phones", phone: "phones", laptops: "laptops", laptop: "laptops", macbooks: "macbooks", macbook: "macbooks", accessories: "accessories", accessory: "accessories", services: "services", service: "services" }[categoryKey(value)] || categoryKey(value));

  async function loadClient() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Paste SUPABASE_URL and SUPABASE_ANON_KEY in supabase-migrate-products.js first.");
    if (!window.supabase?.createClient) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = SUPABASE_CDN;
        script.onload = resolve;
        script.onerror = () => reject(new Error("Could not load Supabase JavaScript client."));
        document.head.appendChild(script);
      });
    }
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  function productToRow(product) {
    const specs = Array.isArray(product.specs) ? {} : product.specs || {};
    return {
      local_id: product.localId || product.local_id || product.id || product.slug || slugify(product.name),
      name: product.name,
      slug: product.slug || product.id || slugify(product.name),
      category: normalizeCategory(product.category),
      subcategory: product.subcategory || "",
      brand: product.brand || "",
      model: product.model || product.name || "",
      condition: product.condition || "",
      price: parsePrice(product.price),
      old_price: parsePrice(product.oldPrice || product.originalPrice) || null,
      currency: product.currency || "UGX",
      stock: Number(product.stock || 1),
      status: product.status || "",
      rating: Number(product.rating || 4.5),
      reviews: Number(product.reviews || 0),
      short_description: product.shortDescription || "",
      description: product.description || product.shortDescription || "",
      specs: {
        ...(Array.isArray(product.specs) ? { list: product.specs } : specs),
      },
      tags: Array.isArray(product.tags) ? product.tags : [],
      images: Array.isArray(product.images) ? product.images : product.image ? [product.image] : [],
      featured: Boolean(product.featured),
      top_selling: Boolean(product.topSelling),
      service_group: product.serviceGroup || "",
      active: product.active !== false,
      whatsapp_template: product.whatsappTemplate || "",
      updated_at: new Date().toISOString(),
    };
  }

  async function run() {
    const client = await loadClient();
    const response = await fetch("products.json");
    const data = await response.json();
    const products = Array.isArray(data) ? data : data.products;
    if (!Array.isArray(products) || !products.length) throw new Error("products.json did not contain products.");
    const rows = products.map(productToRow);
    const { error } = await client.from("products").upsert(rows, { onConflict: "local_id" });
    if (error) throw error;
    console.log(`Imported ${rows.length} products into Supabase.`);
    return rows.length;
  }

  return { run, productToRow };
})();
