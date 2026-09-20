import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Check, Eye, EyeOff, Image as ImageIcon, KeyRound, LogOut, Package,
  Plus, Save, Search, Trash2, Upload, X,
} from "lucide-react";
import { catalogClient } from "./catalogApi.js";
import {
  deleteAdminProduct, deleteAdminVariant, fetchAdminProducts, getAdminAccess,
  saveAdminProduct, saveAdminVariant, uploadCatalogImage,
} from "./adminApi.js";
import { emptyProduct, emptyVariant, productDraft, variantDraft } from "./adminModel.js";
import { money } from "./data.js";
import "./admin.css";

const LOCAL_IMAGES = [
  "hilo-amigurumi.jpg", "chenille.jpg", "chenille-detalle.jpg", "chenille-rosa.jpg",
  "chenille-menta.jpg", "chenille-azul.jpg", "chenille-vainilla.jpg", "trapillo.jpg",
  "algodon.jpg", "herramientas.jpg", "accesorios.jpg",
].map((name) => `/images/${name}`);

function ImageField({ label, value, onChange, onError, onUploadStart, onUploadEnd, required = false }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    onUploadStart();
    try {
      onChange(await uploadCatalogImage(file));
    } catch (error) {
      onError(error.message);
    } finally {
      setUploading(false);
      onUploadEnd();
      event.target.value = "";
    }
  };
  return (
    <div className="admin-image-field">
      <div className="admin-image-preview">
        {value ? <img src={value} alt="Vista previa" /> : <ImageIcon aria-hidden="true" />}
      </div>
      <div>
        <label>{label}
          <input required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder="/images/producto.jpg o https://..." />
        </label>
        <select aria-label={`Elegir ${label.toLowerCase()} existente`} value={LOCAL_IMAGES.includes(value) ? value : ""} onChange={(event) => onChange(event.target.value)}>
          <option value="">Elegir imagen existente</option>
          {LOCAL_IMAGES.map((path) => <option key={path} value={path}>{path.split("/").at(-1)}</option>)}
        </select>
        <input ref={fileRef} className="admin-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} tabIndex={-1} aria-hidden="true" />
        <button type="button" className="admin-button secondary admin-upload-button" disabled={uploading} onClick={() => fileRef.current?.click()}><Upload size={15} /> {uploading ? "Subiendo..." : "Subir imagen"}</button>
      </div>
    </div>
  );
}

function AccessScreen({ access, email, setEmail, password, setPassword, onSignIn, onSignOut, busy, error }) {
  return (
    <div className="admin-access-layout">
      <div className="admin-access-panel">
        <span className="admin-access-mark"><Package size={25} /></span>
        <h1>Administración</h1>
        {access.status === "checking" && <p role="status">Verificando acceso...</p>}
        {access.status === "error" && !error && <p role="alert">No fue posible verificar el acceso. Recarga la página para intentarlo de nuevo.</p>}
        {access.status === "forbidden" && (
          <>
            <p>La cuenta {access.email} no tiene permisos de administración.</p>
            <button className="admin-button secondary" onClick={onSignOut} disabled={busy}><LogOut size={17} /> Cerrar sesión</button>
          </>
        )}
        {access.status === "signed-out" && (
          <form onSubmit={onSignIn} className="admin-login-form">
            <label>Correo electrónico<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <button className="admin-button primary" type="submit" disabled={busy}>{busy ? "Ingresando..." : "Ingresar"}</button>
          </form>
        )}
        {error && <p className="admin-feedback error" role="alert">{error}</p>}
        <a className="admin-return" href="#/home"><ArrowLeft size={16} /> Volver a la tienda</a>
      </div>
    </div>
  );
}

function VariantDialog({ draft, setDraft, onClose, onSave, onDelete, busy, error, mainImage, onUploadStart, onUploadEnd, onUploadError }) {
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  return (
    <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="variant-title">
        <div className="admin-modal-head">
          <h2 id="variant-title">{draft.id ? "Editar color" : "Nuevo color"}</h2>
          <button className="admin-icon-button" onClick={onClose} aria-label="Cerrar"><X size={19} /></button>
        </div>
        <form onSubmit={onSave}>
          <div className="admin-form-grid">
            <label>Nombre<input autoFocus required value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="Rosa suave" /></label>
            <label>Código<input required value={draft.code} onChange={(event) => update("code", event.target.value)} placeholder="RS01" /></label>
            <label>Color<div className="admin-color-field"><input type="color" value={draft.hex_color} onChange={(event) => update("hex_color", event.target.value)} aria-label="Seleccionar color" /><input value={draft.hex_color} onChange={(event) => update("hex_color", event.target.value)} aria-label="Código hexadecimal" /></div></label>
            <label>Existencias<input type="number" min="0" step="1" value={draft.stock_quantity} onChange={(event) => update("stock_quantity", event.target.value)} placeholder="Sin definir" /></label>
            <label>Orden<input type="number" min="0" step="1" required value={draft.sort_order} onChange={(event) => update("sort_order", event.target.value)} /></label>
            <label className="admin-check"><input type="checkbox" checked={draft.is_active} onChange={(event) => update("is_active", event.target.checked)} /> Color activo</label>
          </div>
          <ImageField label="Imagen del color" value={draft.image_url} onChange={(value) => update("image_url", value)} onError={onUploadError} onUploadStart={onUploadStart} onUploadEnd={onUploadEnd} />
          {!draft.image_url && mainImage && <div className="admin-image-fallback"><img src={mainImage} alt="" /><span>Imagen principal del producto</span></div>}
          {error && <p className="admin-feedback error" role="alert">{error}</p>}
          <div className="admin-modal-actions">
            {draft.id && <button type="button" className="admin-button danger" onClick={onDelete} disabled={busy}><Trash2 size={16} /> Eliminar</button>}
            <button type="button" className="admin-button secondary" onClick={onClose} disabled={busy}>Cancelar</button>
            <button type="submit" className="admin-button primary" disabled={busy}><Save size={16} /> {busy ? "Guardando..." : "Guardar color"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function PasswordDialog({ onClose, onSaved }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose]);

  const save = async (event) => {
    event.preventDefault();
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (password !== confirmation) { setError("Las contraseñas no coinciden."); return; }
    setBusy(true);
    setError("");
    try {
      const { error: authError } = await catalogClient.auth.updateUser({ password });
      if (authError) throw authError;
      onSaved();
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section className="admin-modal admin-password-modal" role="dialog" aria-modal="true" aria-labelledby="password-title">
        <div className="admin-modal-head"><h2 id="password-title">Cambiar contraseña</h2><button className="admin-icon-button" onClick={onClose} disabled={busy} aria-label="Cerrar"><X size={19} /></button></div>
        <form className="admin-login-form" onSubmit={save}>
          <label>Nueva contraseña<input type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <label>Confirmar contraseña<input type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
          {error && <p className="admin-feedback error" role="alert">{error}</p>}
          <div className="admin-modal-actions"><button type="button" className="admin-button secondary" onClick={onClose} disabled={busy}>Cancelar</button><button type="submit" className="admin-button primary" disabled={busy}><Save size={16} /> {busy ? "Guardando..." : "Guardar contraseña"}</button></div>
        </form>
      </section>
    </div>
  );
}

export default function AdminPanel({ onCatalogChanged }) {
  const [access, setAccess] = useState({ status: "checking", email: "" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [products, setProducts] = useState([]);
  const [listStatus, setListStatus] = useState("loading");
  const [listError, setListError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [variant, setVariant] = useState(null);
  const [variantError, setVariantError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!catalogClient) {
      setAuthError("Configura la URL y la clave publicable de Supabase para usar el panel.");
      setAccess({ status: "error", email: "" });
      return undefined;
    }
    let active = true;
    let checkNumber = 0;
    const check = async () => {
      const number = ++checkNumber;
      try {
        const result = await getAdminAccess();
        if (active && number === checkNumber) setAccess(result);
      } catch (error) {
        if (active && number === checkNumber) {
          setAuthError(error.message);
          setAccess({ status: "error", email: "" });
        }
      }
    };
    void check();
    const { data: { subscription } } = catalogClient.auth.onAuthStateChange(() => {
      window.setTimeout(check, 0);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (access.status !== "ready") return undefined;
    let active = true;
    setListStatus("loading");
    fetchAdminProducts().then((rows) => {
      if (!active) return;
      setProducts(rows);
      setSelectedId(rows[0]?.id || null);
      setDraft(rows[0] ? productDraft(rows[0]) : null);
      setListStatus("ready");
    }).catch((error) => {
      if (!active) return;
      setListError(error.message);
      setListStatus("error");
    });
    return () => { active = false; };
  }, [access.status]);

  const selectedProduct = products.find((product) => product.id === selectedId);
  const filtered = useMemo(() => products.filter((product) => {
    if (filter === "published" && !product.is_published) return false;
    if (filter === "draft" && product.is_published) return false;
    const needle = search.trim().toLocaleLowerCase("es");
    return !needle || `${product.name} ${product.category} ${product.brand} ${product.id}`.toLocaleLowerCase("es").includes(needle);
  }), [products, filter, search]);
  const publishedCount = products.filter((product) => product.is_published).length;

  const signIn = async (event) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    try {
      const { error } = await catalogClient.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      setPassword("");
      setAccess(await getAdminAccess());
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    setAuthBusy(true);
    setAuthError("");
    try {
      const { error } = await catalogClient.auth.signOut();
      if (error) throw error;
      setAccess({ status: "signed-out", email: "" });
      setProducts([]);
      setDraft(null);
      setVariant(null);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const refresh = async (id) => {
    const rows = await fetchAdminProducts();
    const selected = rows.find((product) => product.id === id) || rows[0] || null;
    setProducts(rows);
    setSelectedId(selected?.id || null);
    setDraft(selected ? productDraft(selected) : null);
    setDirty(false);
    setVariant(null);
    onCatalogChanged();
  };

  const canLeave = () => uploadCount === 0 && (!dirty || window.confirm("Hay cambios sin guardar. ¿Deseas descartarlos?"));
  const choose = (product) => {
    if (!canLeave()) return;
    setSelectedId(product.id);
    setDraft(productDraft(product));
    setFeedback(null);
    setDirty(false);
    setVariant(null);
  };
  const create = () => {
    if (!canLeave()) return;
    const nextOrder = Math.max(-1, ...products.map((product) => product.sort_order)) + 1;
    setSelectedId("__new__");
    setDraft(emptyProduct(nextOrder));
    setFeedback(null);
    setDirty(false);
    setVariant(null);
  };
  const updateDraft = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setDirty(true);
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    if (uploadCount) return;
    if (draft.is_published && !selectedProduct?.product_variants.some((item) => item.is_active)) {
      setFeedback({ type: "error", text: "Agrega al menos un color activo antes de publicar." });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const result = await saveAdminProduct(draft, selectedId === "__new__");
      await refresh(result.id);
      setFeedback({ type: "success", text: "Producto guardado." });
    } catch (error) {
      setFeedback({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const removeProduct = async () => {
    if (!selectedProduct || !window.confirm(`¿Eliminar ${selectedProduct.name} y todos sus colores? Esta acción no se puede deshacer.`)) return;
    setBusy(true);
    setFeedback(null);
    try {
      await deleteAdminProduct(selectedProduct.id);
      await refresh(null);
      setFeedback({ type: "success", text: "Producto eliminado." });
    } catch (error) {
      setFeedback({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const openNewVariant = () => {
    if (dirty) {
      setFeedback({ type: "error", text: "Guarda los cambios del producto antes de editar colores." });
      return;
    }
    const nextOrder = Math.max(-1, ...(selectedProduct?.product_variants || []).map((item) => item.sort_order)) + 1;
    setVariant(emptyVariant(nextOrder));
    setVariantError("");
  };
  const openVariant = (item) => {
    if (dirty) {
      setFeedback({ type: "error", text: "Guarda los cambios del producto antes de editar colores." });
      return;
    }
    setVariant(variantDraft(item));
    setVariantError("");
  };
  const closeVariant = () => { if (!busy) setVariant(null); };
  const saveVariant = async (event) => {
    event.preventDefault();
    if (uploadCount) return;
    const activeOthers = selectedProduct.product_variants.some((item) => item.is_active && item.id !== variant.id);
    if (selectedProduct.is_published && !variant.is_active && !activeOthers) {
      setVariantError("Oculta el producto antes de desactivar su último color.");
      return;
    }
    setBusy(true);
    setVariantError("");
    try {
      await saveAdminVariant(selectedProduct.id, variant);
      await refresh(selectedProduct.id);
      setFeedback({ type: "success", text: "Color guardado." });
    } catch (error) {
      setVariantError(error.message);
    } finally {
      setBusy(false);
    }
  };
  const removeVariant = async () => {
    const activeOthers = selectedProduct.product_variants.some((item) => item.is_active && item.id !== variant.id);
    if (selectedProduct.is_published && variant.is_active && !activeOthers) {
      setVariantError("Oculta el producto antes de eliminar su último color activo.");
      return;
    }
    if (!window.confirm(`¿Eliminar el color ${variant.name}? Esta acción no se puede deshacer.`)) return;
    setBusy(true);
    setVariantError("");
    try {
      await deleteAdminVariant(selectedProduct.id, variant.id);
      await refresh(selectedProduct.id);
      setFeedback({ type: "success", text: "Color eliminado." });
    } catch (error) {
      setVariantError(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (access.status !== "ready") {
    return <AccessScreen access={access} email={email} setEmail={setEmail} password={password} setPassword={setPassword} onSignIn={signIn} onSignOut={signOut} busy={authBusy} error={authError} />;
  }

  const categoryOptions = [...new Set(products.map((product) => product.category))];
  const brandOptions = [...new Set(products.map((product) => product.brand))];
  const thicknessOptions = [...new Set(products.map((product) => product.thickness))];

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar-inner">
          <div><span className="admin-brand">Madejitas<span>.sv</span></span><span className="admin-topbar-divider" /><strong>Catálogo</strong></div>
          <div className="admin-topbar-actions"><a href="#/home" className="admin-button secondary"><Eye size={17} /> <span>Ver sitio</span></a><button className="admin-icon-button" title="Cambiar contraseña" aria-label="Cambiar contraseña" onClick={() => setPasswordOpen(true)}><KeyRound size={19} /></button><button className="admin-icon-button" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={signOut} disabled={authBusy || uploadCount > 0}><LogOut size={19} /></button></div>
        </div>
      </header>
      <main className="admin-workspace">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-head"><div><h1>Productos</h1><span>{products.length} {products.length === 1 ? "ficha" : "fichas"} · {publishedCount} {publishedCount === 1 ? "publicada" : "publicadas"}</span></div><button className="admin-icon-button accent" title="Nuevo producto" aria-label="Nuevo producto" onClick={create} disabled={busy || uploadCount > 0}><Plus size={20} /></button></div>
          <div className="admin-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto" aria-label="Buscar producto" /></div>
          <div className="admin-segments" role="group" aria-label="Filtrar productos">
            {[["all", "Todos"], ["published", "Publicados"], ["draft", "Ocultos"]].map(([value, label]) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>)}
          </div>
          {listStatus === "loading" && <p className="admin-list-state" role="status">Cargando productos...</p>}
          {listStatus === "error" && <div className="admin-list-state" role="alert"><p>{listError}</p><button className="admin-button secondary" onClick={() => { setListStatus("loading"); fetchAdminProducts().then((rows) => { setProducts(rows); setSelectedId(rows[0]?.id || null); setDraft(rows[0] ? productDraft(rows[0]) : null); setListStatus("ready"); }).catch((error) => { setListError(error.message); setListStatus("error"); }); }}>Reintentar</button></div>}
          {listStatus === "ready" && <div className="admin-product-list">
            {filtered.map((product) => <button key={product.id} className={`admin-product-row ${selectedId === product.id ? "selected" : ""}`} onClick={() => choose(product)} disabled={busy || uploadCount > 0}>
              <img src={product.image_url} alt="" />
              <span className="admin-product-row-copy"><strong>{product.name}</strong><small>{product.category} · {money(Number(product.price))}</small></span>
              <span className={`admin-status-dot ${product.is_published ? "published" : ""}`} title={product.is_published ? "Publicado" : "Oculto"} />
            </button>)}
            {!filtered.length && <p className="admin-list-state">No hay productos para este filtro.</p>}
          </div>}
        </aside>
        <section className="admin-editor">
          {feedback && <div className={`admin-feedback ${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>{feedback.type === "success" && <Check size={17} />}{feedback.text}<button onClick={() => setFeedback(null)} aria-label="Cerrar aviso"><X size={16} /></button></div>}
          {!draft && listStatus === "ready" && <div className="admin-empty"><Package size={35} /><h2>Tu catálogo está vacío</h2><button className="admin-button primary" onClick={create}><Plus size={17} /> Nuevo producto</button></div>}
          {draft && <>
            <div className="admin-editor-heading"><div><span className="admin-eyebrow">{selectedId === "__new__" ? "Nueva ficha" : draft.id}</span><h2>{draft.name || "Nuevo producto"}</h2></div><div className={`admin-status-label ${draft.is_published ? "published" : ""}`}>{draft.is_published ? <Eye size={15} /> : <EyeOff size={15} />}{draft.is_published ? "Publicado" : "Oculto"}</div></div>
            <form onSubmit={saveProduct} className="admin-product-form">
              <div className="admin-section-heading"><h3>Ficha del producto</h3>{dirty && <span>Cambios sin guardar</span>}</div>
              <div className="admin-form-grid">
                <label className="wide">Nombre<input required value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} placeholder="Nombre del producto" /></label>
                <label>Categoría<input required list="admin-categories" value={draft.category} onChange={(event) => updateDraft("category", event.target.value)} /><datalist id="admin-categories">{categoryOptions.map((value) => <option key={value} value={value} />)}</datalist></label>
                <label>Marca<input required list="admin-brands" value={draft.brand} onChange={(event) => updateDraft("brand", event.target.value)} /><datalist id="admin-brands">{brandOptions.map((value) => <option key={value} value={value} />)}</datalist></label>
                <label>Grosor<input required list="admin-thicknesses" value={draft.thickness} onChange={(event) => updateDraft("thickness", event.target.value)} /><datalist id="admin-thicknesses">{thicknessOptions.map((value) => <option key={value} value={value} />)}</datalist></label>
                <label>Precio ($)<input type="number" min="0" step="0.01" required value={draft.price} onChange={(event) => updateDraft("price", event.target.value)} /></label>
                <label>Detalle breve<input value={draft.detail} onChange={(event) => updateDraft("detail", event.target.value)} placeholder="100 g · Hebra 3 mm" /></label>
                <label>Orden<input type="number" min="0" step="1" required value={draft.sort_order} onChange={(event) => updateDraft("sort_order", event.target.value)} /></label>
                <label className="wide">Descripción<textarea rows="3" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} /></label>
                <label>Distintivo<input value={draft.badge} onChange={(event) => updateDraft("badge", event.target.value)} placeholder="Nuevo" /></label>
                <label className="admin-check"><input type="checkbox" checked={draft.is_published} disabled={selectedId === "__new__"} onChange={(event) => updateDraft("is_published", event.target.checked)} /> Publicado en la tienda</label>
              </div>
              <div className="admin-section-heading"><h3>Imágenes</h3></div>
              <div className="admin-image-grid"><ImageField label="Imagen principal" required value={draft.image_url} onChange={(value) => updateDraft("image_url", value)} onError={(message) => setFeedback({ type: "error", text: message })} onUploadStart={() => setUploadCount((value) => value + 1)} onUploadEnd={() => setUploadCount((value) => value - 1)} /><ImageField label="Imagen de detalle" value={draft.hero_image_url} onChange={(value) => updateDraft("hero_image_url", value)} onError={(message) => setFeedback({ type: "error", text: message })} onUploadStart={() => setUploadCount((value) => value + 1)} onUploadEnd={() => setUploadCount((value) => value - 1)} /></div>
              <div className="admin-form-actions">
                {selectedProduct && <button type="button" className="admin-button danger" onClick={removeProduct} disabled={busy || uploadCount > 0}><Trash2 size={17} /> Eliminar producto</button>}
                <button type="submit" className="admin-button primary" disabled={busy || uploadCount > 0}><Save size={17} /> {busy ? "Guardando..." : "Guardar producto"}</button>
              </div>
            </form>
            {selectedProduct && <section className="admin-variants">
              <div className="admin-section-heading"><div><h3>Colores y existencias</h3><span>{selectedProduct.product_variants.length} variantes</span></div><button className="admin-button secondary" onClick={openNewVariant} disabled={busy}><Plus size={16} /> Nuevo color</button></div>
              <div className="admin-variant-list">
                {selectedProduct.product_variants.map((item) => <button key={item.id} className="admin-variant-row" onClick={() => openVariant(item)}>
                  <span className="admin-swatch" style={{ backgroundColor: item.hex_color }} />
                  <span className="admin-variant-name"><strong>{item.name}</strong><small>{item.code}{!item.is_active && " · Inactivo"}</small></span>
                  <span className="admin-variant-stock">{item.stock_quantity === null ? "Sin definir" : item.stock_quantity === 0 ? "Agotado" : `${item.stock_quantity} uds.`}</span>
                </button>)}
                {!selectedProduct.product_variants.length && <p className="admin-list-state">Todavía no hay colores para este producto.</p>}
              </div>
            </section>}
          </>}
        </section>
      </main>
      {variant && <VariantDialog draft={variant} setDraft={setVariant} onClose={closeVariant} onSave={saveVariant} onDelete={removeVariant} busy={busy || uploadCount > 0} error={variantError} mainImage={selectedProduct?.image_url} onUploadStart={() => setUploadCount((value) => value + 1)} onUploadEnd={() => setUploadCount((value) => value - 1)} onUploadError={setVariantError} />}
      {passwordOpen && <PasswordDialog onClose={() => setPasswordOpen(false)} onSaved={() => { setPasswordOpen(false); setFeedback({ type: "success", text: "Contraseña actualizada." }); }} />}
    </div>
  );
}
