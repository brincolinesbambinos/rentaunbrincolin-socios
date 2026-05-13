import type { Metadata } from 'next'
import Link from 'next/link'
import { WaLink } from './components/WaLink'

export const metadata: Metadata = {
  title: 'Business Partner · Brincolines Bambinos',
  description:
    'Programa de Socios Comerciales de Brincolines Bambinos. Diseñado para terrazas y organizadores de eventos. Añade renta de brincolines a tus servicios sin inversión.',
  openGraph: {
    title: 'Business Partner · Brincolines Bambinos',
    description: 'Únete al programa de socios Brincolines Bambinos y crece con nosotros.',
    url: 'https://www.rentaunbrincolin.com',
    images: [
      {
        url: 'https://www.rentaunbrincolin.com/og-default.png',
        width: 1080,
        height: 1080,
        alt: 'Business Partner · Brincolines Bambinos',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://www.rentaunbrincolin.com/og-default.png'],
  },
}

// ─── Paleta BB ───────────────────────────────────────────────────────────────

const BB = {
  ink:    '#1a0533',
  mid:    '#2d1259',
  accent: '#7c3aed',
  light:  '#a78bfa',
  pale:   '#f3f0ff',
  xpale:  '#f8f5ff',
  footer: '#0d0019',
}

// ─── Datos ───────────────────────────────────────────────────────────────────

const BENEFICIOS = [
  { icon: '✅', texto: 'Equipos en perfectas condiciones' },
  { icon: '🆕', texto: 'Equipos nuevos y modernos' },
  { icon: '👷', texto: 'Personal calificado para instalación en tus eventos' },
  { icon: '🎪', texto: 'Gran variedad de modelos para cada tipo de evento' },
]

const CATEGORIAS = [
  { slug: 'clasico',      nombre: 'Clásicos',    main: '#B573F5', dark: '#341741' },
  { slug: 'interactivo',  nombre: 'Interactivo', main: '#ECCE0C', dark: '#4E3B06' },
  { slug: 'princesas',    nombre: 'Princesas',   main: '#FF7FAF', dark: '#501D38' },
  { slug: 'acuatico',     nombre: 'Acuáticos',   main: '#00BDEB', dark: '#0D3651' },
  { slug: 'mecanico',     nombre: 'Mecánicos',   main: '#18C85B', dark: '#053429' },
  { slug: 'destreza',     nombre: 'Destreza',    main: '#FF2C57', dark: '#5D1220' },
  { slug: 'variedad',     nombre: 'Varios',      main: '#2898F4', dark: '#12224B' },
  { slug: 'personajes',   nombre: 'Personajes',  main: '#FF9000', dark: '#723016' },
]

const PASOS = [
  { num: '01', titulo: 'Regístrate como socio',  desc: 'Llena el formulario de contacto o escríbenos por WhatsApp. Sin costo de inscripción.' },
  { num: '02', titulo: 'Elige los juegos',        desc: 'Accede a nuestro catálogo completo con +100 modelos y precios de socio.' },
  { num: '03', titulo: 'Refiere la renta',        desc: 'Cuando tu cliente renta con Bambinos a través de ti, nosotros lo gestionamos todo.' },
  { num: '04', titulo: 'Cobra tu comisión',       desc: 'Recibes tu comisión puntual, sin complicaciones, en cada renta cerrada.' },
]

// ─── Componente ──────────────────────────────────────────────────────────────

const WA_MSG = 'Hola, me interesa el programa Business Partner de Brincolines Bambinos. ¿Me pueden dar más información?'

export default function HomePage() {

  return (
    <>
    <style>{`
      .partners-nav-mid { display: flex; align-items: center; gap: 1rem; }
      @media (max-width: 680px) {
        .partners-nav-mid { display: none !important; }
      }
    `}</style>
    <main style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: BB.xpale, color: BB.ink, minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── Navbar mínimo ─────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(248,245,255,0.96)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(124,58,237,0.15)',
        padding: '0 clamp(1.25rem, 4vw, 3rem)',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}>
        <Link href="https://www.brincolinesbambinos.com" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none', flexShrink: 0, minWidth: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logo-Color.png" alt="Brincolines Bambinos" style={{ display: 'block', height: '28px', width: 'auto', maxWidth: '160px', objectFit: 'contain' }} />
          <span style={{
            background: BB.accent,
            color: 'white',
            fontSize: '0.6rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '2px 7px',
            borderRadius: '999px',
            flexShrink: 0,
          }}>
            Partners
          </span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          <div className="partners-nav-mid">
            <Link
              href="/guia-excelencia"
              style={{ color: BB.accent, fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              ⭐ Guía de Excelencia
            </Link>
            <Link
              href="/admin"
              style={{ color: BB.accent, fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              Acceso socios
            </Link>
          </div>
          <WaLink
            msg={WA_MSG}
            style={{
              background: BB.accent,
              color: 'white',
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Quiero ser socio →
          </WaLink>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section style={{
        background: `linear-gradient(160deg, ${BB.ink} 0%, ${BB.mid} 100%)`,
        padding: 'clamp(4rem, 10vw, 8rem) clamp(1.25rem, 5vw, 4rem)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(124,58,237,0.2) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(124,58,237,0.12) 0%, transparent 50%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(124,58,237,0.2)',
            border: '1px solid rgba(124,58,237,0.4)',
            borderRadius: '999px',
            padding: '0.35rem 1rem',
            fontSize: '0.7rem',
            fontWeight: 800,
            color: BB.light,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: '1.75rem',
          }}>
            Programa de Socios Comerciales · Brincolines Bambinos
          </div>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 7vw, 5rem)',
            fontWeight: 900,
            color: 'white',
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            marginBottom: '1.25rem',
          }}>
            <span style={{ color: BB.light }}>Business Partner.</span>
            <br />
            Haz dinero con cada evento que organizas.
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
            color: 'rgba(255,255,255,0.87)',
            lineHeight: 1.7,
            maxWidth: 620,
            marginBottom: '2.5rem',
          }}>
            Si tienes una terraza, salón de eventos o eres organizador de fiestas, este programa es para ti.
            Recomienda a Bambinos y empieza a ganar comisiones — sin inversión, sin complicaciones.
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <WaLink
              msg={WA_MSG}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.625rem',
                background: BB.accent,
                color: 'white',
                padding: '0.875rem 1.75rem',
                borderRadius: '14px',
                fontWeight: 800,
                fontSize: '1rem',
                textDecoration: 'none',
                letterSpacing: '0.02em',
              }}
            >
              💬 Quiero ser socio
            </WaLink>
            <a
              href="https://www.brincolinesbambinos.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.87)',
                padding: '0.875rem 1.75rem',
                borderRadius: '14px',
                fontWeight: 600,
                fontSize: '1rem',
                textDecoration: 'none',
              }}
            >
              Ver catálogo de juegos
            </a>
          </div>
        </div>
      </section>

      {/* ── Tagline ───────────────────────────────────────── */}
      <section style={{
        background: BB.accent,
        padding: '1rem clamp(1.25rem, 5vw, 4rem)',
        textAlign: 'center',
      }}>
        <p style={{
          fontSize: 'clamp(0.8125rem, 2vw, 1rem)',
          fontWeight: 800,
          color: 'white',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          margin: 0,
        }}>
          Creando Grandes Negocios
        </p>
      </section>

      {/* ── Beneficios ────────────────────────────────────── */}
      <section style={{
        background: BB.pale,
        padding: 'clamp(3rem, 6vw, 5rem) clamp(1.25rem, 5vw, 4rem)',
        borderTop: '1px solid rgba(124,58,237,0.12)',
        borderBottom: '1px solid rgba(124,58,237,0.12)',
      }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(2rem, 5vw, 4rem)', alignItems: 'center' }}>
            <div>
              <h2 style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                fontWeight: 900,
                color: BB.ink,
                letterSpacing: '-0.025em',
                lineHeight: 1.1,
                marginBottom: '1.5rem',
              }}>
                Te ofrecemos lo mejor para que tú ofrezcas lo mejor.
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {BENEFICIOS.map((b) => (
                  <div key={b.texto} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.125rem', flexShrink: 0, marginTop: 1 }}>{b.icon}</span>
                    <span style={{ fontSize: '0.9375rem', color: '#3b1a6b', lineHeight: 1.5 }}>{b.texto}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: BB.accent, marginBottom: '1rem' }}>
                Variedad de categorías
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {CATEGORIAS.map((cat) => (
                  <span
                    key={cat.slug}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 16px',
                      borderRadius: '999px',
                      backgroundColor: cat.dark,
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                      lineHeight: 1,
                    }}
                  >
                    <span style={{
                      width: 18, height: 18, display: 'inline-block',
                      backgroundColor: cat.main,
                      WebkitMaskImage: `url(/icons/categorias/${cat.slug === 'variedad' ? 'variedad' : cat.slug}.svg)`,
                      maskImage: `url(/icons/categorias/${cat.slug === 'variedad' ? 'variedad' : cat.slug}.svg)`,
                      WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
                      WebkitMaskSize: 'contain', maskSize: 'contain',
                      flexShrink: 0,
                    }} />
                    {cat.nombre}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ─────────────────────────────────── */}
      <section style={{
        padding: 'clamp(3.5rem, 7vw, 5.5rem) clamp(1.25rem, 5vw, 4rem)',
        background: BB.xpale,
      }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 900,
              color: BB.ink,
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
            }}>
              Así de sencillo.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem' }}>
            {PASOS.map((paso) => (
              <div key={paso.num} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '14px',
                  background: BB.ink,
                  color: BB.light,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                }}>
                  {paso.num}
                </div>
                <h3 style={{ fontWeight: 800, fontSize: '0.9375rem', color: BB.ink, lineHeight: 1.3 }}>
                  {paso.titulo}
                </h3>
                <p style={{ fontSize: '0.9375rem', color: '#3b1a6b', lineHeight: 1.6 }}>
                  {paso.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Para quién es ─────────────────────────────────── */}
      <section style={{
        background: BB.ink,
        padding: 'clamp(3rem, 6vw, 5rem) clamp(1.25rem, 5vw, 4rem)',
      }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', alignItems: 'start' }}>
            <div>
              <h2 style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                fontWeight: 900,
                color: 'white',
                letterSpacing: '-0.025em',
                lineHeight: 1.1,
                marginBottom: '1rem',
              }}>
                #EresBambinos si tienes una terraza, salón o haces eventos.
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.87)', fontSize: '1rem', lineHeight: 1.7 }}>
                Conocemos la pasión con la que haces tu trabajo y el esfuerzo que a través del tiempo ha posicionado tu negocio.
                Nos encantaría sumar esfuerzos contigo para seguir creciendo juntos.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { emoji: '🏟️', label: 'Terrazas para eventos' },
                { emoji: '🎪', label: 'Salones de fiestas' },
                { emoji: '📋', label: 'Organizadores de eventos' },
                { emoji: '🎂', label: 'Planificadores de cumpleaños' },
                { emoji: '🏢', label: 'Empresas de entretenimiento' },
              ].map(item => (
                <div key={item.label} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.875rem',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                }}>
                  <span style={{ fontSize: '1.25rem' }}>{item.emoji}</span>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'rgba(255,255,255,0.87)' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Final ─────────────────────────────────────── */}
      <section style={{
        background: BB.accent,
        padding: 'clamp(3.5rem, 7vw, 5.5rem) clamp(1.25rem, 5vw, 4rem)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 900,
            color: 'white',
            letterSpacing: '-0.025em',
            lineHeight: 1.1,
            marginBottom: '1rem',
          }}>
            Creando grandes negocios juntos.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.87)', fontSize: '1.0625rem', lineHeight: 1.65, marginBottom: '2rem' }}>
            Sin costo de registro. Sin inventario. Solo tu red de contactos y nuestra operación. Escríbenos hoy y te explicamos todo.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <WaLink
              msg={WA_MSG}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.625rem',
                background: BB.ink,
                color: BB.light,
                padding: '0.875rem 2rem',
                borderRadius: '14px',
                fontWeight: 900,
                fontSize: '1rem',
                textDecoration: 'none',
                letterSpacing: '0.02em',
              }}
            >
              💬 Escribir por WhatsApp
            </WaLink>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.80)', fontSize: '0.875rem', marginTop: '1.25rem' }}>
            33 1803 3172 · @BrincolinesBambinos · brincolinesbambinos.com
          </p>
        </div>
      </section>

      {/* ── Footer mínimo ─────────────────────────────────── */}
      <footer style={{
        background: BB.footer,
        padding: '1.5rem clamp(1.25rem, 5vw, 4rem)',
        textAlign: 'center',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.60)', fontSize: '0.8125rem', margin: 0 }}>
          © {new Date().getFullYear()} Brincolines Bambinos · Programa Business Partner ·{' '}
          <Link href="/admin" style={{ color: 'rgba(255,255,255,0.70)' }}>
            Acceso socios
          </Link>
        </p>
      </footer>

    </main>
    </>
  )
}
