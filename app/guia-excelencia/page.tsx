import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Guía de Excelencia · Brincolines Bambinos Partners',
  description: 'Únete a la Guía de Proveedores de Excelencia de Brincolines Bambinos. Solo para negocios con los más altos estándares de servicio.',
  openGraph: {
    title: 'Guía de Proveedores de Excelencia · Brincolines Bambinos',
    description: 'Solo los mejores proveedores. Exposición a 30–50 clientes potenciales diarios de Brincolines Bambinos.',
    url: 'https://www.rentaunbrincolin.com/guia-excelencia',
    images: [
      {
        url: 'https://www.rentaunbrincolin.com/og-guia.png',
        width: 1080,
        height: 1080,
        alt: 'Guía de Proveedores de Excelencia · Brincolines Bambinos',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://www.rentaunbrincolin.com/og-guia.png'],
  },
}

// ─── Criterios de excelencia ──────────────────────────────────────────────────

const CRITERIOS = [
  {
    numero: '01',
    titulo: 'Estándares de servicio',
    desc: 'Respuesta rápida, trato profesional y cumplimiento puntual en cada evento.',
  },
  {
    numero: '02',
    titulo: 'Calidad del producto o servicio',
    desc: 'Equipo en óptimas condiciones, presentación impecable y entregables de primer nivel.',
  },
  {
    numero: '03',
    titulo: 'Experiencia del cliente',
    desc: 'Reseñas positivas, cero quejas sin resolver y clientes que regresan.',
  },
  {
    numero: '04',
    titulo: 'Alineación de valores',
    desc: 'Compromiso con la seguridad, honestidad y excelencia como pilares del negocio.',
  },
]

// ─── Beneficios ───────────────────────────────────────────────────────────────

const BENEFICIOS = [
  {
    icono: '👥',
    titulo: 'Exposición directa',
    desc: 'Entre 30 y 50 clientes potenciales diarios de Brincolines Bambinos podrán conocer tu negocio.',
  },
  {
    icono: '⭐',
    titulo: 'Credibilidad inmediata',
    desc: 'Formar parte de la guía es un sello de calidad reconocido en el mercado de eventos.',
  },
  {
    icono: '🔄',
    titulo: 'Revisión constante',
    desc: 'La guía se actualiza periódicamente — solo permanecen quienes mantienen la excelencia.',
  },
  {
    icono: '💸',
    titulo: 'Sin costo',
    desc: 'Tu participación es completamente gratuita. Solo buscamos que mantengas los estándares.',
  },
]

// ─── Rotación de WhatsApp ────────────────────────────────────────────────────

const WA_PHONES = ['523318033172', '523320781405', '523323484073']

function getGuiaWaUrl() {
  const idx = new Date().getDate() % WA_PHONES.length
  const phone = WA_PHONES[idx]
  return `https://wa.me/${phone}?text=${encodeURIComponent('Hola, me interesa ser parte de la Guía de Proveedores de Excelencia de Brincolines Bambinos.')}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GuiaExcelenciaPage() {
  const waUrl = getGuiaWaUrl()
  return (
    <main style={{
      background: 'linear-gradient(to bottom, #0a0a12 0%, #0f0f1e 100%)',
      minHeight: '100vh',
      color: 'white',
      fontFamily: "'DM Sans', sans-serif",
    }}>

      {/* ── Navbar mínimo ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,18,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width: 32, height: 32,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem',
          }}>🎪</div>
          <span style={{ fontWeight: 700, color: 'white', fontSize: '0.9375rem' }}>Brincolines Bambinos</span>
        </Link>
        <Link
          href="/admin"
          style={{
            fontSize: '0.8125rem', fontWeight: 600,
            color: 'rgba(255,255,255,0.5)',
            textDecoration: 'none',
          }}
        >
          Acceso socios →
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        padding: 'clamp(4rem, 9vw, 7rem) clamp(1.25rem, 5vw, 4rem) clamp(3rem, 7vw, 5rem)',
        maxWidth: 900,
        margin: '0 auto',
        textAlign: 'center',
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          background: 'rgba(236,206,12,0.12)',
          border: '1px solid rgba(236,206,12,0.3)',
          borderRadius: '999px',
          padding: '0.375rem 1.125rem',
          fontSize: '0.7rem', fontWeight: 800,
          color: '#ECCE0C',
          textTransform: 'uppercase', letterSpacing: '0.12em',
          marginBottom: '2rem',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ECCE0C', display: 'inline-block' }} />
          Invitación exclusiva · Solo proveedores seleccionados
        </div>

        <h1 style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 'clamp(2.25rem, 6vw, 4rem)',
          fontWeight: 900,
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          marginBottom: '1.5rem',
          background: 'linear-gradient(135deg, #ffffff 40%, #ECCE0C 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Guía de Proveedores<br />de Excelencia
        </h1>

        <p style={{
          fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
          color: 'rgba(255,255,255,0.6)',
          lineHeight: 1.7,
          maxWidth: 640,
          margin: '0 auto 2.5rem',
        }}>
          Este año estamos en búsqueda de la excelencia. No solo queremos ser los más grandes del mercado —
          queremos cubrir nuestros eventos con un servicio <strong style={{ color: 'white' }}>verdaderamente excepcional</strong>,
          y queremos que tú y tu equipo sean parte de esta meta.
        </p>

        <a
          href="#inscribirse"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'linear-gradient(135deg, #ECCE0C, #b8960a)',
            color: '#000',
            padding: '0.9375rem 2.25rem',
            borderRadius: '14px',
            fontWeight: 900,
            fontSize: '0.9375rem',
            textDecoration: 'none',
            letterSpacing: '0.02em',
            boxShadow: '0 4px 24px rgba(236,206,12,0.3)',
          }}
        >
          Quiero ser parte →
        </a>
      </section>

      {/* ── Concepto: la guía ── */}
      <section style={{
        background: 'rgba(255,255,255,0.02)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: 'clamp(3rem, 7vw, 5rem) clamp(1.25rem, 5vw, 4rem)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* Comparación con referentes */}
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', marginBottom: '0.75rem' }}>
              El estándar que buscamos
            </p>
            <h2 style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              fontWeight: 900, color: 'white',
              letterSpacing: '-0.025em', lineHeight: 1.1,
            }}>
              Como la Guía Michelin.<br />
              <span style={{ color: '#ECCE0C' }}>Para el mundo de los eventos.</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {[
              {
                ref: '⭐ Guía Michelin',
                desc: 'Solo los restaurantes con los más altos estándares de cocina, servicio y experiencia.',
              },
              {
                ref: '💎 Diamantes AAA',
                desc: 'Solo hoteles que cumplen criterios rigurosos de calidad, limpieza y atención al huésped.',
              },
              {
                ref: '🏅 Guía Bambinos',
                desc: 'Solo proveedores que ofrecen un servicio impecable, confiable y memorable en cada evento.',
              },
            ].map(item => (
              <div key={item.ref} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '18px',
                padding: '1.5rem',
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.625rem' }}>{item.ref.split(' ')[0]}</div>
                <div style={{ fontWeight: 700, color: 'white', fontSize: '0.9375rem', marginBottom: '0.5rem' }}>{item.ref.split(' ').slice(1).join(' ')}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Por qué importa ── */}
      <section style={{ padding: 'clamp(3rem, 7vw, 5rem) clamp(1.25rem, 5vw, 4rem)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1.625rem, 3.5vw, 2.25rem)', fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>
              ¿Por qué esto importa?
            </h2>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            padding: 'clamp(1.75rem, 4vw, 3rem)',
            fontSize: 'clamp(0.9375rem, 2vw, 1.0625rem)',
            lineHeight: 1.75,
            color: 'rgba(255,255,255,0.7)',
          }}>
            <p style={{ marginBottom: '1.25rem' }}>
              Durante este año nos hemos enfocado en mejorar nuestros procesos internos y brindar una atención de calidad.
              Pero <strong style={{ color: 'white' }}>este camino no se puede recorrer solos</strong>.
            </p>
            <p style={{ marginBottom: '1.25rem' }}>
              No podemos buscar la excelencia en solo un área de la fiesta. Necesitamos cubrirla en <em>cada área</em>,
              apoyados de tu equipo y tú.
            </p>
            <p style={{ marginBottom: 0 }}>
              Esta guía estará dirigida a personas que buscan una fiesta de calidad, será actualizada constantemente,
              y te ayudará a darte <strong style={{ color: '#ECCE0C' }}>credibilidad y confianza en el ramo</strong>.
              En Brincolines Bambinos conseguimos entre{' '}
              <strong style={{ color: 'white' }}>30 y 50 clientes potenciales diarios</strong> interesados en reservar
              eventos — hay un amplio margen de personas posiblemente interesadas en tus servicios.
            </p>
          </div>
        </div>
      </section>

      {/* ── Beneficios ── */}
      <section style={{
        background: 'rgba(255,255,255,0.02)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: 'clamp(3rem, 7vw, 5rem) clamp(1.25rem, 5vw, 4rem)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1.625rem, 3.5vw, 2.25rem)', fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>
              Beneficios de estar en la guía
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.125rem' }}>
            {BENEFICIOS.map(b => (
              <div key={b.titulo} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '18px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}>
                <span style={{ fontSize: '1.875rem' }}>{b.icono}</span>
                <div>
                  <div style={{ fontWeight: 700, color: 'white', fontSize: '0.9375rem', marginBottom: '0.375rem' }}>{b.titulo}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem', lineHeight: 1.6 }}>{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Criterios ── */}
      <section style={{ padding: 'clamp(3rem, 7vw, 5rem) clamp(1.25rem, 5vw, 4rem)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#ECCE0C', marginBottom: '0.5rem' }}>
              En proceso de definición
            </p>
            <h2 style={{ fontSize: 'clamp(1.625rem, 3.5vw, 2.25rem)', fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>
              Criterios de evaluación
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9375rem', marginTop: '0.75rem', maxWidth: 500, margin: '0.75rem auto 0' }}>
              Estamos trabajando en la lista definitiva de criterios. Estos son los pilares base que evaluaremos.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {CRITERIOS.map(c => (
              <div key={c.numero} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px',
                padding: '1.375rem 1.5rem',
                display: 'flex',
                gap: '1.25rem',
                alignItems: 'flex-start',
              }}>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 900,
                  color: '#ECCE0C',
                  fontFamily: 'monospace',
                  minWidth: 28,
                  paddingTop: 2,
                }}>
                  {c.numero}
                </span>
                <div>
                  <div style={{ fontWeight: 700, color: 'white', fontSize: '0.9375rem', marginBottom: '0.25rem' }}>{c.titulo}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem', lineHeight: 1.6 }}>{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA inscripción ── */}
      <section
        id="inscribirse"
        style={{
          padding: 'clamp(3.5rem, 8vw, 6rem) clamp(1.25rem, 5vw, 4rem)',
          background: 'linear-gradient(to bottom, transparent, rgba(236,206,12,0.06))',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(236,206,12,0.1)',
            border: '1px solid rgba(236,206,12,0.25)',
            borderRadius: '999px',
            padding: '0.375rem 1.125rem',
            fontSize: '0.7rem', fontWeight: 800,
            color: '#ECCE0C',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            marginBottom: '1.5rem',
          }}>
            Solo proveedores seleccionados
          </div>

          <h2 style={{
            fontSize: 'clamp(1.875rem, 5vw, 3rem)',
            fontWeight: 900, color: 'white',
            letterSpacing: '-0.025em', lineHeight: 1.05,
            marginBottom: '1.25rem',
          }}>
            ¿Quieres ser parte<br />de los mejores?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9375rem', lineHeight: 1.65, marginBottom: '2.25rem' }}>
            Esta presentación-invitación fue enviada solo a proveedores seleccionados con los que sabemos que podemos
            trabajar. Si quieres iniciar el proceso de revisión y autorización de tu negocio, cuéntanos.
          </p>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.625rem',
              background: 'linear-gradient(135deg, #ECCE0C, #b8960a)',
              color: '#000',
              padding: '1rem 2.5rem',
              borderRadius: '14px',
              fontWeight: 900,
              fontSize: '1rem',
              textDecoration: 'none',
              letterSpacing: '0.02em',
              boxShadow: '0 4px 24px rgba(236,206,12,0.3)',
            }}
          >
            💬 Quiero iniciar el proceso
          </a>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', marginTop: '1.25rem' }}>
            Tu participación no tiene ningún costo. Solo buscamos que mantengas la excelencia.
          </p>
        </div>
      </section>

    </main>
  )
}
