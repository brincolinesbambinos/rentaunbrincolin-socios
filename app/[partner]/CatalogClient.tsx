"use client"

import { useState, useMemo } from "react"
import { Partner, Product } from "@/types"
import { buildWhatsAppUrl } from "@/lib/whatsapp"
import { useRouter } from "next/navigation"

import PartnerPixel from "@/components/PartnerPixel"
import PartnerGTM from "@/components/PartnerGTM"

interface Props {
  partner: Partner
  products: Product[]
  featured?: Product[]
  pixelId: string | null
  branchName?: string | null
  branchSlug?: string | null
  activeSlug?: string | null
}

const CATEGORIES = ["Todos", "Acuático", "Clásico", "Destreza", "Interactivo", "Mecánico", "Personajes", "Princesas", "Variedad"]
const STAGES = ["Todas", "Infantes", "Niños", "Adolescentes", "Adultos"]
const SIZES = ["Todas", "Chico", "Mediano", "Grande", "Mega"]

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

export default function CatalogClient({ partner, products, featured = [], pixelId, branchName, branchSlug, activeSlug }: Props) {
  const router = useRouter()
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Find the WhatsApp number associated with the active slug
  const activeWhatsApp = useMemo(() => {
    if (!activeSlug || !partner.links) return partner.whatsapp
    const link = partner.links.find(l => l.slug.toLowerCase() === activeSlug.toLowerCase())
    return link ? link.whatsapp : partner.whatsapp
  }, [activeSlug, partner.links, partner.whatsapp])

  
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

  const isFilterActive = activeCategory !== "Todos" || maxPrice < 12000 || activeStage !== "Todas" || activeSize !== "Todas" || searchTerm !== ""

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

  const cc = (catName: string): { bg: string; light: string; emoji: string } => {
    return CAT_COLORS[catName] || { bg: "#6B7280", light: "#F3F4F6", emoji: "🎪" }
  }

  const handleProductClick = (product: Product) => {
    trackEvent('ViewContent', { 
      contentName: product.name, 
      contentId: product.id, 
      value: getFinalPrice(product) 
    })
    
    const baseUrl = activeSlug && activeSlug.toLowerCase() !== partner.slug.toLowerCase() 
      ? `/${partner.slug}/${activeSlug}` 
      : `/${partner.slug}`

    if (branchSlug) {
      router.push(`${baseUrl}/${branchSlug}/catalogo/${product.slug}`)
    } else {
      // Global fallback if no branch
      router.push(`${baseUrl}/catalogo/${product.slug}`)
    }
  }

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif", background: "#F8F7F3", minHeight: "100vh", color: "#1A1A2E" }}>
      <PartnerPixel pixelId={pixelId} />
      <PartnerGTM gtmId={null} /> {/* GTM is now in branch layout */}

      {/* ── HEADER ── */}
      <div style={{ 
        display: "flex", alignItems: "center", justifyContent: "space-between", 
        padding: "0.8rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.08)",
        position: "sticky", top: 0, zIndex: 110, background: 'var(--color-primary)',
        color: 'var(--text-on-primary)',
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
      }}>
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
        <a href={`https://wa.me/${activeWhatsApp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
           onClick={() => trackEvent('Lead')}
          style={{ background: 'var(--color-secondary)', color: 'var(--text-on-secondary)', padding: "10px 20px", borderRadius: 50, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          💬 Contacto directo
        </a>
      </div>

      {/* Hero */}
      <div style={{ background: 'var(--color-primary)', color: 'var(--text-on-primary)', textAlign: "center", padding: "3rem 2rem 3.5rem" }}>
        <div style={{ fontSize: 11, letterSpacing: 3, opacity: 0.4, textTransform: "uppercase", marginBottom: 14 }}>Catálogo de inflables</div>
        <h1 style={{ fontSize: 44, fontWeight: 800, margin: "0 0 12px", lineHeight: 1.1 }}>Nuestros Inflables</h1>
        <p style={{ fontSize: 16, opacity: 0.6, margin: 0, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
          Encuentra el inflable perfecto para tu próximo evento en {branchName || 'nuestras sucursales'}
        </p>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ── FILTERS ── */}
      <div style={{ 
        background: "#fff", borderBottom: "1.5px solid #EAE8E0", 
        padding: "1.25rem 2rem", position: "sticky", top: 61, zIndex: 100 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 500 }}>
            <input 
              type="text" 
              placeholder="Buscar por nombre o descripción..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px 12px 42px', borderRadius: 14,
                border: '1.5px solid #E5E3DC', fontSize: 14, outline: 'none',
                background: '#F9F8F4', transition: 'all 0.2s'
              }}
            />
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, opacity: 0.4 }}>🔍</span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {isFilterActive && (
              <button
                onClick={() => {
                  setActiveCategory("Todos"); setMaxPrice(12000); setActiveStage("Todas"); setActiveSize("Todas"); setSearchTerm("")
                }}
                style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: '#FFF1F1', color: '#FF4444', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}
              >
                Limpiar todo
              </button>
            )}
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              style={{
                padding: '10px 20px', borderRadius: 12, border: '1.5px solid #E5E3DC',
                background: filtersOpen ? partner.primary_color : '#fff',
                color: filtersOpen ? '#fff' : '#666',
                fontSize: 13, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              {filtersOpen ? '✕ Ocultar' : '⚙️ Más Filtros'}
            </button>
          </div>
        </div>

        <div style={{ 
          display: "flex", gap: 8, overflowX: "auto", padding: "4px 0 12px"
        }} className="hide-scrollbar">
          {CATEGORIES.map(cat => {
            const colors = cc(cat)
            const isActive = activeCategory === cat
            return (
              <button 
                key={cat} 
                onClick={() => setActiveCategory(cat)} 
                style={{
                  padding: "10px 20px", borderRadius: 16, border: "none",
                  background: isActive ? colors.bg : colors.light,
                  color: isActive ? "#fff" : colors.bg,
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                  whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 8,
                  transition: "all 0.2s",
                  boxShadow: isActive ? `0 4px 12px ${colors.bg}44` : "none",
                  transform: isActive ? "scale(1.05)" : "scale(1)"
                }}
              >
                <span style={{ fontSize: 18 }}>{colors.emoji}</span>
                {cat}
              </button>
            )
          })}
        </div>

        {filtersOpen && (
          <div style={{ 
            marginTop: 20, paddingTop: 20, borderTop: '1px dashed #E5E3DC',
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 24
          }}>
            <div>
              <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, fontWeight: 700 }}>Precio Máximo</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input type="range" min={3000} max={12000} step={500} value={maxPrice}
                  onChange={e => setMaxPrice(Number(e.target.value))}
                  style={{ flex: 1, accentColor: partner.primary_color }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: partner.primary_color, minWidth: 70 }}>{fmt(maxPrice)}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, fontWeight: 700 }}>Etapa / Edad</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {STAGES.map(stage => (
                  <button key={stage} onClick={() => setActiveStage(stage)} style={{
                    padding: "6px 14px", borderRadius: 10, border: "1.5px solid",
                    borderColor: activeStage === stage ? partner.secondary_color : "#E5E3DC",
                    background: activeStage === stage ? "#FFF5F2" : "#fff",
                    color: activeStage === stage ? partner.secondary_color : "#888",
                    fontSize: 12, cursor: "pointer", fontWeight: 700, transition: "all 0.2s"
                  }}>{stage}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── PRODUCT GRID ── */}
      <div style={{ padding: "2rem", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 20, maxWidth: 1280, margin: "0 auto" }}>
        {filtered.map((product) => {
          const catName = product.categories?.name || "Variedad"
          const c = cc(catName)
          const price = getFinalPrice(product)
          
          return (
            <div key={product.id}
              style={{ background: "#fff", borderRadius: 18, overflow: "hidden", cursor: "pointer", border: "1px solid #EAE8E0", transition: "transform 0.15s" }}
              onClick={() => handleProductClick(product)}
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
                {product.popular && <div style={{ position: "absolute", top: 12, left: 12, background: 'var(--color-secondary)', color: 'var(--text-on-secondary)', fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 50 }}>⭐ POPULAR</div>}
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
                  <a href={buildWhatsAppUrl(partner, product.name, branchName || undefined, activeWhatsApp)} target="_blank" rel="noopener noreferrer" 
                    onClick={e => {
                      e.stopPropagation();
                      trackEvent('Contact', { contentName: product.name, contentId: product.id })
                    }}
                    style={{ flex: 1, background: 'var(--color-primary)', color: 'var(--text-on-primary)', padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>
                    💬 Consultar
                  </a>
                  <button onClick={e => { e.stopPropagation(); handleProductClick(product) }}
                    style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #E5E3DC", background: "#fff", cursor: "pointer", fontSize: 12, color: "#666" }}>
                    Ver más →
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background: 'var(--color-primary)', color: 'var(--text-on-primary)', textAlign: "center", padding: "1.5rem", fontSize: 12, marginTop: "2rem", opacity: 0.8 }}>
        Catálogo con tecnología de <strong style={{ color: 'inherit' }}>Brincolines Bambinos</strong>
      </div>
    </div>
  )
}
