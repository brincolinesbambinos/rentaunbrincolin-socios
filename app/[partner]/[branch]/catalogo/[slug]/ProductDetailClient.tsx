'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Product, Partner } from '@/types'
import { buildWhatsAppUrl } from '@/lib/whatsapp'
import { getOptimizedImageUrl } from '@/lib/image'
import {
  displayFont, INK, PAPER, MUTED, FREE_BG, TAKEN_BG, WA_BG, WA_TEXT,
  catColors, fmtPrice, longDate, shortDate, fullDims, capacityText,
} from '@/lib/catalogUi'

interface Props {
  product: Product
  partner: Partner
  similar: Product[]
  branchName: string
  /** Ruta del catálogo sin query (/socio/sucursal/catalogo) */
  catalogPath: string
  /** Query que se conserva al navegar (?sp=1&fecha=…) */
  query: string
  activeWhatsApp?: string
  hidePrice?: boolean
  branchId?: string | null
  eventDate?: string | null
}

type AvailState = 'idle' | 'loading' | 'free' | 'taken' | 'error'

export default function ProductDetailClient({ product, partner, similar, branchName, catalogPath, query, activeWhatsApp, hidePrice, branchId, eventDate }: Props) {
  const display = displayFont.style.fontFamily
  const c = catColors(product.categories?.name || 'Variedad')
  const whatsappUrl = buildWhatsAppUrl(partner, product.name, branchName, activeWhatsApp, eventDate ? longDate(eventDate) : undefined)

  // Galería: principal + extras (sin duplicados)
  const images = [product.image_main, ...(product.image_gallery ?? [])].filter((x, i, a): x is string => !!x && a.indexOf(x) === i)
  const [active, setActive] = useState(0)
  const thumbs = images.map((src, i) => ({ src, i })).filter(t => t.i !== active)

  // Disponibilidad del producto en la fecha que venía del catálogo
  const [avail, setAvail] = useState<AvailState>(branchId && eventDate ? 'loading' : 'idle')
  useEffect(() => {
    if (!branchId || !eventDate) return
    let cancelled = false
    fetch(`/api/availability?branch_id=${encodeURIComponent(branchId)}&date=${eventDate}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status))
        const rows = (await r.json()) as { product_id: string; available: boolean }[]
        const row = Array.isArray(rows) ? rows.find(x => x.product_id === product.id) : undefined
        if (!cancelled) setAvail(row?.available === false ? 'taken' : 'free')
      })
      .catch(() => { if (!cancelled) setAvail('error') })
    return () => { cancelled = true }
  }, [branchId, eventDate, product.id])

  const pill = !eventDate ? null
    : avail === 'loading' ? { text: 'Revisando…', bg: '#fff' }
    : avail === 'free' ? { text: `Libre el ${shortDate(eventDate).replace(/ \S+$/, '').toLowerCase()}`, bg: FREE_BG }
    : avail === 'taken' ? { text: `Reservado el ${shortDate(eventDate).replace(/ \S+$/, '').toLowerCase()}`, bg: TAKEN_BG }
    : avail === 'error' ? { text: shortDate(eventDate), bg: 'var(--color-secondary)' }
    : null

  const rows: { k: string; v: string }[] = []
  const dims = fullDims(product)
  if (dims) rows.push({ k: 'Medidas', v: dims })
  const cap = capacityText(product.capacity)
  if (cap) rows.push({ k: 'Participantes', v: cap })
  if (product.min_age) rows.push({ k: 'Edad', v: product.min_age })
  if (product.rental_duration) rows.push({ k: 'Duración', v: product.rental_duration })
  if (product.size) rows.push({ k: 'Tamaño', v: product.size })
  if (product.needs_operator) rows.push({ k: 'Operador', v: 'Incluido' })

  const label = [product.categories?.name, product.size].filter(Boolean).join(' · ').toUpperCase()
  const backUrl = `${catalogPath}${query}`

  return (
    <div style={{ background: 'var(--color-primary)', minHeight: '100vh', color: INK }}>
      <style>{`
        @keyframes sd-pulse { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
        .sd-wrap { max-width: 980px; margin: 0 auto; box-sizing: border-box; }
        .sd-grid { display: grid; grid-template-columns: 1fr; }
        .sd-btn:active { filter: brightness(.94); transform: translate(1px, 1px); }
        .sd-thumb:focus-visible, .sd-btn:focus-visible { outline: 3px solid ${INK}; outline-offset: 2px; }
        @media (min-width: 820px) {
          .sd-grid { grid-template-columns: 1fr 1fr; gap: 24px; padding: 8px 24px 0; }
        }
      `}</style>

      {/* ── ENCABEZADO OSCURO ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--color-primary)', color: 'var(--text-on-primary)' }}>
        <div className="sd-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 12px 14px' }}>
          <Link href={backUrl} style={{ minHeight: 44, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 14, textDecoration: 'none', color: 'inherit' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
            Catálogo
          </Link>
          {pill && (
            <span role="status" style={{ fontSize: 12, fontWeight: 800, border: `2px solid ${INK}`, borderRadius: 999, padding: '4px 10px', background: pill.bg,
              color: pill.bg === 'var(--color-secondary)' ? 'var(--text-on-secondary)' : INK, whiteSpace: 'nowrap',
              animation: avail === 'loading' ? 'sd-pulse 1.2s ease-in-out infinite' : undefined }}>
              {pill.text}
            </span>
          )}
        </div>
      </header>

      {/* ── PANEL CLARO ── */}
      <main style={{ background: PAPER, borderRadius: '24px 24px 0 0', minHeight: '80vh', paddingBottom: 120 }}>
        <div className="sd-wrap sd-grid">
          {/* Galería: principal 1:1 + 2 miniaturas */}
          <div style={{ display: 'grid', gridTemplateColumns: images.length > 1 ? '2fr 1fr' : '1fr', gap: 8, padding: 12, alignSelf: 'start' }}>
            <div style={{ gridRow: 'span 2', aspectRatio: '1 / 1', border: `2px solid ${INK}`, borderRadius: 16, background: c.light, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {images[active] ? (
                <img src={getOptimizedImageUrl(images[active], 800, 80)} alt={product.name} loading="eager" decoding="async"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: 64 }} aria-hidden="true">{c.emoji}</span>
              )}
            </div>
            {thumbs.slice(0, 2).map((t, k) => {
              const more = k === 1 && thumbs.length > 2 ? thumbs.length - 1 : 0
              return (
                <button key={t.src} type="button" className="sd-thumb" onClick={() => setActive(t.i)} aria-label={more ? `Ver ${more} fotos más` : `Ver foto ${t.i + 1}`}
                  style={{ position: 'relative', border: `2px solid ${INK}`, borderRadius: 12, background: c.light, overflow: 'hidden', padding: 0, cursor: 'pointer', minHeight: 0 }}>
                  <img src={getOptimizedImageUrl(t.src, 240, 70)} alt="" loading="lazy" decoding="async"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: more ? 0.35 : 1 }} />
                  {more > 0 && (
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: INK }}>+{more} fotos</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Ficha técnica */}
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ paddingTop: 4 }}>
              {label && <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', color: c.text }}>{label}</span>}
              <h1 style={{ margin: '2px 0 0', fontFamily: display, fontWeight: 800, fontSize: 32, lineHeight: 1 }}>{product.name}</h1>
            </div>

            {rows.length > 0 && (
              <div style={{ border: `2px solid ${INK}`, borderRadius: 16, background: '#fff', overflow: 'hidden' }}>
                {rows.map((r, i) => (
                  <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 14px', borderBottom: i < rows.length - 1 ? '1.5px solid #ECE9E1' : 'none', fontSize: 14 }}>
                    <span style={{ color: MUTED, fontWeight: 600 }}>{r.k}</span>
                    <span style={{ fontWeight: 800, textAlign: 'right' }}>{r.v}</span>
                  </div>
                ))}
              </div>
            )}

            {(product.description_extended || product.description) && (
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: '#3D3748', whiteSpace: 'pre-line' }}>
                {product.description_extended || product.description}
              </p>
            )}

            {avail === 'taken' && (
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: MUTED, background: TAKEN_BG, border: `2px solid ${INK}`, borderRadius: 12, padding: '10px 12px' }}>
                Ya está reservado para el {longDate(eventDate!)}. Escríbenos y te sugerimos uno parecido.
              </p>
            )}
          </div>
        </div>

        {/* Similares */}
        {similar.length > 0 && (
          <div className="sd-wrap" style={{ padding: '28px 16px 0' }}>
            <h2 style={{ fontFamily: display, fontWeight: 800, fontSize: 22, margin: '0 0 12px' }}>También te puede gustar</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              {similar.map(p => (
                <Link key={p.id} href={`${catalogPath}/${p.slug}${query}`}
                  style={{ border: `2px solid ${INK}`, borderRadius: 16, overflow: 'hidden', background: '#fff', textDecoration: 'none', color: INK, boxShadow: `3px 3px 0 ${INK}` }}>
                  <div style={{ aspectRatio: '1 / 1', position: 'relative', background: catColors(p.categories?.name || 'Variedad').light, borderBottom: `2px solid ${INK}` }}>
                    {p.image_main && (
                      <img src={getOptimizedImageUrl(p.image_main, 320, 70)} alt={p.name} loading="lazy" decoding="async"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
                    )}
                  </div>
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>{p.name}</div>
                    {!hidePrice && <div style={{ fontFamily: display, fontWeight: 800, fontSize: 16, marginTop: 2 }}>{fmtPrice(p.price)}</div>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── BARRA INFERIOR FIJA ── */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40, background: PAPER, borderTop: `2px solid ${INK}` }}>
        <div className="sd-wrap" style={{ display: 'flex', gap: 8, padding: '12px 16px calc(16px + env(safe-area-inset-bottom))' }}>
          {!hidePrice && (
            <span style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 6px' }}>
              <span style={{ fontSize: 11, fontWeight: 700 }}>RENTA</span>
              <span style={{ fontFamily: display, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{fmtPrice(product.price)}</span>
            </span>
          )}
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="sd-btn"
            style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, borderRadius: 14, border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`,
              background: WA_BG, color: WA_TEXT, fontWeight: 800, fontSize: 15, textDecoration: 'none' }}>
            {avail === 'taken' ? 'Preguntar por WhatsApp' : 'Apartar por WhatsApp'}
          </a>
        </div>
      </div>
    </div>
  )
}
