const products = []
let currentSlide = 0
let autoplayTimer = null
let selectedProduct = null
let quantity = 1
let isFavorite = false
let cartCount = 0

function parsePrice(value) {
  if (value == null) return 0
  return Number(String(value).replace(/[^0-9]/g, '')) || 0
}

function createStars(rating) {
  return '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating))
}

function showToast(message) {
  let toast = document.querySelector('.toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.className = 'toast'
    document.body.appendChild(toast)
  }
  toast.textContent = message
  toast.classList.add('show')
  setTimeout(() => toast.classList.remove('show'), 2200)
}

function updateCartCounter() {
  const counter = document.getElementById('cartCount')
  if (counter) counter.textContent = cartCount
}

function renderCollection(title, items, pageLink) {
  if (!items.length) return ''

  return `
    <div class="featured-group">
      <div class="section-header">
        <h2>${title}</h2>
        <a class="section-link" href="${pageLink}">See all</a>
      </div>
      <div class="products-grid">
        ${items
          .map((product) => {
            const priceValue = parsePrice(product.price)
            const originalValue = parsePrice(product.originalPrice)
            const discount = originalValue ? Math.round(((originalValue - priceValue) / originalValue) * 100) : 0
            const stars = createStars(product.rating || 4)

            return `
              <article class="product-card" onclick="window.location.href='product.html?id=${encodeURIComponent(product.id)}'">
                <div class="product-image">
                  <img src="${product.images[0]}" alt="${product.name}" />
                  ${discount > 0 ? `<div class="discount-badge">${discount}% OFF</div>` : ''}
                </div>
                <div class="product-info">
                  <div class="product-name">${product.name}</div>
                  <div class="product-rating"><span class="stars">${stars}</span><span class="review-count">(${product.reviews || 42})</span></div>
                  <div class="product-price">
                    <span class="current-price">${product.price}</span>
                    ${originalValue ? `<span class="original-price">${product.originalPrice}</span>` : ''}
                  </div>
                  <button class="add-btn" onclick="event.stopPropagation(); window.location.href='product.html?id=${encodeURIComponent(product.id)}'">View Details</button>
                </div>
              </article>
            `
          })
          .join('')}
      </div>
    </div>
  `
}

function renderHomepageProducts() {
  const grid = document.getElementById('productsGrid')
  if (!grid) return

  const macbooks = products.filter((p) => p.category === 'macbooks')
  const phones = products.filter((p) => p.category === 'phones')
  const accessories = products.filter((p) => p.category === 'accessories')

  grid.innerHTML = `
    ${renderCollection('MacBooks', macbooks.slice(0, 8), 'computers.html')}
    ${renderCollection('Phones', phones.slice(0, 8), 'phones.html')}
    ${renderCollection('Accessories', accessories.slice(0, 8), 'accessories.html')}
  `
}

function renderProductDetail() {
  const container = document.getElementById('productRoot')
  if (!container) return

  const params = new URLSearchParams(window.location.search)
  const productId = params.get('id')
  const product = products.find((p) => p.id === productId)

  if (!product) {
    container.innerHTML = '<p>Product not found. Please return to the homepage.</p>'
    return
  }

  const priceValue = parsePrice(product.price)
  const originalValue = parsePrice(product.originalPrice)
  const discount = originalValue ? Math.round(((originalValue - priceValue) / originalValue) * 100) : 0
  const stars = createStars(product.rating || 4)

  container.innerHTML = `
    <div class="product-layout">
      <div>
        <div class="gallery-main"><img src="${product.images[0]}" alt="${product.name}" /></div>
        <div class="gallery-thumbs">
          ${product.images
            .map((image) => `<div class="thumb"><img src="${image}" alt="${product.name}" /></div>`)
            .join('')}
        </div>
      </div>
      <div>
        <div class="product-detail-card">
          <h1>${product.name}</h1>
          <div class="product-rating"><span class="stars">${stars}</span> <span>(${product.reviews || 45} reviews)</span></div>
          <div class="product-price-detail">
            <span class="current-price">${product.price}</span>
            ${originalValue ? `<span class="original-price">${product.originalPrice}</span>` : ''}
          </div>
          ${discount > 0 ? `<div class="discount-badge">Save ${discount}%</div>` : ''}
          <p>${product.description}</p>
          <div class="specs detail-specs">
            <h4>Specifications</h4>
            ${product.specs ? product.specs.map((spec) => `<div class="spec-item"><span class="spec-dot"></span>${spec}</div>`).join('') : ''}
          </div>
          <div class="quantity-selector">
            <label>Quantity:</label>
            <div class="quantity-controls">
              <button onclick="decreaseQty()">-</button>
              <span id="quantityValue">1</span>
              <button onclick="increaseQty()">+</button>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-add-cart" onclick="addToCart()">🛒 Add to Cart</button>
            <button class="btn-favorite" id="favoriteBtn" onclick="toggleFavorite()">❤</button>
          </div>
        </div>
      </div>
    </div>
  `

  selectedProduct = product
}

function openModal(productId) {
  selectedProduct = products.find((p) => p.id === productId)
  if (!selectedProduct) return

  quantity = 1
  isFavorite = false

  const priceValue = parsePrice(selectedProduct.price)
  const originalValue = parsePrice(selectedProduct.originalPrice)
  const discount = originalValue ? Math.round(((originalValue - priceValue) / originalValue) * 100) : 0
  const stars = createStars(selectedProduct.rating || 4)

  document.getElementById('modalImage').src = selectedProduct.images[0] || 'https://via.placeholder.com/400x300?text=No+Image'
  document.getElementById('modalName').textContent = selectedProduct.name
  document.getElementById('modalPrice').textContent = selectedProduct.price
  document.getElementById('modalOriginalPrice').textContent = selectedProduct.originalPrice || ''
  document.getElementById('modalDiscount').textContent = discount > 0 ? `Save ${selectedProduct.currency || ''}${parsePrice(selectedProduct.originalPrice) - parsePrice(selectedProduct.price)} (${discount}%)` : ''
  document.getElementById('modalRating').textContent = stars
  document.getElementById('modalReviews').textContent = `${selectedProduct.rating || 4} (${selectedProduct.reviews || 45} reviews)`
  document.getElementById('modalDescription').textContent = selectedProduct.description
  document.getElementById('quantityValue').textContent = quantity
  document.getElementById('favoriteBtn').classList.remove('active')
  document.getElementById('modalSpecs').innerHTML = (selectedProduct.specs || []).map((spec) => `<div class="spec-item"><span class="spec-dot"></span>${spec}</div>`).join('')

  document.getElementById('productModal').classList.add('active')
}

function closeModal() {
  document.getElementById('productModal').classList.remove('active')
}

function increaseQty() {
  quantity++
  const value = document.getElementById('quantityValue')
  if (value) value.textContent = quantity
}

function decreaseQty() {
  if (quantity > 1) {
    quantity--
    const value = document.getElementById('quantityValue')
    if (value) value.textContent = quantity
  }
}

function toggleFavorite() {
  isFavorite = !isFavorite
  document.getElementById('favoriteBtn').classList.toggle('active', isFavorite)
}

function addToCart() {
  if (!selectedProduct) return
  cartCount += quantity
  updateCartCounter()
  showToast(`${selectedProduct.name} added to cart (${quantity})`)
  closeModal()
}

function initSearchOverlay() {
  const overlay = document.createElement('div')
  overlay.className = 'search-overlay'
  overlay.innerHTML = `
    <div class="search-box">
      <input class="search-input" placeholder="Search products, brands..." aria-label="Search products" />
      <div class="search-results"></div>
    </div>
  `

  document.body.appendChild(overlay)
  const input = overlay.querySelector('.search-input')
  const results = overlay.querySelector('.search-results')

  function openSearch() {
    overlay.style.display = 'flex'
    input.focus()
    input.value = ''
    results.innerHTML = ''
  }

  function closeSearch() {
    overlay.style.display = 'none'
  }

  document.querySelectorAll('.btn-search').forEach((button) => {
    button.addEventListener('click', function (e) {
      e.preventDefault()
      openSearch()
    })
  })

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeSearch()
  })

  let timer = null
  input.addEventListener('input', function () {
    clearTimeout(timer)
    timer = setTimeout(() => {
      renderResults(input.value.trim())
    }, 180)
  })

  function renderResults(query) {
    results.innerHTML = ''
    if (!query) return

    const search = query.toLowerCase()
    const found = products.filter((product) => {
      return (
        product.name.toLowerCase().includes(search) ||
        (product.brand || '').toLowerCase().includes(search) ||
        (product.category || '').toLowerCase().includes(search)
      )
    })

    if (!found.length) {
      results.innerHTML = '<div style="padding:12px;color:#666">No results found</div>'
      return
    }

    found.slice(0, 50).forEach((product) => {
      const link = document.createElement('a')
      link.className = 'search-item'
      link.href = 'product.html?id=' + encodeURIComponent(product.id)

      const img = document.createElement('img')
      img.src = product.images[0] || 'https://via.placeholder.com/120x120?text=No+Image'
      img.onerror = function () {
        img.src = 'https://via.placeholder.com/120x120?text=No+Image'
      }

      const info = document.createElement('div')
      info.innerHTML = `<h4>${product.name}</h4><div style="color:var(--text-secondary);font-size:13px">${product.price}</div>`
      link.appendChild(img)
      link.appendChild(info)
      results.appendChild(link)
    })
  }
}

function initContactToggle() {
  document.querySelectorAll('.contact-btn.call').forEach((btn) => {
    btn.addEventListener('click', function (e) {
      e.preventDefault()
      let panel = document.querySelector('.call-panel')
      if (panel) {
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block'
        return
      }

      panel = document.createElement('div')
      panel.className = 'call-panel'
      panel.innerHTML = `<div class="close">✕</div><a href="tel:0776036580">📞 0776036580</a>`
      document.body.appendChild(panel)
      panel.style.display = 'block'
      panel.querySelector('.close').addEventListener('click', () => {
        panel.style.display = 'none'
      })
    })
  })
}

function updateSlider() {
  const slides = document.querySelectorAll('.slide')
  const indicators = document.querySelectorAll('.indicator')
  slides.forEach((slide, idx) => {
    slide.classList.toggle('slide-active', idx === currentSlide)
  })
  indicators.forEach((indicator, idx) => {
    indicator.classList.toggle('active', idx === currentSlide)
  })
}

function setSlide(index) {
  const slides = document.querySelectorAll('.slide')
  if (!slides.length) return
  currentSlide = (index + slides.length) % slides.length
  updateSlider()
}

function nextSlide() {
  const slides = document.querySelectorAll('.slide')
  if (!slides.length) return
  currentSlide = (currentSlide + 1) % slides.length
  updateSlider()
}

function prevSlide() {
  const slides = document.querySelectorAll('.slide')
  if (!slides.length) return
  currentSlide = (currentSlide - 1 + slides.length) % slides.length
  updateSlider()
}

function goToSlide(index) {
  setSlide(index)
}

function startAutoplay() {
  clearInterval(autoplayTimer)
  autoplayTimer = setInterval(() => {
    nextSlide()
  }, 4200)
}

document.addEventListener('DOMContentLoaded', () => {
  fetch('products.json')
    .then((response) => response.json())
    .then((data) => {
      if (data && Array.isArray(data.products)) {
        products.push(...data.products)
      }
      renderHomepageProducts()
      renderProductDetail()
      initSearchOverlay()
      initContactToggle()
      startAutoplay()
      updateCartCounter()
    })
    .catch(() => {
      renderHomepageProducts()
      renderProductDetail()
      initSearchOverlay()
      initContactToggle()
      startAutoplay()
      updateCartCounter()
    })
})
