"use client"

import { useState, useMemo, useEffect } from "react"
import { Partner, Product } from "@/types"
import { buildWhatsAppUrl } from "@/lib/whatsapp"
import { getOptimizedImageUrl } from "@/lib/image"
import { useRouter } from "next/navigation"
import {
  displayFont, INK, PAPER, MUTED, FREE_BG, TAKEN_BG, WA_BG, WA_TEXT,
  catColors, fmtPrice as fmt, todayCdmx, longDate, shortDate, footprint, capacityText,
} from "@/lib/catalogUi"

import PartnerPixel from "@/components/PartnerPixel"
import PartnerGTM from "@/components/PartnerGTM"

const PAGE_SIZE = 12

interface Props {
  partner: Partner
  products: Product[]
  featured?: Product[]
  pixelId: string | null
  branchName?: string | null
  branchSlug?: string | null
  activeSlug?: string | null
  hidePrice?: boolean
  /** Sucursal activa: habilita el filtro de fecha (disponibilidad) */
  branchId?: string | null
  /** Fecha del evento desde la URL (?fecha=YYYY-MM-DD) */
  initialDate?: string | null
}

type Availability = Record<string, { available: boolean; stock_remaining?: number }>

const CATEGORIES = ["Todos", "Acuático", "Clásico", "Destreza", "Interactivo", "Mecánico", "Personajes", "Princesas", "Variedad"]
const STAGES = ["Todas", "Infantes", "Niños", "Adolescentes", "Adultos"]

const getFinalPrice = (product: Product) => {
  return product.price ?? 0
}

export default function CatalogClient({ partner, products, featured = [], pixelId, branchName, branchSlug, activeSlug, hidePrice, branchId, initialDate }: Props) {
  const router = useRouter()
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Find the WhatsApp number associated with the active slug
  const activeWhatsApp = useMemo(() => {
    if (!activeSlug || !partner.links) return partner.whatsapp
    const link = partner.links.find(l => l.slug.toLowerCase() === activeSlug.toLowerCase())
    return link ? link.whatsapp : partner.whatsapp
  }, [activeSlug, partner.links, partner.whatsapp])

  
  async function trackEvent(eventName: string, data?: Record<string, unknown>) {
    try {
      const ReactPixel = (await import('react-facebook-pixel')).default
      ReactPixel.track(eventName, data ?? {})
    } catch (e) { console.error('Pixel err', e) }

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName,
        eventSourceUrl: window.location.href,
        branchSlug,
        currency: 'MXN',
        ...data,
      }),
    }).catch(() => {})
  }

  const [activeCategory, setActiveCategory] = useState("Todos")
  const [maxPrice, setMaxPrice]             = useState(12000)
  const [activeStage, setActiveStage]       = useState("Todas")
  const [activeSize, setActiveSize]         = useState("Todas")
  const [searchTerm, setSearchTerm]         = useState("")
  const [visibleCount, setVisibleCount]     = useState(PAGE_SIZE)

  // ── Disponibilidad por fecha ───────────────────────────────────────────────
  const [eventDate, setEventDate]       = useState<string>(initialDate ?? "")
  const [availability, setAvailability] = useState<Availability | null>(null)
  const [availLoading, setAvailLoading] = useState(!!(initialDate && branchId))
  const [availError, setAvailError]     = useState(false)

  const changeDate = (day: string) => {
    setEventDate(day)
    setAvailability(null)
    setAvailError(false)
    if (day) setAvailLoading(true)
    // La fecha vive en la URL para poder compartir el catálogo ya filtrado
    const url = new URL(window.location.href)
    if (day) url.searchParams.set("fecha", day)
    else url.searchParams.delete("fecha")
    window.history.replaceState(null, "", url.toString())
  }

  useEffect(() => {
    if (!branchId || !eventDate) return
    let cancelled = false
    fetch(`/api/availability?branch_id=${encodeURIComponent(branchId)}&date=${eventDate}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status))
        const rows = (await r.json()) as { product_id: string; available: boolean; stock_remaining?: number }[]
        if (cancelled) return
        const map: Availability = {}
        for (const row of Array.isArray(rows) ? rows : []) map[row.product_id] = { available: row.available, stock_remaining: row.stock_remaining }
        setAvailability(map)
      })
      .catch(() => { if (!cancelled) { setAvailability(null); setAvailError(true) } })
      .finally(() => { if (!cancelled) setAvailLoading(false) })
    return () => { cancelled = true }
  }, [branchId, eventDate])


  const isFilterActive = activeCategory !== "Todos" || maxPrice < 12000 || activeStage !== "Todas" || activeSize !== "Todas" || searchTerm !== ""

  // Reset pagination when filters change
  const resetAndSet = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v)
    setVisibleCount(PAGE_SIZE)
  }

  const filtered = useMemo(() => products.filter(p => {
    const catName = p.categories?.name || "Variedad"
    const catMatch   = activeCategory === "Todos" || catName === activeCategory
    const priceMatch = getFinalPrice(p) <= maxPrice
    const sizeMatch  = activeSize === "Todas" || p.size === activeSize
    const searchMatch = searchTerm === "" || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p.description ?? "").toLowerCase().includes(searchTerm.toLowerCase())

    let stageMatch = activeStage === "Todas"
    if (!stageMatch) {
      const stages = (p.stage ?? []).map(s => s.toLowerCase())
      const minAge = (p.min_age ?? "").toLowerCase()
      const targetStage = activeStage.toLowerCase()
      stageMatch = stages.includes(targetStage) || minAge.includes(targetStage)
      if (!stageMatch && (minAge.includes("todas") || minAge.includes("todos"))) stageMatch = true
    }
    return catMatch && priceMatch && stageMatch && sizeMatch && searchMatch
  }), [activeCategory, maxPrice, activeStage, activeSize, searchTerm, products])

  const handleProductClick = (product: Product) => {
    trackEvent('ViewContent', { 
      contentName: product.name, 
      contentId: product.id, 
      value: getFinalPrice(product) 
    })
    
    const baseUrl = activeSlug && activeSlug.toLowerCase() !== partner.slug.toLowerCase()
      ? `/${partner.slug}/${activeSlug}`
      : `/${partner.slug}`

    const wlSuffix = hidePrice ? '?sp=1' : ''

    if (branchSlug) {
      const params = new URLSearchParams(wlSuffix.replace('?', ''))
      if (eventDate) params.set('fecha', eventDate)
      const qs = params.toString()
      router.push(`${baseUrl}/${branchSlug}/catalogo/${product.slug}${qs ? `?${qs}` : ''}`)
    } else {
      // Global fallback if no branch
      router.push(`${baseUrl}/catalogo/${product.slug}${wlSuffix}`)
    }
  }

  const display = displayFont.style.fontFamily
  const reservedCount = availability ? filtered.filter(p => availability[p.id]?.available === false).length : 0
  const freeCount = filtered.length - reservedCount
  const extraFilters = (maxPrice < 12000 ? 1 : 0) + (activeStage !== "Todas" ? 1 : 0)
  const clearAll = () => { setActiveCategory("Todos"); setMaxPrice(12000); setActiveStage("Todas"); setActiveSize("Todas"); setSearchTerm(""); setVisibleCount(PAGE_SIZE) }

  return (
    <div style={{ background: "var(--color-primary)", minHeight: "100vh", color: INK }}>
      <PartnerPixel pixelId={pixelId} />
      <PartnerGTM gtmId={null} /> {/* GTM is now in branch layout */}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes sc-spin { to { transform: rotate(360deg) } }
        @keyframes sc-pulse { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
        .sc-spin { width: 16px; height: 16px; border-radius: 50%; border: 2.5px solid currentColor; border-right-color: transparent; animation: sc-spin .7s linear infinite; flex-shrink: 0; }
        .sc-wrap { max-width: 1180px; margin: 0 auto; padding: 0 16px; box-sizing: border-box; }
        .sc-fichas { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .sc-ficha { transition: transform .12s, box-shadow .12s; }
        .sc-ficha:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0 ${INK} !important; }
        .sc-btn:active { filter: brightness(.94); }
        .sc-chip:focus-visible, .sc-btn:focus-visible { outline: 3px solid ${INK}; outline-offset: 2px; }
        @media (min-width: 720px) {
          .sc-wrap { padding: 0 28px; }
          .sc-fichas { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
          .sc-ctrl { max-width: 640px; }
        }
        @media (min-width: 1100px) { .sc-fichas { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (hover: hover) { .sc-ficha:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 ${INK} !important; } }
      `}</style>

      {/* ── ENCABEZADO OSCURO: marca + fecha + buscador (fijo al hacer scroll) ── */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--color-primary)", color: "var(--text-on-primary)" }}>
        <div className="sc-wrap" style={{ paddingTop: 12, paddingBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              {partner.logo_url && (
                <img src={partner.logo_url} alt="" style={{ height: 32, maxWidth: 80, objectFit: "contain", flexShrink: 0 }} />
              )}
              <span style={{ fontFamily: display, fontWeight: 800, fontSize: 22, lineHeight: 1.05, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {partner.name}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {branchName && (
                <span style={{ fontSize: 12, fontWeight: 800, border: "2px solid var(--color-secondary)", color: "var(--color-secondary)", borderRadius: 999, padding: "4px 10px", whiteSpace: "nowrap", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {branchName}
                </span>
              )}
              <a href={`https://wa.me/${activeWhatsApp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                onClick={() => trackEvent('Lead')} aria-label="Escribir por WhatsApp" className="sc-btn"
                style={{ width: 40, height: 40, borderRadius: "50%", background: WA_BG, border: `2px solid ${INK}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={WA_TEXT} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L4 21l1.6-4.3A8.5 8.5 0 1 1 21 12z" /></svg>
              </a>
            </div>
          </div>

          <div className="sc-ctrl" style={{ display: "flex", gap: 8 }}>
            {branchId && (
              <div style={{ position: "relative", flex: eventDate ? 1.15 : 1.3, minWidth: 0, display: "flex", alignItems: "center", gap: 6, padding: "0 6px 0 12px", height: 52, boxSizing: "border-box",
                borderRadius: 14, background: "var(--color-secondary)", color: "var(--text-on-secondary)", border: `2px solid ${INK}` }}>
                <span style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, minWidth: 0, lineHeight: 1.15 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.04em" }}>FECHA</span>
                  <span style={{ fontSize: 15, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {eventDate ? shortDate(eventDate) : "Elegir día"}
                  </span>
                </span>
                {availLoading && <span className="sc-spin" aria-label="Revisando disponibilidad" />}
                {/* El selector nativo cubre la tarjeta: en celular abre el calendario del teléfono; en computadora, showPicker() */}
                <input
                  type="date"
                  value={eventDate}
                  min={todayCdmx()}
                  onChange={(e) => changeDate(e.target.value)}
                  onClick={(e) => { try { e.currentTarget.showPicker?.() } catch { /* ya abierto o no soportado */ } }}
                  aria-label="Día del evento"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", border: "none", zIndex: 1 }}
                />
                {eventDate && !availLoading && (
                  <button type="button" onClick={() => changeDate("")} aria-label="Quitar fecha"
                    style={{ position: "relative", zIndex: 2, border: `2px solid ${INK}`, background: "#fff", color: INK, borderRadius: 999, width: 30, height: 30, cursor: "pointer", fontSize: 12, fontWeight: 800, flexShrink: 0, padding: 0 }}>✕</button>
                )}
              </div>
            )}
            <label style={{ flex: 2, minWidth: 0, display: "flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 14, padding: "0 12px", height: 52, boxSizing: "border-box", border: `2px solid ${INK}` }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <input
                type="search"
                placeholder="Buscar inflable…"
                value={searchTerm}
                onChange={(e) => resetAndSet(setSearchTerm)(e.target.value)}
                aria-label="Buscar inflable"
                style={{ border: "none", background: "transparent", outline: "none", fontSize: 16, flexGrow: 1, minWidth: 0, color: INK, fontFamily: "inherit" }}
              />
            </label>
          </div>
        </div>
      </header>

      {/* ── PANEL CLARO ── */}
      <main style={{ background: PAPER, borderRadius: "24px 24px 0 0", minHeight: "70vh", paddingTop: 14, paddingBottom: 32 }}>
        <div className="sc-wrap" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Categorías (scroll lateral) + botón de filtros */}
          <div className="hide-scrollbar" style={{ display: "flex", gap: 6, overflowX: "auto", margin: "0 -16px", padding: "2px 16px 4px" }}>
            <button type="button" className="sc-chip" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen}
              style={{ flexShrink: 0, padding: "8px 14px", minHeight: 38, borderRadius: 999, fontSize: 13, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap",
                border: `2px solid ${INK}`, background: filtersOpen ? INK : "#fff", color: filtersOpen ? "#fff" : INK }}>
              {filtersOpen ? "✕ Filtros" : `Filtros${extraFilters ? ` · ${extraFilters}` : ""}`}
            </button>
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat
              const c = cat === "Todos" ? null : catColors(cat)
              return (
                <button key={cat} type="button" className="sc-chip"
                  onClick={() => resetAndSet(setActiveCategory)(cat)}
                  aria-pressed={isActive}
                  style={{
                    flexShrink: 0, padding: "8px 14px", minHeight: 38, borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                    border: "2px solid transparent",
                    background: isActive ? (c ? c.bg : "var(--color-primary)") : (c ? c.light : "#EFEBE0"),
                    color: isActive ? (c ? "#fff" : "var(--text-on-primary)") : (c ? c.text : INK),
                  }}
                >
                  {c ? `${c.emoji} ` : ""}{cat}
                </button>
              )
            })}
          </div>

          {filtersOpen && (
            <div style={{ background: "#fff", border: `2px solid ${INK}`, borderRadius: 16, padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              {!hidePrice && (
                <div>
                  <div style={{ fontSize: 12, color: MUTED, letterSpacing: "0.06em", marginBottom: 8, fontWeight: 800 }}>PRECIO MÁXIMO</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <input type="range" min={3000} max={12000} step={500} value={maxPrice}
                      onChange={e => resetAndSet(setMaxPrice)(Number(e.target.value))}
                      aria-label="Precio máximo"
                      style={{ flex: 1, accentColor: INK, minHeight: 32 }} />
                    <span style={{ fontSize: 15, fontWeight: 800, minWidth: 70 }}>{fmt(maxPrice)}</span>
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 12, color: MUTED, letterSpacing: "0.06em", marginBottom: 8, fontWeight: 800 }}>ETAPA / EDAD</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {STAGES.map(stage => (
                    <button key={stage} type="button" className="sc-chip" onClick={() => resetAndSet(setActiveStage)(stage)} aria-pressed={activeStage === stage} style={{
                      padding: "8px 14px", minHeight: 38, borderRadius: 999, border: `2px solid ${INK}`,
                      background: activeStage === stage ? INK : "#fff",
                      color: activeStage === stage ? "#fff" : INK,
                      fontSize: 13, cursor: "pointer", fontWeight: 700,
                    }}>{stage}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Cintillo de ayuda: solo mientras no hay fecha elegida */}
          {branchId && !eventDate && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, border: `2px solid ${INK}`,
              background: "var(--color-secondary)", color: "var(--text-on-secondary)", fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>
              <span aria-hidden="true" style={{ fontSize: 20, flexShrink: 0 }}>📅</span>
              <span>Busca un juego o <strong style={{ fontWeight: 800 }}>elige la fecha de tu evento</strong> para ver cuáles están libres.</span>
            </div>
          )}

          {/* Estado: resultados / disponibilidad */}
          <div role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 13, color: MUTED, minHeight: 24 }}>
            {branchId && eventDate && availLoading ? (
              <><span className="sc-spin" style={{ width: 14, height: 14, color: INK }} /> Revisando disponibilidad para el <strong style={{ color: INK }}>{longDate(eventDate)}</strong>…</>
            ) : branchId && eventDate && availError ? (
              <span style={{ color: "#B45309", fontWeight: 700 }}>No pudimos revisar la disponibilidad. Pregunta por WhatsApp para confirmar.</span>
            ) : branchId && eventDate && availability ? (
              <span>
                <strong style={{ color: "#15803D" }}>✓ {freeCount} {freeCount === 1 ? "libre" : "libres"} el {shortDate(eventDate).replace(/ \S+$/, "").toLowerCase()}</strong>
                {reservedCount > 0 && <> · {reservedCount} {reservedCount === 1 ? "reservado" : "reservados"}</>}
              </span>
            ) : (
              <span>
                {filtered.length} {filtered.length === 1 ? "inflable" : "inflables"}
              </span>
            )}
            {isFilterActive && (
              <button type="button" onClick={clearAll}
                style={{ marginLeft: "auto", padding: "4px 12px", minHeight: 32, borderRadius: 999, border: `2px solid ${INK}`, background: "#fff", color: INK, fontSize: 12, cursor: "pointer", fontWeight: 800 }}>
                Limpiar
              </button>
            )}
          </div>

          {/* ── FICHAS ── */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 16px", border: `2px dashed ${INK}`, borderRadius: 20, color: MUTED }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
              <div style={{ fontWeight: 800, color: INK, marginBottom: 12 }}>No encontramos inflables con esos filtros</div>
              <button type="button" onClick={clearAll} className="sc-btn"
                style={{ padding: "10px 18px", borderRadius: 12, border: `2px solid ${INK}`, background: "#fff", fontWeight: 800, cursor: "pointer", color: INK }}>
                Ver todo el catálogo
              </button>
            </div>
          ) : (
            <div className="sc-fichas">
              {filtered.slice(0, visibleCount).map((product, idx) => {
                const catName = product.categories?.name || "Variedad"
                const c = catColors(catName)
                const price = getFinalPrice(product)
                const isEager = idx < 4
                const avail = eventDate && availability ? availability[product.id] : undefined
                const reserved = avail?.available === false
                const checking = !!eventDate && availLoading
                const dims = footprint(product)
                const cap = capacityText(product.capacity)
                const meta = [dims, cap].filter(Boolean).join(" · ")

                const badge = checking
                  ? { text: "Revisando…", bg: "#fff", pulse: true }
                  : avail
                    ? reserved ? { text: "Reservado", bg: TAKEN_BG, pulse: false } : { text: "Libre", bg: FREE_BG, pulse: false }
                    : product.popular ? { text: "⭐ Popular", bg: "var(--color-secondary)", pulse: false } : null

                return (
                  <article key={product.id} className="sc-ficha"
                    style={{ border: `2px solid ${INK}`, borderRadius: 20, overflow: "hidden", background: "#fff", boxShadow: `4px 4px 0 ${INK}`,
                      opacity: reserved ? 0.5 : 1, filter: reserved ? "grayscale(1)" : "none", display: "flex", flexDirection: "column" }}>
                    <div onClick={() => handleProductClick(product)} style={{ display: "flex", cursor: "pointer", flex: 1 }}>
                      <div style={{ width: 150, height: 150, flexShrink: 0, position: "relative", borderRight: `2px solid ${INK}`, background: c.light, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {product.image_main ? (
                          <img
                            src={getOptimizedImageUrl(product.image_main, 320, 75)}
                            alt={product.name}
                            loading={isEager ? "eager" : "lazy"}
                            decoding="async"
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
                          />
                        ) : (
                          <span style={{ fontSize: 48 }} aria-hidden="true">{c.emoji}</span>
                        )}
                        {badge && (
                          <span style={{ position: "absolute", top: 8, left: 8, border: `2px solid ${INK}`, background: badge.bg, color: badge.bg === "var(--color-secondary)" ? "var(--text-on-secondary)" : INK,
                            fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999, animation: badge.pulse ? "sc-pulse 1.2s ease-in-out infinite" : undefined }}>
                            {badge.text}
                          </span>
                        )}
                      </div>
                      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flexGrow: 1 }}>
                        <h2 style={{ margin: 0, fontFamily: display, fontWeight: 800, fontSize: 19, lineHeight: 1.05, overflowWrap: "anywhere" }}>{product.name}</h2>
                        {meta && <span style={{ fontSize: 12, fontWeight: 700, color: MUTED }}>{meta}</span>}
                        {product.min_age && <span style={{ fontSize: 12, fontWeight: 700, color: MUTED }}>{product.min_age}</span>}
                        {!meta && !product.min_age && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: c.text }}>{c.emoji} {catName}</span>
                        )}
                        <span style={{ flexGrow: 1 }} />
                        {!hidePrice && <span style={{ fontFamily: display, fontSize: 20, fontWeight: 800 }}>{fmt(price)}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", borderTop: `2px solid ${INK}` }}>
                      <a href={buildWhatsAppUrl(partner, product.name, branchName || undefined, activeWhatsApp, eventDate ? longDate(eventDate) : undefined)}
                        target="_blank" rel="noopener noreferrer" className="sc-btn"
                        onClick={() => trackEvent('Contact', { contentName: product.name, contentId: product.id })}
                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 46, background: reserved ? "#F1EFE8" : WA_BG, color: reserved ? MUTED : WA_TEXT, fontWeight: 800, fontSize: 14, textDecoration: "none", borderRight: `2px solid ${INK}` }}>
                        {reserved ? "Preguntar" : "Apartar"}
                      </a>
                      <button type="button" onClick={() => handleProductClick(product)} className="sc-btn"
                        style={{ flex: 1, minHeight: 46, border: "none", background: "#fff", color: INK, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                        Ver ficha
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {/* ── VER MÁS ── */}
          {visibleCount < filtered.length && (
            <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
              <button type="button" onClick={() => setVisibleCount(v => v + PAGE_SIZE)} className="sc-btn"
                style={{ padding: "14px 28px", borderRadius: 14, border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, background: "#fff", color: INK, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
                Ver más ({filtered.length - visibleCount} restantes)
              </button>
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", padding: "32px 16px 8px", fontSize: 12, color: MUTED }}>
          Catálogo con tecnología de <strong style={{ color: INK }}>Brincolines Bambinos</strong>
        </div>
      </main>
    </div>
  )
}
