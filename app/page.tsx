import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Business Partner · Brincolines Bambinos',
  description:
    'Programa de Socios Comerciales de Brincolines Bambinos. Diseñado para terrazas y organizadores de eventos. Gana comisiones del 5 al 20% en cada renta que generes.',
  openGraph: {
    title: 'Business Partner · Brincolines Bambinos',
    description: 'Súmate al programa de socios y gana comisiones en cada evento.',
  },
}

// ─── Datos ───────────────────────────────────────────────────────────────────

const COMISIONES = [
  {
    pct: '5%',
    titulo: 'Brincolines básicos',
    desc: 'En rentas de brincolines hasta $1,480',
    color: '#C49A1A',
  },
  {
    pct: '10%',
    titulo: 'Rango medio',
    desc: 'En rentas de brincolines de $1,480 a $3,000',
    color: '#B8830A',
  },
  {
    pct: '10%',
    titulo: 'Juegos mecánicos',
    desc: 'En juegos mecánicos o equipos que requieran operador',
    color: '#A06E00',
  },
  {
    pct: '20%',
    titulo: 'Rentas premium',
    desc: 'En rentas de brincolines mayores a $3,000',
    color: '#8A5C00',
    highlight: true,
  },
]

const BENEFICIOS = [
  { icon: '✅', texto: 'Equipos en perfectas condiciones' },
  { icon: '🆕', texto: 'Equipos nuevos y modernos' },
  { icon: '👷', texto: 'Personal calificado para instalación en tus eventos' },
  { icon: '🎪', texto: 'Gran variedad de modelos para cada tipo de evento' },
]

const CATEGORIAS = [
  { nombre: 'Clásicos',    emoji: '🏰' },
  { nombre: 'Interactivo', emoji: '⭐' },
  { nombre: 'Princesas',   emoji: '👑' },
  { nombre: 'Acuáticos',   emoji: '💧' },
  { nombre: 'Mecánicos',   emoji: '⚙️' },
  { nombre: 'Destreza',    emoji: '⚡' },
  { nombre: 'Varios',      emoji: '🎨' },
  { nombre: 'Personajes',  emoji: '🦸' },
]

const PASOS = [
  { num: '01', titulo: 'Regístrate como socio',  desc: 'Llena el formulario de contacto o escríbenos por WhatsApp. Sin costo de inscripción.' },
  { num: '02', titulo: 'Elige los juegos',        desc: 'Accede a nuestro catálogo completo con +100 modelos y precios de socio.' },
  { num: '03', titulo: 'Refiere la renta',        desc: 'Cuando tu cliente renta con Bambinos a través de ti, nosotros lo gestionamos todo.' },
  { num: '04', titulo: 'Cobra tu comisión',       desc: 'Recibes tu comisión puntual, sin complicaciones, en cada renta cerrada.' },
]

// ─── Componente ──────────────────────────────────────────────────────────────

export default function HomePage() {
  const WA_NUMBER = '523318033172'
  const WA_MSG = encodeURIComponent('Hola, me interesa el programa Business Partner de Brincolines Bambinos. ¿Me pueden dar más información?')
  const waUrl = `https://wa.me/${WA_NUMBER}?text=${WA_MSG}`

  return (
    <main style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: '#FFFDF0', color: '#2A1A00', minHeight: '100vh' }}>

      {/* ── Navbar mínimo ─────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,253,240,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(196,154,26,0.2)',
        padding: '0 clamp(1.25rem, 5vw, 4rem)',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link href="https://www.brincolinesbambinos.com" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <span style={{ fontWeight: 900, fontSize: '1.125rem', color: '#2A1A00', letterSpacing: '-0.02em' }}>
            Brincolines Bambinos
          </span>
          <span style={{
            background: '#C49A1A',
            color: 'white',
            fontSize: '0.6rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '2px 7px',
            borderRadius: '999px',
          }}>
            Partners
          </span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            href="/admin"
            style={{
              color: '#8A5C00',
              fontSize: '0.8125rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Acceso socios
          </Link>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#C49A1A',
              color: 'white',
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Quiero ser socio →
          </a>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(160deg, #2A1A00 0%, #4A2F00 100%)',
        padding: 'clamp(4rem, 10vw, 8rem) clamp(1.25rem, 5vw, 4rem)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Textura */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(196,154,26,0.15) 0%, transparent 60%),
                            radial-gradient(circle at 80% 20%, rgba(196,154,26,0.1) 0%, transparent 50%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative' }}>
          {/* Eyebrow */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(196,154,26,0.2)',
            border: '1px solid rgba(196,154,26,0.4)',
            borderRadius: '999px',
            padding: '0.35rem 1rem',
            fontSize: '0.7rem',
            fontWeight: 800,
            color: '#E8C000',
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
            <span style={{ color: '#E8C000' }}>Business Partner.</span>
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
            Si tienes una terraza, salón de eventos o eres organizador de fiestas, este programa es para ti. Recomienda a Bambinos y gana comisiones de hasta el <strong style={{ color: '#E8C000' }}>20%</strong> en cada renta que generes — sin inversión, sin complicaciones.
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.625rem',
                background: '#C49A1A',
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
            </a>
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
        background: '#C49A1A',
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

      {/* ── Comisiones ────────────────────────────────────── */}
      <section style={{
        padding: 'clamp(3.5rem, 7vw, 5.5rem) clamp(1.25rem, 5vw, 4rem)',
        background: '#FFFDF0',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span style={{
              display: 'inline-block',
              background: 'rgba(196,154,26,0.15)',
              color: '#8A5C00',
              fontSize: '0.7rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding: '0.3rem 0.9rem',
              borderRadius: '999px',
              marginBottom: '1rem',
              border: '1px solid rgba(196,154,26,0.3)',
            }}>
              Gana atractivas comisiones
            </span>
            <h2 style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              fontWeight: 900,
              letterSpacing: '-0.025em',
              color: '#2A1A00',
              lineHeight: 1.1,
              margin: 0,
            }}>
              Añade renta de brincolines<br />a tus servicios.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {COMISIONES.map((c) => (
              <div
                key={c.titulo}
                style={{
                  background: c.highlight ? '#2A1A00' : 'white',
                  border: c.highlight ? 'none' : '1px solid rgba(196,154,26,0.2)',
                  borderRadius: '20px',
                  padding: '1.75rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  boxShadow: c.highlight ? '0 8px 32px rgba(196,154,26,0.25)' : 'none',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {c.highlight && (
                  <div style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: '#C49A1A',
                    color: 'white',
                    fontSize: '0.6rem',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}>
                    Más rentable
                  </div>
                )}
                <div style={{
                  fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                  fontWeight: 900,
                  color: c.highlight ? '#E8C000' : c.color,
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                }}>
                  {c.pct}
                </div>
                <div style={{
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  color: c.highlight ? 'white' : '#2A1A00',
                  lineHeight: 1.2,
                }}>
                  {c.titulo}
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: c.highlight ? 'rgba(255,255,255,0.82)' : '#5A3800',
                  lineHeight: 1.5,
                }}>
                  {c.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Beneficios ────────────────────────────────────── */}
      <section style={{
        background: '#FEF8DC',
        padding: 'clamp(3rem, 6vw, 5rem) clamp(1.25rem, 5vw, 4rem)',
        borderTop: '1px solid rgba(196,154,26,0.2)',
        borderBottom: '1px solid rgba(196,154,26,0.2)',
      }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(2rem, 5vw, 4rem)', alignItems: 'center' }}>
            <div>
              <h2 style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                fontWeight: 900,
                color: '#2A1A00',
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
                    <span style={{ fontSize: '0.9375rem', color: '#4A3000', lineHeight: 1.5 }}>{b.texto}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Categorías */}
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C49A1A', marginBottom: '1rem' }}>
                Variedad de categorías
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {CATEGORIAS.map((cat) => (
                  <div
                    key={cat.nombre}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: 'white',
                      border: '1px solid rgba(196,154,26,0.3)',
                      borderRadius: '999px',
                      padding: '0.4rem 0.875rem',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: '#4A3000',
                    }}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.nombre}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ─────────────────────────────────── */}
      <section style={{
        padding: 'clamp(3.5rem, 7vw, 5.5rem) clamp(1.25rem, 5vw, 4rem)',
        background: '#FFFDF0',
      }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 900,
              color: '#2A1A00',
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
                  background: '#2A1A00',
                  color: '#E8C000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                }}>
                  {paso.num}
                </div>
                <h3 style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#2A1A00', lineHeight: 1.3 }}>
                  {paso.titulo}
                </h3>
                <p style={{ fontSize: '0.9375rem', color: '#5A3800', lineHeight: 1.6 }}>
                  {paso.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Para quién es ─────────────────────────────────── */}
      <section style={{
        background: '#2A1A00',
        padding: 'clamp(3rem, 6vw, 5rem) clamp(1.25rem, 5vw, 4rem)',
      }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
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
                Conocemos la pasión con la que haces tu trabajo y el esfuerzo que a través del tiempo ha posicionado tu negocio. Nos encantaría sumar esfuerzos contigo para seguir creciendo juntos.
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
        background: '#C49A1A',
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
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.625rem',
                background: '#2A1A00',
                color: '#E8C000',
                padding: '0.875rem 2rem',
                borderRadius: '14px',
                fontWeight: 900,
                fontSize: '1rem',
                textDecoration: 'none',
                letterSpacing: '0.02em',
              }}
            >
              💬 Escribir por WhatsApp
            </a>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.80)', fontSize: '0.875rem', marginTop: '1.25rem' }}>
            33 1803 3172 · @BrincolinesBambinos · brincolinesbambinos.com
          </p>
        </div>
      </section>

      {/* ── Footer mínimo ─────────────────────────────────── */}
      <footer style={{
        background: '#1A0D00',
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
  )
}
