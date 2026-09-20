import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Filter,
  Heart,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  PackageCheck,
  Phone,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  Trash2,
  Truck,
  Users,
  X,
} from "lucide-react";
import { categories, money, products as demoProducts } from "./data";
import { catalogClient, catalogConfigError, fetchPublishedCatalog } from "./catalogApi";
import { quoteReference, submitQuote } from "./quoteApi.js";

const AdminPanel = lazy(() => import("./AdminPanel.jsx"));

const PHONE = "50360182667";
const storage = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

function useRoute() {
  const [hash, setHash] = useState(window.location.hash || "#/home");

  useEffect(() => {
    if (!window.location.hash) window.location.hash = "/home";
    const onHashChange = () => setHash(window.location.hash || "#/home");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const raw = hash.replace(/^#\//, "");
  const [pathname, queryString = ""] = raw.split("?");
  const [page = "home", slug] = pathname.split("/");
  return { page, slug, query: new URLSearchParams(queryString) };
}

function go(path, params = {}) {
  const query = new URLSearchParams(params).toString();
  window.location.hash = `/${path}${query ? `?${query}` : ""}`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function App() {
  const route = useRoute();
  const inAdmin = route.page === "admin";
  const [catalog, setCatalog] = useState(() => ({
    status: catalogClient || catalogConfigError ? "loading" : "ready",
    products: catalogClient ? [] : demoProducts,
    error: null,
  }));
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [cart, setCart] = useState(() => storage.get("madejitas-quote", []));
  const [favorites, setFavorites] = useState(() => storage.get("madejitas-favorites", []));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (inAdmin) return undefined;
    if (catalogConfigError) {
      setCatalog({ status: "error", products: [], error: "Falta la URL o la clave publicable de Supabase." });
      return undefined;
    }
    if (!catalogClient) return undefined;

    let active = true;
    setCatalog((current) => ({ ...current, status: "loading", error: null }));
    fetchPublishedCatalog()
      .then((products) => {
        if (active) setCatalog({ status: "ready", products, error: null });
      })
      .catch((error) => {
        if (active) setCatalog({ status: "error", products: [], error: error.message });
      });
    return () => { active = false; };
  }, [catalogRetry, inAdmin]);

  useEffect(() => storage.set("madejitas-quote", cart), [cart]);
  useEffect(() => storage.set("madejitas-favorites", favorites), [favorites]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const section = route.query.get("section");
    if (route.page !== "home" || !section) return undefined;
    const timer = window.setTimeout(() => {
      document.getElementById(section)?.scrollIntoView({ behavior: "smooth" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [route.page, route.query.toString()]);

  const addItem = (product, color, quantity = 1) => {
    if (quantity < 1) return false;
    if (color.stockQuantity === 0) {
      setToast("Este color está agotado por el momento");
      return false;
    }
    const key = `${product.id}-${color.code}`;
    const currentQuantity = cart.find((item) => item.key === key)?.quantity || 0;
    if (color.stockQuantity != null && currentQuantity + quantity > color.stockQuantity) {
      setToast(`Solo hay ${color.stockQuantity} unidades disponibles de ${color.name}`);
      return false;
    }
    setCart((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) {
        return current.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + quantity } : item,
        );
      }
      return [...current, { key, productId: product.id, colorCode: color.code, quantity }];
    });
    setToast(`${product.name} agregado a tu cotización`);
    return true;
  };

  const addSelections = (product, quantities) => {
    let added = 0;
    product.colors.forEach((color) => {
      const quantity = quantities[color.code] || 0;
      if (quantity > 0 && color.stockQuantity !== 0) {
        if (addItem(product, color, quantity)) added += quantity;
      }
    });
    if (!added) {
      setToast("Selecciona al menos un color disponible");
    } else {
      setToast(`${added} madejita${added > 1 ? "s" : ""} agregada${added > 1 ? "s" : ""}`);
    }
  };

  const updateItem = (key, quantity) => {
    if (quantity <= 0) setCart((current) => current.filter((item) => item.key !== key));
    else {
      const item = cart.find((candidate) => candidate.key === key);
      const color = catalog.products
        .find((product) => product.id === item?.productId)
        ?.colors.find((candidate) => candidate.code === item?.colorCode);
      if (color?.stockQuantity != null && quantity > (item?.quantity || 0) && quantity > color.stockQuantity) {
        setToast(`Solo hay ${color.stockQuantity} unidades disponibles de ${color.name}`);
        return;
      }
      setCart((current) => current.map((candidate) => candidate.key === key ? { ...candidate, quantity } : candidate));
    }
  };

  const toggleFavorite = (id) => {
    setFavorites((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const cartDetails = useMemo(
    () =>
      cart.flatMap((item) => {
        const product = catalog.products.find((candidate) => candidate.id === item.productId);
        const color = product?.colors.find((candidate) => candidate.code === item.colorCode);
        return product && color ? [{ ...item, product, color }] : [];
      }),
    [cart, catalog.products],
  );
  const count = cartDetails.reduce((total, item) => total + item.quantity, 0);

  if (inAdmin) {
    return <Suspense fallback={<main className="catalog-status" role="status">Cargando administración...</main>}><AdminPanel onCatalogChanged={() => setCatalogRetry((value) => value + 1)} /></Suspense>;
  }

  let content;
  if (route.page !== "info" && catalog.status !== "ready") {
    content = (
      <main className="catalog-status page-width" role="status">
        {catalog.status === "loading" ? (
          <><div className="loading-mark" /><h1>Cargando catálogo</h1></>
        ) : (
          <><h1>No pudimos cargar el catálogo</h1><p>Intenta de nuevo en unos momentos.</p><button className="button outline" onClick={() => setCatalogRetry((value) => value + 1)}>Reintentar</button></>
        )}
      </main>
    );
  } else if (route.page === "catalog") {
    content = (
      <CatalogPage
        products={catalog.products}
        initialQuery={route.query.get("q") || ""}
        favoriteOnly={route.query.get("favorites") === "1"}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        addItem={addItem}
      />
    );
  } else if (route.page === "product") {
    const product = catalog.products.find((item) => item.id === route.slug);
    content = product ? (
      <ProductPage
        product={product}
        isFavorite={favorites.includes(product.id)}
        toggleFavorite={toggleFavorite}
        addSelections={addSelections}
      />
    ) : (
      <main className="catalog-status page-width"><h1>Producto no disponible</h1><button className="button outline" onClick={() => go("catalog")}>Volver al catálogo</button></main>
    );
  } else if (route.page === "quote") {
    content = <QuotePage items={cartDetails} updateItem={updateItem} onSubmitted={() => setCart([])} />;
  } else if (route.page === "info") {
    content = <InfoPage slug={route.slug} />;
  } else {
    content = (
      <HomePage
        products={catalog.products}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        addItem={addItem}
      />
    );
  }

  return (
    <div className="app-shell">
      <Header
        route={route}
        count={count}
        openCart={() => setDrawerOpen(true)}
      />
      {content}
      <Footer />
      <MobileNav route={route} count={count} openCart={() => setDrawerOpen(true)} />
      <QuoteDrawer
        open={drawerOpen}
        close={() => setDrawerOpen(false)}
        items={cartDetails}
        updateItem={updateItem}
      />
      {toast && (
        <div className="toast" role="status">
          <Check size={18} /> {toast}
        </div>
      )}
    </div>
  );
}

function Header({ route, count, openCart }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

  const submitSearch = (event) => {
    event.preventDefault();
    if (search.trim()) {
      go("catalog", { q: search.trim() });
      setSearchOpen(false);
      setMenuOpen(false);
    }
  };

  const navItems = [
    ["Inicio", "home"],
    ["Catálogo", "catalog"],
    ["Novedades", "catalog?sort=new"],
    ["Inspiración", "home?section=inspiration"],
    ["Sobre nosotros", "home?section=about"],
    ["Contacto", "home?section=contact"],
  ];

  const navigateItem = (target) => {
    const [path, queryString] = target.split("?");
    go(path, Object.fromEntries(new URLSearchParams(queryString || "")));
    setMenuOpen(false);
  };

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <button className="brand" onClick={() => go("home")} aria-label="Ir al inicio">
            Madejitas<span>.sv</span>
          </button>
          <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Navegación principal">
            {navItems.map(([label, target]) => (
              <button
                key={label}
                className={route.page === target.split("?")[0] && label !== "Novedades" ? "active" : ""}
                onClick={() => navigateItem(target)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="icon-button desktop-action"
              onClick={() => setSearchOpen((value) => !value)}
              title="Buscar"
              aria-label="Buscar"
            >
              <Search />
            </button>
            <button
              className="icon-button desktop-action"
              onClick={() => go("catalog", { favorites: "1" })}
              title="Favoritos"
              aria-label="Ver favoritos"
            >
              <Heart />
            </button>
            <button className="icon-button bag-button" onClick={openCart} title="Mi cotización" aria-label="Abrir mi cotización">
              <ShoppingBag />
              {count > 0 && <span className="count-badge">{count}</span>}
            </button>
            <button
              className="icon-button menu-button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {searchOpen && (
          <form className="header-search" onSubmit={submitSearch}>
            <Search size={20} />
            <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar hilos, colores o herramientas" />
            <button type="submit" className="button primary compact">Buscar</button>
          </form>
        )}
      </header>
    </>
  );
}

function HomePage({ products, favorites, toggleFavorite, addItem }) {
  const carouselRef = useRef(null);

  return (
    <main>
      <section className="hero">
        <img className="hero-image" src="/images/hero-madejitas.jpg" alt="Hilados de colores y herramientas para tejer" />
        <div className="hero-shade" />
        <div className="hero-content page-width">
          <p className="eyebrow">Hilados y materiales creativos en El Salvador</p>
          <h1>Madejitas.sv</h1>
          <h2>Todo comienza con una madejita</h2>
          <p className="hero-copy">Encuentra colores, texturas y herramientas para transformar tus ideas en algo hecho por ti.</p>
          <div className="hero-actions">
            <button className="button primary" onClick={() => go("catalog")}>Explorar catálogo <ArrowRight size={18} /></button>
            <button className="button light" onClick={() => go("catalog", { sort: "new" })}>Ver novedades</button>
          </div>
          <div className="hero-trust">
            <TrustStat strong={String(products.length)} label="Productos" />
            <TrustStat strong={String(categories.length)} label="Categorías" />
            <TrustStat icon={<Truck />} label="Envíos a todo el país" />
            <TrustStat icon={<MessageCircle />} label="Atención por WhatsApp" />
          </div>
        </div>
      </section>

      <section className="category-section page-width">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow dark">Tu próximo proyecto</p>
            <h2>¿Qué vas a crear hoy?</h2>
          </div>
          <button className="text-link" onClick={() => go("catalog")}>Ver todo <ArrowRight size={17} /></button>
        </div>
        <div className="category-strip">
          {categories.map((category) => (
            <button key={category.name} className="category-item" onClick={() => go("catalog", { category: category.name })}>
              <span className="category-image"><img src={category.image} alt="" /></span>
              <strong>{category.name}</strong>
              <small>{category.subtitle}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="favorites-band" id="inspiration">
        <div className="page-width">
          <div className="section-heading split-heading inverse">
            <div>
              <p className="eyebrow">Elegidos para crear</p>
              <h2>Favoritos de la comunidad</h2>
            </div>
            <div className="carousel-controls">
              <button className="icon-button inverse" onClick={() => carouselRef.current?.scrollBy({ left: -340, behavior: "smooth" })} aria-label="Ver productos anteriores" title="Anterior"><ArrowLeft /></button>
              <button className="icon-button inverse" onClick={() => carouselRef.current?.scrollBy({ left: 340, behavior: "smooth" })} aria-label="Ver más productos" title="Siguiente"><ArrowRight /></button>
            </div>
          </div>
          <div className="product-carousel" ref={carouselRef}>
            {products.slice(0, 6).map((product) => (
              <ProductCard key={product.id} product={product} favorite={favorites.includes(product.id)} toggleFavorite={toggleFavorite} addItem={addItem} />
            ))}
            {!products.length && <p>Pronto habrá nuevos materiales para explorar.</p>}
          </div>
          <div className="value-row" id="about">
            <ValueItem icon={<Sparkles />} label="Emprendimiento salvadoreño" />
            <ValueItem icon={<Check />} label="Materiales seleccionados" />
            <ValueItem icon={<MessageCircle />} label="Atención personalizada" />
            <ValueItem icon={<Truck />} label="Envíos a todo El Salvador" />
          </div>
        </div>
      </section>
    </main>
  );
}

function TrustStat({ strong, icon, label }) {
  return <div className="trust-stat"><span>{strong || icon}</span><small>{label}</small></div>;
}

function ValueItem({ icon, label }) {
  return <div className="value-item"><span>{icon}</span>{label}</div>;
}

function ProductCard({ product, favorite, toggleFavorite, addItem }) {
  const firstAvailableColor = product.colors.find((color) => color.stockQuantity !== 0);
  return (
    <article className="product-card">
      <div className="product-media" onClick={() => go(`product/${product.id}`)} role="button" tabIndex="0">
        <img src={product.image} alt={product.name} />
        {product.badge && <span className="product-badge">{product.badge}</span>}
        <button
          className={`favorite-button ${favorite ? "selected" : ""}`}
          onClick={(event) => { event.stopPropagation(); toggleFavorite(product.id); }}
          aria-label={favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
          title={favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
        >
          <Heart fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="product-body">
        <button className="product-title" onClick={() => go(`product/${product.id}`)}>{product.name}</button>
        <p>{product.detail}</p>
        <div className="product-price">Desde {money(product.price)}</div>
        <div className="swatches" aria-label="Colores disponibles">
          {product.colors.slice(0, 5).map((color) => <span key={color.code} style={{ backgroundColor: color.hex }} title={color.name} />)}
        </div>
        <button className="button soft full" disabled={!firstAvailableColor} onClick={() => addItem(product, firstAvailableColor)}><Plus size={17} /> {firstAvailableColor ? "Agregar" : "Agotado"}</button>
      </div>
    </article>
  );
}

function CatalogPage({ products, initialQuery, favoriteOnly, favorites, toggleFavorite, addItem }) {
  const route = useRoute();
  const maxPrice = Math.max(15, ...products.map((product) => Math.ceil(product.price)));
  const availableCategories = [...new Set([...categories.map((item) => item.name), ...products.map((product) => product.category)])];
  const availableBrands = [...new Set(products.map((product) => product.brand))];
  const availableThicknesses = [...new Set(products.map((product) => product.thickness))];
  const [search, setSearch] = useState(initialQuery);
  const [category, setCategory] = useState(route.query.get("category") || "Todos");
  const [brand, setBrand] = useState("Todos");
  const [thickness, setThickness] = useState("Todos");
  const [price, setPrice] = useState(maxPrice);
  const [sort, setSort] = useState(route.query.get("sort") === "new" ? "new" : "recent");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setSearch(route.query.get("q") || "");
    setCategory(route.query.get("category") || "Todos");
    setSort(route.query.get("sort") === "new" ? "new" : "recent");
  }, [route.query.toString()]);

  const filtered = useMemo(() => {
    const normalized = search.toLocaleLowerCase("es");
    let result = products.filter((product) => {
      const matchesText = `${product.name} ${product.detail} ${product.category} ${product.brand}`.toLocaleLowerCase("es").includes(normalized);
      return matchesText
        && (category === "Todos" || product.category === category)
        && (brand === "Todos" || product.brand === brand)
        && (thickness === "Todos" || product.thickness === thickness)
        && product.price <= price
        && (!favoriteOnly || favorites.includes(product.id));
    });
    if (sort === "price-low") result = [...result].sort((a, b) => a.price - b.price);
    if (sort === "price-high") result = [...result].sort((a, b) => b.price - a.price);
    if (sort === "new") result = [...result].sort((a, b) => Boolean(b.badge) - Boolean(a.badge));
    return result;
  }, [brand, category, favoriteOnly, favorites, price, search, sort, thickness]);

  const clearFilters = () => {
    setSearch(""); setCategory("Todos"); setBrand("Todos"); setThickness("Todos"); setPrice(maxPrice);
  };

  return (
    <main className="catalog-page page-width">
      <div className="catalog-intro">
        <p className="eyebrow dark">Colección Madejitas</p>
        <h1>{favoriteOnly ? "Tus favoritos" : "Catálogo"}</h1>
        <p>{favoriteOnly ? "Los materiales que guardaste para después." : "Encuentra todo lo que necesitas para tu próximo proyecto."}</p>
      </div>
      <label className="catalog-search">
        <Search />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="¿Qué necesitas para tu próximo proyecto?" />
        {search && <button className="icon-button" onClick={() => setSearch("")} aria-label="Limpiar búsqueda"><X /></button>}
      </label>
      <div className="catalog-toolbar">
        <button className="button outline filter-toggle" onClick={() => setFiltersOpen(true)}><Filter size={18} /> Filtros</button>
        <span>{filtered.length} producto{filtered.length !== 1 ? "s" : ""}</span>
        <label className="sort-control">Ordenar por:
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="recent">Más recientes</option>
            <option value="new">Novedades</option>
            <option value="price-low">Menor precio</option>
            <option value="price-high">Mayor precio</option>
          </select>
          <ChevronDown size={16} />
        </label>
      </div>
      <div className="catalog-layout">
        <aside className={`filters ${filtersOpen ? "is-open" : ""}`}>
          <div className="filters-mobile-head"><strong>Filtrar catálogo</strong><button className="icon-button" onClick={() => setFiltersOpen(false)}><X /></button></div>
          <FilterGroup title="Categorías" options={["Todos", ...availableCategories]} value={category} onChange={setCategory} />
          <FilterGroup title="Marca" options={["Todos", ...availableBrands]} value={brand} onChange={setBrand} />
          <FilterGroup title="Grosor" options={["Todos", ...availableThicknesses]} value={thickness} onChange={setThickness} />
          <div className="filter-group">
            <h3>Precio máximo</h3>
            <input type="range" min="0" max={maxPrice} step="0.25" value={price} onChange={(event) => setPrice(Number(event.target.value))} />
            <div className="range-label"><span>$0</span><strong>{money(price)}</strong></div>
          </div>
          <button className="text-link" onClick={clearFilters}>Limpiar filtros</button>
          <button className="button primary full filters-apply" onClick={() => setFiltersOpen(false)}>Ver {filtered.length} resultados</button>
        </aside>
        {filtersOpen && <button className="drawer-backdrop filter-backdrop" onClick={() => setFiltersOpen(false)} aria-label="Cerrar filtros" />}
        <section>
          {filtered.length ? (
            <div className="product-grid">
              {filtered.map((product) => <ProductCard key={product.id} product={product} favorite={favorites.includes(product.id)} toggleFavorite={toggleFavorite} addItem={addItem} />)}
            </div>
          ) : (
            <div className="empty-state"><Search /><h2>No encontramos coincidencias</h2><p>Prueba con otra palabra o ajusta los filtros.</p><button className="button outline" onClick={clearFilters}>Restablecer catálogo</button></div>
          )}
        </section>
      </div>
    </main>
  );
}

function FilterGroup({ title, options, value, onChange }) {
  return (
    <div className="filter-group">
      <h3>{title}</h3>
      {options.map((option) => (
        <label key={option} className="check-row">
          <input type="radio" name={title} value={option} checked={value === option} onChange={() => onChange(option)} />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}

function ProductPage({ product, isFavorite, toggleFavorite, addSelections }) {
  const [activeImage, setActiveImage] = useState(product.heroImage || product.image);
  const initialColor = product.colors.find((color) => color.stockQuantity !== 0);
  const [quantities, setQuantities] = useState(initialColor ? { [initialColor.code]: 1 } : {});
  const totalSelected = Object.values(quantities).reduce((total, value) => total + value, 0);
  const anyStockKnown = product.colors.some((color) => color.stockQuantity !== null && color.stockQuantity !== undefined);

  useEffect(() => {
    setActiveImage(product.heroImage || product.image);
    setQuantities(initialColor ? { [initialColor.code]: 1 } : {});
  }, [product]);

  const changeQuantity = (code, delta) => {
    const color = product.colors.find((candidate) => candidate.code === code);
    setQuantities((current) => ({
      ...current,
      [code]: Math.min(color?.stockQuantity ?? Infinity, Math.max(0, (current[code] || 0) + delta)),
    }));
  };

  return (
    <main className="product-page page-width">
      <nav className="breadcrumbs" aria-label="Migas de pan">
        <button onClick={() => go("home")}>Inicio</button><ChevronRight /><button onClick={() => go("catalog")}>Catálogo</button><ChevronRight /><span>{product.name}</span>
      </nav>
      <div className="product-detail-layout">
        <div className="gallery">
          <div className="thumbnails">
            {[product.image, ...product.colors.slice(1, 4).map((color) => color.image)].map((image, index) => (
              <button key={`${image}-${index}`} className={activeImage === image ? "active" : ""} onClick={() => setActiveImage(image)} aria-label={`Ver imagen ${index + 1}`}><img src={image} alt="" /></button>
            ))}
          </div>
          <div className="main-product-image">
            <img src={activeImage} alt={product.name} />
            <span className="product-badge">{product.badge || "Favorito"}</span>
            <button className={`favorite-button ${isFavorite ? "selected" : ""}`} onClick={() => toggleFavorite(product.id)} aria-label="Cambiar favorito"><Heart fill={isFavorite ? "currentColor" : "none"} /></button>
          </div>
        </div>
        <div className="product-info">
          <div className="rating"><span>{product.brand.toUpperCase()}</span></div>
          <h1>{product.name}</h1>
          <p className="product-subtitle">{product.detail}</p>
          <div className="detail-price">{money(product.price)} <small>Por unidad</small></div>
          <div className="product-description">
            <p>{product.description || `${product.name} seleccionado por su textura, color y calidad. Ideal para convertir tus ideas en piezas únicas.`}</p>
            <div className="spec-grid">
              <span><PackageCheck /> <b>Presentación:</b> {product.detail.split("·")[0]}</span>
              <span><Sparkles /> <b>Calidad:</b> Premium</span>
              <span><Check /> <b>Marca:</b> {product.brand}</span>
              <span><Truck /> <b>Entrega:</b> Todo El Salvador</span>
            </div>
            <span className="stock-label"><Check /> {anyStockKnown ? "Consulta disponibilidad antes de confirmar" : "Disponibilidad por confirmar"}</span>
          </div>
          <div className="color-selector">
            <div className="selector-heading"><h2>Selecciona tus colores</h2><span>{product.colors.length} disponibles</span></div>
            <div className="color-grid">
              {product.colors.map((color) => (
                <div className={`color-option ${(quantities[color.code] || 0) > 0 ? "selected" : ""} ${color.stockQuantity === 0 ? "out-of-stock" : ""}`} key={color.code}>
                  <button className="color-identify" onClick={() => setActiveImage(color.image)}>
                    <img src={color.image} alt="" /><span><strong>{color.name}</strong><small>{color.stockQuantity === 0 ? "Agotado" : color.code}</small></span>
                  </button>
                  <Quantity value={quantities[color.code] || 0} disabled={color.stockQuantity === 0} decrement={() => changeQuantity(color.code, -1)} increment={() => changeQuantity(color.code, 1)} />
                </div>
              ))}
            </div>
          </div>
          <button className="button primary full large" disabled={!totalSelected} onClick={() => addSelections(product, quantities)}><ShoppingBag /> Agregar {totalSelected} a mi cotización</button>
          <div className="detail-benefits">
            <ValueItem icon={<Sparkles />} label="Textura seleccionada" />
            <ValueItem icon={<Check />} label="Colores firmes" />
            <ValueItem icon={<Heart />} label="Ideal para regalar" />
          </div>
        </div>
      </div>
    </main>
  );
}

function Quantity({ value, decrement, increment, disabled = false }) {
  return (
    <div className="quantity-control">
      <button disabled={disabled} onClick={decrement} aria-label="Reducir cantidad"><Minus /></button>
      <span>{value}</span>
      <button disabled={disabled} onClick={increment} aria-label="Aumentar cantidad"><Plus /></button>
    </div>
  );
}

function QuoteDrawer({ open, close, items, updateItem }) {
  const subtotal = items.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const shipping = items.length ? 3.5 : 0;

  useEffect(() => {
    document.body.classList.toggle("drawer-open", open);
    return () => document.body.classList.remove("drawer-open");
  }, [open]);

  return (
    <>
      <button className={`drawer-backdrop ${open ? "visible" : ""}`} onClick={close} aria-label="Cerrar cotización" />
      <aside className={`quote-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="drawer-head"><div><p className="eyebrow dark">Tu selección</p><h2>Mi cotización <span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span></h2></div><button className="icon-button" onClick={close} aria-label="Cerrar"><X /></button></div>
        <div className="drawer-content">
          {items.length ? items.map((item) => (
            <div className="cart-item" key={item.key}>
              <img src={item.color.image || item.product.image} alt="" />
              <div><strong>{item.product.name}</strong><small>{item.color.name} ({item.color.code})</small><Quantity value={item.quantity} decrement={() => updateItem(item.key, item.quantity - 1)} increment={() => updateItem(item.key, item.quantity + 1)} /></div>
              <div className="cart-item-total"><button onClick={() => updateItem(item.key, 0)} aria-label={`Eliminar ${item.product.name}`} title="Eliminar"><Trash2 /></button><strong>{money(item.product.price * item.quantity)}</strong><small>{money(item.product.price)} c/u</small></div>
            </div>
          )) : (
            <div className="empty-cart"><ShoppingBag /><h3>Tu cotización está vacía</h3><p>Explora el catálogo y agrega los colores que necesitas.</p><button className="button outline" onClick={() => { close(); go("catalog"); }}>Explorar catálogo</button></div>
          )}
        </div>
        {items.length > 0 && (
          <div className="drawer-summary">
            <div><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <div><span>Envío estimado <CircleHelp size={14} /></span><span>{money(shipping)}</span></div>
            <div className="summary-total"><strong>Total estimado</strong><strong>{money(subtotal + shipping)}</strong></div>
            <button className="button primary full" onClick={() => { close(); go("quote"); }}><ReceiptText /> Preparar mi cotización</button>
            <button className="button outline full" onClick={() => { close(); go("catalog"); }}>Seguir explorando</button>
          </div>
        )}
      </aside>
    </>
  );
}

function QuotePage({ items, updateItem, onSubmitted }) {
  const [customer, setCustomer] = useState(() => storage.get("madejitas-customer", { name: "", phone: "", city: "", comment: "" }));
  const [submitted, setSubmitted] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const request = useRef(null);
  const previewSubtotal = items.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const displayRows = submitted?.quote
    ? submitted.quote.items.map((line) => {
      const original = items.find((item) => item.color.id === line.variant_id);
      return { key: line.variant_id, productName: line.product_name, colorName: line.variant_name,
        code: line.variant_code, quantity: line.quantity, price: Number(line.unit_price),
        lineTotal: Number(line.line_total), image: submitted.images[line.variant_id] || original?.color.image || original?.product.image };
    })
    : items.map((item) => ({ key: item.key, productName: item.product.name,
      colorName: item.color.name, code: item.color.code, quantity: item.quantity,
      price: item.product.price, lineTotal: item.product.price * item.quantity,
      image: item.color.image || item.product.image, source: item }));
  const subtotal = submitted?.quote ? Number(submitted.quote.subtotal) : previewSubtotal;
  const shipping = submitted?.quote ? Number(submitted.quote.shipping) : items.length ? 3.5 : 0;
  const total = submitted?.quote ? Number(submitted.quote.total) : subtotal + shipping;
  const shownCustomer = submitted?.customer || customer;
  const date = new Intl.DateTimeFormat("es-SV").format(new Date(submitted?.quote?.created_at || Date.now()));

  useEffect(() => storage.set("madejitas-customer", customer), [customer]);

  const updateCustomer = (event) => {
    setSubmitError("");
    setCustomer((current) => ({ ...current, [event.target.name]: event.target.value }));
  };
  const generate = async (event) => {
    event.preventDefault();
    if (submitting || submitted || !items.length) return;
    if (!catalogClient) {
      setSubmitted({ customer: { ...customer }, quote: null });
      document.querySelector(".quote-document")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const fingerprint = JSON.stringify({ customer, items: items.map((item) => [item.color.id, item.quantity]) });
    if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, id: crypto.randomUUID() };
    setSubmitting(true);
    setSubmitError("");
    try {
      const quote = await submitQuote(request.current.id, customer, items);
      const images = Object.fromEntries(items.map((item) => [item.color.id, item.color.image || item.product.image]));
      setSubmitted({ customer: { ...customer }, quote, images });
      onSubmitted();
      document.querySelector(".quote-document")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  };
  const whatsappMessage = encodeURIComponent([
    "Hola Madejitas.sv, quiero solicitar una cotización:",
    submitted?.quote ? `Referencia: ${quoteReference(submitted.quote.quote_number)}` : "",
    ...displayRows.map((item) => `• ${item.quantity} × ${item.productName}, ${item.colorName} (${item.code}) — ${money(item.lineTotal)}`),
    `Total estimado: ${money(total)}`,
    `Cliente: ${shownCustomer.name || "Sin nombre"}`,
    `Ciudad: ${shownCustomer.city || "Sin especificar"}`,
    shownCustomer.comment ? `Comentario: ${shownCustomer.comment}` : "",
  ].filter(Boolean).join("\n"));

  if (!items.length && !submitted) {
    return <main className="quote-page page-width"><div className="empty-state quote-empty"><ReceiptText /><h1>Tu cotización está vacía</h1><p>Agrega materiales para poder preparar el documento.</p><button className="button primary" onClick={() => go("catalog")}>Ir al catálogo</button></div></main>;
  }

  return (
    <main className="quote-page page-width">
      <nav className="breadcrumbs no-print"><button onClick={() => go("home")}>Inicio</button><ChevronRight /><span>Cotización</span></nav>
      <div className="quote-layout">
        <section className="quote-form-panel no-print">
          <p className="eyebrow dark">Último paso</p>
          <h1>Tu proyecto ya está tomando forma</h1>
          {submitted ? <div role="status"><p>{submitted.quote ? `Solicitud ${quoteReference(submitted.quote.quote_number)} registrada. Te contactaremos para confirmar existencias y entrega.` : "Vista previa preparada. Esta solicitud no fue registrada."}</p><button className="button outline" onClick={() => go("catalog")}>Volver al catálogo</button></div> : <>
            <p>Completa tus datos para solicitar tu cotización.</p>
            <form className="quote-form" onSubmit={generate}>
              <label>Nombre completo<input required minLength="2" maxLength="100" name="name" value={customer.name} onChange={updateCustomer} placeholder="María López" /></label>
              <label>WhatsApp<div className="phone-field"><span>+503</span><input required name="phone" value={customer.phone} onChange={updateCustomer} placeholder="0000 0000" inputMode="tel" pattern="[0-9]{4}[ -]?[0-9]{4}" title="Ingresa 8 dígitos" /></div></label>
              <label>Ciudad / Departamento<input required minLength="2" maxLength="100" name="city" value={customer.city} onChange={updateCustomer} placeholder="San Salvador" /></label>
              <label>Comentario opcional<textarea name="comment" maxLength="500" value={customer.comment} onChange={updateCustomer} placeholder="Cuéntanos algo importante sobre tu pedido..." rows="3" /></label>
              {submitError && <p role="alert" className="quote-submit-error">{submitError}</p>}
              <button className="button primary full" type="submit" disabled={submitting}><ReceiptText /> {submitting ? "Enviando solicitud..." : catalogClient ? "Solicitar cotización" : "Generar vista previa"}</button>
            </form>
          </>}
        </section>
        <section className={`quote-document ${submitted ? "generated" : ""}`}>
          <div className="document-head"><div><div className="document-brand">Madejitas.sv</div><p>Tu boutique de hilados</p></div><div><h2>Cotización</h2><p>{submitted?.quote ? quoteReference(submitted.quote.quote_number) : "Vista previa sin registrar"}<br />Fecha: {date}</p></div></div>
          <div className="customer-data"><div><small>Cliente</small><strong>{shownCustomer.name || "Tu nombre"}</strong></div><div><small>WhatsApp</small><strong>+503 {shownCustomer.phone || "0000 0000"}</strong></div><div><small>Ciudad / Departamento</small><strong>{shownCustomer.city || "Tu ciudad"}</strong></div></div>
          <div className="quote-table-wrap">
            <table className="quote-table"><thead><tr><th>Producto</th><th>Color</th><th>Código</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>
              {displayRows.map((item) => <tr key={item.key}><td>{item.image && <img src={item.image} alt="" />}<span>{item.productName}</span></td><td>{item.colorName}</td><td>{item.code}</td><td><span className={item.source && !submitted ? "print-only" : ""}>{item.quantity}</span>{item.source && !submitted && <div className="no-print"><Quantity value={item.quantity} decrement={() => updateItem(item.key, item.quantity - 1)} increment={() => updateItem(item.key, item.quantity + 1)} /></div>}</td><td>{money(item.price)}</td><td>{money(item.lineTotal)}</td></tr>)}
            </tbody></table>
          </div>
          <div className="document-summary"><div><span>Subtotal</span><span>{money(subtotal)}</span></div><div><span>Envío estimado</span><span>{money(shipping)}</span></div><div><strong>Total estimado</strong><strong>{money(total)}</strong></div><small>* Precios y existencias sujetos a confirmación. La cotización no reserva productos.</small></div>
          {shownCustomer.comment && <p className="document-comment"><strong>Comentario:</strong> {shownCustomer.comment}</p>}
          <div className="document-actions no-print">
            <button className="button outline" onClick={() => window.print()}><Printer /> Imprimir / PDF</button>
            <a className="button whatsapp" href={`https://wa.me/${PHONE}?text=${whatsappMessage}`} target="_blank" rel="noreferrer"><Send /> Enviar por WhatsApp</a>
          </div>
        </section>
      </div>
    </main>
  );
}

const infoPages = {
  envios: {
    eyebrow: "Comprar con tranquilidad",
    title: "Políticas de envío",
    intro: "Coordinamos cada entrega directamente contigo para cuidar tus materiales desde nuestra tienda hasta tus manos.",
    sections: [
      ["Cobertura", "Realizamos envíos a todo El Salvador. La disponibilidad, el costo y el tiempo se confirman según el municipio y el volumen del pedido."],
      ["Preparación", "Una cotización no reserva inventario. Confirmaremos existencias y fecha de despacho por WhatsApp antes de procesar el pedido."],
      ["Recepción", "Revisa el paquete al recibirlo. Si notas una incidencia, escríbenos con fotografías del empaque y del producto para ayudarte."],
    ],
  },
  terminos: {
    eyebrow: "Información de compra",
    title: "Términos y condiciones",
    intro: "La cotización facilita tu selección; el pedido queda confirmado cuando Madejitas.sv valida existencias, entrega y forma de pago.",
    sections: [
      ["Precios", "Los precios mostrados son estimados y pueden cambiar antes de la confirmación final. Siempre recibirás el total definitivo por WhatsApp."],
      ["Disponibilidad", "Los colores y lotes dependen del inventario actual. Para proyectos grandes recomendamos solicitar suficientes unidades del mismo lote."],
      ["Cambios", "Los cambios se coordinan según el estado del producto y las condiciones comunicadas al confirmar la compra."],
    ],
  },
  preguntas: {
    eyebrow: "Respuestas rápidas",
    title: "Preguntas frecuentes",
    intro: "Estas son las consultas más comunes al preparar un proyecto con Madejitas.sv.",
    sections: [
      ["¿La cotización es una compra?", "No. Es una lista ordenada para que podamos confirmar colores, cantidades, existencias y entrega contigo."],
      ["¿Puedo elegir varios colores?", "Sí. En el detalle de cada hilo puedes indicar una cantidad diferente para cada color y agregar todo en una sola acción."],
      ["¿Cómo recibo mi pedido?", "Coordinamos envío a todo El Salvador por WhatsApp después de validar tu cotización."],
    ],
  },
  guia: {
    eyebrow: "Elige con confianza",
    title: "Guía de hilados",
    intro: "La textura y el grosor correctos hacen que el proceso sea más cómodo y que el resultado conserve la forma esperada.",
    sections: [
      ["Amigurumi", "Busca una fibra con buena definición de puntada y poca pelusa. El algodón es una opción precisa para figuras y detalles pequeños."],
      ["Chenille", "Su volumen y suavidad funcionan muy bien en muñecos grandes, mantas, cojines y proyectos para bebé."],
      ["Trapillo", "Su estructura firme es adecuada para bolsos, cestas, alfombras y piezas decorativas que necesitan mantener su forma."],
    ],
  },
};

function InfoPage({ slug }) {
  const page = infoPages[slug] || infoPages.preguntas;
  return (
    <main className="info-page page-width">
      <nav className="breadcrumbs"><button onClick={() => go("home")}>Inicio</button><ChevronRight /><span>{page.title}</span></nav>
      <header><p className="eyebrow dark">{page.eyebrow}</p><h1>{page.title}</h1><p>{page.intro}</p></header>
      <div className="info-sections">
        {page.sections.map(([title, copy]) => <section key={title}><h2>{title}</h2><p>{copy}</p></section>)}
      </div>
      <div className="info-contact"><MessageCircle /><div><strong>¿Necesitas una respuesta más específica?</strong><p>Conversemos directamente sobre tu proyecto.</p></div><a className="button whatsapp" href={`https://wa.me/${PHONE}`} target="_blank" rel="noreferrer">Escribir por WhatsApp</a></div>
    </main>
  );
}

function Footer() {
  return (
    <footer className="site-footer" id="contact">
      <div className="footer-grid page-width">
        <div><div className="footer-brand">Madejitas.sv</div><p>Materiales de primera calidad para convertir tus ideas en piezas hechas con cariño.</p></div>
        <div><h3>Enlaces útiles</h3><button onClick={() => go("info/envios")}>Políticas de envío</button><button onClick={() => go("info/terminos")}>Términos y condiciones</button><button onClick={() => go("info/preguntas")}>Preguntas frecuentes</button><button onClick={() => go("info/guia")}>Guía de hilados</button></div>
        <div><h3>Contacto</h3><a href="mailto:info@madejitas.sv"><Mail /> info@madejitas.sv</a><a href={`https://wa.me/${PHONE}`} target="_blank" rel="noreferrer"><Phone /> +503 6018 2667</a><span><MapPin /> San Salvador, El Salvador</span></div>
        <div><h3>Síguenos</h3><div className="socials"><a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><Camera /></a><a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><Users /></a></div></div>
      </div>
      <div className="copyright">© {new Date().getFullYear()} Madejitas SV. Todos los derechos reservados.</div>
    </footer>
  );
}

function MobileNav({ route, count, openCart }) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Navegación móvil">
      <button className={route.page === "home" ? "active" : ""} onClick={() => go("home")}><Sparkles /><span>Inicio</span></button>
      <button className={route.page === "catalog" ? "active" : ""} onClick={() => go("catalog")}><Search /><span>Catálogo</span></button>
      <button onClick={openCart}><span className="mobile-bag"><ShoppingBag />{count > 0 && <i>{count}</i>}</span><span>Cotización</span></button>
      <a href={`https://wa.me/${PHONE}`} target="_blank" rel="noreferrer"><MessageCircle /><span>WhatsApp</span></a>
    </nav>
  );
}

export default App;
