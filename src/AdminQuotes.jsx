import { useEffect, useMemo, useState } from "react";
import { MessageCircle, RefreshCw, ReceiptText } from "lucide-react";
import { fetchAdminQuotes, QUOTE_STATUSES, updateQuoteStatus } from "./adminQuotesApi.js";
import { quoteReference } from "./quoteApi.js";
import { money } from "./data.js";

const LABELS = { all: "Todas", new: "Nueva", reviewed: "Revisada", confirmed: "Confirmada", sent: "Enviada", cancelled: "Cancelada" };

export default function AdminQuotes() {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetchAdminQuotes(page, status).then((result) => {
      if (!active) return;
      setRows(result.rows);
      setCount(result.count);
      setSelectedId((current) => result.rows.some((row) => row.id === current) ? current : result.rows[0]?.id || null);
      setLoading(false);
    }).catch((fetchError) => {
      if (!active) return;
      setError(fetchError.message);
      setLoading(false);
    });
    return () => { active = false; };
  }, [page, status, reload]);

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return rows.filter((row) => !term || `${quoteReference(row.quote_number)} ${row.customer_name} ${row.customer_phone} ${row.customer_city}`.toLocaleLowerCase("es").includes(term));
  }, [rows, search]);
  const selected = visible.find((row) => row.id === selectedId) || visible[0];

  const changeStatus = async (next) => {
    if (!selected || next === selected.status) return;
    setSaving(true);
    setSaveError("");
    try {
      await updateQuoteStatus(selected.id, next);
      setReload((value) => value + 1);
    } catch (saveFailure) {
      setSaveError(saveFailure.message);
    } finally {
      setSaving(false);
    }
  };

  return <main className="admin-workspace admin-quotes-workspace">
    <aside className="admin-sidebar">
      <div className="admin-sidebar-head"><div><h1>Cotizaciones</h1><span>{count} {count === 1 ? "solicitud" : "solicitudes"}</span></div><button className="admin-icon-button" title="Actualizar" aria-label="Actualizar cotizaciones" onClick={() => setReload((value) => value + 1)}><RefreshCw size={18} /></button></div>
      <div className="admin-search"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en esta página" aria-label="Buscar en esta página" /></div>
      <label className="admin-quotes-filter">Estado<select value={status} onChange={(event) => { setPage(0); setStatus(event.target.value); setSearch(""); }}>{["all", ...QUOTE_STATUSES].map((value) => <option key={value} value={value}>{LABELS[value]}</option>)}</select></label>
      {loading && <p className="admin-list-state" role="status">Cargando cotizaciones...</p>}
      {error && <div className="admin-list-state" role="alert"><p>{error}</p><button className="admin-button secondary" onClick={() => setReload((value) => value + 1)}>Reintentar</button></div>}
      {!loading && !error && <div className="admin-product-list">
        {visible.map((row) => <button key={row.id} className={`admin-quote-row ${selected?.id === row.id ? "selected" : ""}`} onClick={() => { setSelectedId(row.id); setSaveError(""); }}>
          <span><strong>{quoteReference(row.quote_number)}</strong><small>{row.customer_name}</small></span>
          <span><time>{new Intl.DateTimeFormat("es-SV", { dateStyle: "short" }).format(new Date(row.created_at))}</time><small className="admin-quote-status">{LABELS[row.status]}</small></span>
        </button>)}
        {!visible.length && <p className="admin-list-state">No hay cotizaciones para mostrar.</p>}
      </div>}
      {!loading && !error && count > 30 && <div className="admin-quotes-pages"><button className="admin-button secondary" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Anterior</button><span>{page + 1} de {Math.ceil(count / 30)}</span><button className="admin-button secondary" disabled={(page + 1) * 30 >= count} onClick={() => setPage((value) => value + 1)}>Siguiente</button></div>}
    </aside>
    <section className="admin-editor admin-quote-detail">
      {!selected && !loading && !error && <div className="admin-empty"><ReceiptText size={35} /><h2>No hay solicitudes en esta vista</h2></div>}
      {selected && <>
        <div className="admin-editor-heading"><div><span className="admin-eyebrow">{new Intl.DateTimeFormat("es-SV", { dateStyle: "medium", timeStyle: "short" }).format(new Date(selected.created_at))}</span><h2>{quoteReference(selected.quote_number)}</h2></div><span className="admin-status-label published">{LABELS[selected.status]}</span></div>
        <div className="admin-quote-meta"><div><small>Cliente</small><strong>{selected.customer_name}</strong></div><div><small>WhatsApp</small><strong>+503 {selected.customer_phone}</strong></div><div><small>Ciudad</small><strong>{selected.customer_city}</strong></div></div>
        <a className="admin-button secondary admin-quote-whatsapp" href={`https://wa.me/503${selected.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${selected.customer_name}, te escribimos de Madejitas.sv sobre tu cotización ${quoteReference(selected.quote_number)}.`)}`} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Escribir por WhatsApp</a>
        {selected.customer_comment && <p className="admin-quote-comment"><strong>Comentario:</strong> {selected.customer_comment}</p>}
        <div className="admin-section-heading"><h3>Artículos solicitados</h3><span>{selected.quote_items?.length || 0} {(selected.quote_items?.length || 0) === 1 ? "color" : "colores"}</span></div>
        <div className="admin-quote-items">{[...(selected.quote_items || [])].sort((a, b) => a.id - b.id).map((item) => <div key={item.id} className="admin-quote-item"><div><strong>{item.product_name}</strong><small>{item.variant_name} ({item.variant_code}) · {item.quantity} × {money(Number(item.unit_price))}</small></div><strong>{money(Number(item.line_total))}</strong></div>)}</div>
        <div className="admin-quote-totals"><div><span>Subtotal</span><strong>{money(Number(selected.subtotal))}</strong></div><div><span>Envío estimado</span><strong>{money(Number(selected.shipping))}</strong></div><div><span>Total estimado</span><strong>{money(Number(selected.total))}</strong></div></div>
        <div className="admin-quote-manage"><label>Estado de la solicitud<select value={selected.status} onChange={(event) => changeStatus(event.target.value)} disabled={saving}>{QUOTE_STATUSES.map((value) => <option key={value} value={value}>{LABELS[value]}</option>)}</select></label>{saving && <span role="status">Guardando...</span>}{saveError && <p role="alert" className="admin-feedback error">{saveError}</p>}</div>
      </>}
    </section>
  </main>;
}
