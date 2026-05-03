"use client"

import { useState, useMemo } from "react"
import { Partner, Product } from "@/types"
import { buildWhatsAppUrl } from "@/lib/whatsapp"

import PartnerPixel from "@/components/PartnerPixel"

interface Props {
  partner: Partner
  products: Product[]
  featured?: Product[]
  pixelId: string | null
  branchSlug: string | null
}

const CATEGORIES = ["Todos", "Acuático", "Clásico", "Destreza", "Interactivo", "Mecánico", "Personajes", "Princesas", "Variedad"]
const AGE_GROUPS = ["Todos", "Infantes", "Niños", "Adolescentes", "Adultos"]

const CAT_COLORS: Record<string, { bg: string; light: string; emoji: string }> = {
  "Acuático":    { bg: "#0EA5E9", light: "#E0F2FE", emoji: "🌊" },
  "Clásico":     { bg: "#8B5CF6", light: "#EDE9FE", emoji: "🏰" },
  "Destreza":    { bg: "#16A34A", light: "#DCFCE7", emoji: "🎯" },
  "Interactivo": { bg: "#3B82F6", light: "#DBEAFE", emoji: "⚡" },
  "Mecánico":    { bg: "#F97316", light: "#FEF3C7", emoji: "🤠" },
  "Personajes":  { bg: "#EF4444", light: "#FEE2E2", emoji: "🦸" },
  "Princesas":   { bg: "#EC4899", light: "#FCE7F3", emoji: "👑" },
  "Variedad":    { bg: "#EAB308", light: "#FEF9C3", emoji: "🎉" },
}

const fmt = (n: number) => `$${n.toLocaleString("es-MX")}`

const getFinalPrice = (product: Product) => {
  return product.price ?? 0
}

export default function CatalogClient({ partner, products, featured = [], pixelId, branchSlug }: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  async function trackEvent(eventName: string, data?: Record<string, any>) {
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
        currency: partner.branches?.currency ?? 'MXN',
        ...data,
      }),
    }).catch(() => {})
  }
  const [activeCategory, setActiveCategory] = useState("Todos")
  const [maxPrice, setMaxPrice]             = useState(12000)
  const [activeAge, setActiveAge]           = useState("Todos")
  const [selected, setSelected]             = useState<Product | null>(null)

  const filtered = useMemo(() => products.filter(p => {
    const catName = p.categories?.name || "Variedad"
    const catMatch   = activeCategory === "Todos" || catName === activeCategory
    const priceMatch = getFinalPrice(p) <= maxPrice
    
    // Filtro por tags
    const ageMatch   = activeAge === "Todos" || (p.custom_tags ?? []).includes(activeAge)
    
    return catMatch && priceMatch && ageMatch
  }), [activeCategory, maxPrice, activeAge, products])

  const recommended = selected
    ? products.filter(p => p.id !== selected.id && p.categories?.name === selected.categories?.name).slice(0, 3)
    : []

  const cc = (catName: string): { bg: string; light: string; emoji: string } => {
    return CAT_COLORS[catName] || { bg: "#6B7280", light: "#F3F4F6", emoji: "🎪" }
  }

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif", background: "#F8F7F3", minHeight: "100vh", color: "#1A1A2E" }}>
      <PartnerPixel pixelId={pixelId} />

      {/* ── HEADER ── */}
      <div style={{ background: partner.primary_color, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {partner.logo_url ? (
              <img src={partner.logo_url} alt={partner.name} style={{ height: 36, objectFit: "contain" }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
                {partner.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{partner.name}</div>
              <div style={{ fontSize: 11, opacity: 0.5, letterSpacing: 0.5 }}>Plataforma Oficial</div>
            </div>
          </div>
          <a href={`https://wa.me/${partner.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
             onClick={() => trackEvent('Lead')}
            style={{ background: partner.secondary_color, color: "#fff", padding: "10px 20px", borderRadius: 50, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            💬 Contacto directo
          </a>
        </div>

        {/* Hero */}
        <div style={{ textAlign: "center", padding: "3rem 2rem 3.5rem" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, opacity: 0.4, textTransform: "uppercase", marginBottom: 14 }}>Catálogo de inflables</div>
          <h1 style={{ fontSize: 44, fontWeight: 800, margin: "0 0 12px", lineHeight: 1.1 }}>Nuestros Inflables</h1>
          <p style={{ fontSize: 16, opacity: 0.6, margin: 0, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
            Encuentra el inflable perfecto para tu próximo evento
          </p>
          <div style={{ display: "flex", gap: 40, justifyContent: "center", marginTop: 28 }}>
            {[["Variedad", "de juegos"], ["Calidad", "garantizada"], ["16+", "años de experiencia"]].map(([n, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{n}</div>
                <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .filter-toggle-btn { display: block !important; }
          .filters-panel { display: none; padding-top: 12px; }
          .filters-panel.open { display: block; }
        }
      `}</style>

      {/* ── FILTERS ── */}
      <div style={{ background: "#fff", borderBottom: "1.5px solid #EAE8E0", padding: "1rem 2rem", position: "sticky", top: 0, zIndex: 100 }}>
        
        {/* Toggle + Count */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#bbb' }}>{filtered.length} inflables</span>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            style={{
              display: 'none',
              padding: '8px 16px',
              borderRadius: 50,
              border: '1px solid #E5E3DC',
              background: filtersOpen ? partner.primary_color : '#fff',
              color: filtersOpen ? '#fff' : '#666',
              fontSize: 13,
              cursor: 'pointer',
            }}
            className="filter-toggle-btn"
          >
            {filtersOpen ? '✕ Cerrar' : '⚙ Filtrar'}
          </button>
        </div>

        <div className={`filters-panel ${filtersOpen ? 'open' : ''}`}>
          {/* Category pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              padding: "6px 16px", borderRadius: 50, border: "1.5px solid",
              borderColor: activeCategory === cat ? partner.primary_color : "#E5E3DC",
              background: activeCategory === cat ? partner.primary_color : "#fff",
              color: activeCategory === cat ? "#fff" : "#666",
              fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}>{cat}</button>
          ))}
        </div>
        {/* Price + Age */}
        <div style={{ display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#999", whiteSpace: "nowrap" }}>Precio máx:</span>
            <input type="range" min={3000} max={12000} step={500} value={maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value))}
              style={{ width: 120, accentColor: partner.primary_color }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: partner.primary_color, minWidth: 64 }}>{fmt(maxPrice)}</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {AGE_GROUPS.map(age => (
              <button key={age} onClick={() => setActiveAge(age)} style={{
                padding: "4px 12px", borderRadius: 50, border: "1px solid",
                borderColor: activeAge === age ? partner.secondary_color : "#E5E3DC",
                background: activeAge === age ? "#FEF0EB" : "#fff",
                color: activeAge === age ? partner.secondary_color : "#999",
                fontSize: 12, cursor: "pointer", fontWeight: activeAge === age ? 600 : 400
              }}>{age}</button>
            ))}
          </div>
        </div>
        </div>
      </div>

      {/* ── FEATURED ── */}
      {featured.length > 0 && (
        <div style={{ padding: '2rem 2rem 0', maxWidth: 1280, margin: '0 auto' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
            ⭐ Juegos destacados
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
            gap: 20,
            marginBottom: 40
          }}>
            {featured.map(product => {
              const catName = product.categories?.name || "Variedad"
              const c = cc(catName)
              const price = getFinalPrice(product)
              
              return (
                <div key={product.id}
                  style={{ background: "#fff", borderRadius: 18, overflow: "hidden", cursor: "pointer", border: "1px solid #EAE8E0", transition: "transform 0.15s" }}
                  onClick={() => {
                    setSelected(product)
                    trackEvent('ViewContent', { contentName: product.name, contentId: product.id, value: price })
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                >
                  <div style={{ background: c.light, aspectRatio: "1 / 1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
                    {product.image_main ? (
                      <img src={product.image_main} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <>
                        <div style={{ fontSize: 56 }}>{c.emoji}</div>
                        <div style={{ fontSize: 11, color: c.bg, fontWeight: 600, marginTop: 6, opacity: 0.7 }}>{product.size || "—"}</div>
                      </>
                    )}
                    {product.popular && <div style={{ position: "absolute", top: 12, left: 12, background: partner.secondary_color, color: "#fff", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 50 }}>⭐ POPULAR</div>}
                    {product.needs_operator && <div style={{ position: "absolute", top: 12, right: 12, background: partner.primary_color, color: "#fff", fontSize: 10, padding: "4px 10px", borderRadius: 50 }}>Con operador</div>}
                  </div>
                  <div style={{ padding: "1rem 1.1rem 1.2rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{product.name}</h3>
                      <span style={{ fontSize: 16, fontWeight: 800, color: partner.primary_color, whiteSpace: "nowrap" }}>{fmt(price)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 50, background: c.light, color: c.bg, fontWeight: 600 }}>{catName}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "#999", margin: "0 0 14px", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{product.description}</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={e => { e.stopPropagation(); setSelected(product) }}
                        style={{ padding: "10px 14px", borderRadius: 10, background: partner.primary_color, cursor: "pointer", fontSize: 12, color: "#fff", width: "100%", border: "none", fontWeight: 700 }}>
                        Ver detalles →
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid #EAE8E0', marginBottom: 32 }} />
        </div>
      )}

      {/* ── PRODUCT GRID ── */}
      <div style={{ padding: "2rem", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 20, maxWidth: 1280, margin: "0 auto" }}>
        {filtered.map((product) => {
          const catName = product.categories?.name || "Variedad"
          const c = cc(catName)
          const price = getFinalPrice(product)
          
          return (
            <div key={product.id}
              style={{ background: "#fff", borderRadius: 18, overflow: "hidden", cursor: "pointer", border: "1px solid #EAE8E0", transition: "transform 0.15s" }}
              onClick={() => {
                setSelected(product)
                trackEvent('ViewContent', {
                  contentName: product.name,
                  contentId: product.id,
                  contentCategory: product.categories?.name,
                  value: price,
                })
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              {/* Image placeholder */}
              <div style={{ background: c.light, aspectRatio: "1 / 1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
                {product.image_main ? (
                  <img
                    src={product.image_main}
                    alt={product.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <>
                    <div style={{ fontSize: 56 }}>{c.emoji}</div>
                    <div style={{ fontSize: 11, color: c.bg, fontWeight: 600, marginTop: 6, opacity: 0.7 }}>{product.size || "—"}</div>
                  </>
                )}
                {product.popular && (
                  <div style={{ position: "absolute", top: 12, left: 12, background: partner.secondary_color, color: "#fff", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 50 }}>⭐ POPULAR</div>
                )}
                {product.needs_operator && (
                  <div style={{ position: "absolute", top: 12, right: 12, background: partner.primary_color, color: "#fff", fontSize: 10, padding: "4px 10px", borderRadius: 50 }}>Con operador</div>
                )}
              </div>
              {/* Content */}
              <div style={{ padding: "1rem 1.1rem 1.2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{product.name}</h3>
                  <span style={{ fontSize: 16, fontWeight: 800, color: partner.primary_color, whiteSpace: "nowrap" }}>{fmt(price)}</span>
                </div>
                <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 50, background: c.light, color: c.bg, fontWeight: 600 }}>{catName}</span>
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 50, background: "#F3F2EE", color: "#777" }}>🎂 {product.min_age || "Todas"}</span>
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 50, background: "#F3F2EE", color: "#777" }}>👥 {product.capacity || "—"}</span>
                </div>
                <p style={{ fontSize: 12, color: "#999", margin: "0 0 14px", lineHeight: 1.6 }}>{product.description}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <a href={buildWhatsAppUrl(partner, product.name)} target="_blank" rel="noopener noreferrer" 
                    onClick={e => {
                      e.stopPropagation();
                      trackEvent('Contact', { contentName: product.name, contentId: product.id })
                    }}
                    style={{ flex: 1, background: partner.primary_color, color: "#fff", padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>
                    💬 Consultar
                  </a>
                  <button onClick={e => { e.stopPropagation(); setSelected(product) }}
                    style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #E5E3DC", background: "#fff", cursor: "pointer", fontSize: 12, color: "#666" }}>
                    Ver más →
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "5rem 2rem", color: "#bbb" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <p style={{ fontSize: 15 }}>No encontramos inflables con esos filtros.</p>
            <button onClick={() => { setActiveCategory("Todos"); setMaxPrice(12000); setActiveAge("Todos") }}
              style={{ marginTop: 12, padding: "10px 24px", borderRadius: 50, background: partner.primary_color, color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background: partner.primary_color, color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "1.5rem", fontSize: 12, marginTop: "2rem" }}>
        Catálogo con tecnología de <strong style={{ color: "rgba(255,255,255,0.6)" }}>Brincolines Bambinos</strong>
        <div style={{ marginTop: 12, fontSize: 10, opacity: 0.8 }}>
          Sitio web creado por <a href="https://bipbopdev.com" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "underline" }}>BipBopDev</a>
        </div>
      </div>

      {/* ── DETAIL PANEL ── */}
      {selected && (() => {
        const p = selected
        const catName = p.categories?.name || "Variedad"
        const c = cc(catName)
        const price = getFinalPrice(p)
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex" }}>
            <div onClick={() => setSelected(null)} style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} />
            <div style={{ width: 460, background: "#fff", overflowY: "auto", display: "flex", flexDirection: "column", animation: "slideIn 0.2s ease" }}>
              <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

              {/* Panel hero */}
              <div style={{ background: c.light, padding: "2rem 1.5rem 1.5rem", position: "relative" }}>
                <button onClick={() => setSelected(null)}
                  style={{ position: "absolute", top: 16, right: 16, background: "rgba(0,0,0,0.1)", border: "none", borderRadius: 50, width: 34, height: 34, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>✕</button>
                
                {p.image_main ? (
                  <div style={{ width: "100%", height: 220, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
                    <img src={p.image_main} alt={p.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 12 }} />
                  </div>
                ) : (
                  <div style={{ fontSize: 64, marginBottom: 14 }}>{c.emoji}</div>
                )}

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 50, background: c.bg, color: "#fff", fontWeight: 600 }}>{catName}</span>
                  {p.popular && <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 50, background: partner.secondary_color, color: "#fff", fontWeight: 600 }}>⭐ Popular</span>}
                  {p.needs_operator && <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 50, background: partner.primary_color, color: "#fff" }}>Con operador</span>}
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px", lineHeight: 1.2 }}>{p.name}</h2>
                <div style={{ fontSize: 28, fontWeight: 800, color: partner.primary_color }}>{fmt(price)}</div>
              </div>

              {/* Description + specs */}
              <div style={{ padding: "1.5rem", flex: 1 }}>
                <p style={{ fontSize: 14, color: "#555", lineHeight: 1.75, marginBottom: 20 }}>{p.description_extended || p.description}</p>

                <div style={{ background: "#F8F7F3", borderRadius: 14, padding: "1.1rem 1.2rem", marginBottom: 24 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: "#aaa", textTransform: "uppercase", marginBottom: 14 }}>Especificaciones</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {[
                      ["📐 Tamaño", p.size || "—"],
                      ["👥 Capacidad", p.capacity || "—"],
                      ["🎂 Edad mínima", p.min_age || "Todas"],
                      ["👷 Operador", p.needs_operator ? "Incluido" : "No requiere"],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <a href={buildWhatsAppUrl(partner, p.name)} target="_blank" rel="noopener noreferrer" 
                   onClick={() => trackEvent('Contact', { contentName: p.name, contentId: p.id })}
                   style={{
                  display: "block", background: partner.primary_color, color: "#fff",
                  padding: "15px", borderRadius: 14, textAlign: "center",
                  fontWeight: 700, fontSize: 15, textDecoration: "none", marginBottom: 10
                }}>💬 Consultar disponibilidad</a>
                <p style={{ fontSize: 11, color: "#ccc", textAlign: "center", margin: 0 }}>Se abrirá WhatsApp con un mensaje pre-llenado</p>
              </div>

              {/* Recommended */}
              {recommended.length > 0 && (
                <div style={{ padding: "0 1.5rem 2rem" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: "#aaa", textTransform: "uppercase", marginBottom: 14 }}>También te puede interesar</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {recommended.map(r => {
                      const rc = cc(r.categories?.name || "Variedad")
                      return (
                        <div key={r.id} onClick={() => setSelected(r)}
                          style={{ display: "flex", gap: 12, padding: "12px 14px", background: "#F8F7F3", borderRadius: 14, cursor: "pointer", alignItems: "center" }}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: rc.light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0, overflow: "hidden" }}>
                            {r.image_main ? (
                              <img src={r.image_main} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              rc.emoji
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                            <div style={{ fontSize: 12, color: partner.primary_color, fontWeight: 700, marginTop: 2 }}>{fmt(getFinalPrice(r))}</div>
                          </div>
                          <span style={{ color: "#ccc", fontSize: 20 }}>›</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
