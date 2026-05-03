import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Renta un Brincolin | Catálogos para salones de eventos',
  description: 'Ofrece brincolines en tu salón de eventos sin invertir en equipo. Obtén tu catálogo digital y recibe comisiones.',
}

const WHATSAPP_URL = "https://wa.me/523318033172?text=" + encodeURIComponent(
  "Hola, me interesa ofrecer brincolines en mi salón de eventos. ¿Me pueden dar información?"
)

export default function LandingPage() {
  const exampleProducts = [
    { title: 'Toro Mecánico Pro', price: '$8,500', emoji: '🤠', bg: '#F97316', light: '#FEF3C7', category: 'Mecánico', size: 'Adultos y niños' },
    { title: 'Peaches Play House', price: '$6,200', emoji: '👑', bg: '#EC4899', light: '#FCE7F3', category: 'Princesas', size: 'Hasta 15 niños' },
    { title: 'Acuaslide Tsunami', price: '$12,000', emoji: '🌊', bg: '#0EA5E9', light: '#E0F2FE', category: 'Acuático', size: 'Uso con agua' },
  ]

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: "#F8F7F3", minHeight: "100vh", color: "#1A1A2E" }}>
      
      {/* 1. HERO */}
      <section style={{ background: '#1A1A2E', color: '#fff', padding: '6rem 2rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: 24, letterSpacing: '-0.02em' }}>
            Ofrece brincolines en tu salón.<br />
            <span style={{ color: '#E8623A' }}>Sin invertir en equipo.</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', opacity: 0.8, lineHeight: 1.6, marginBottom: 40, maxWidth: 600, margin: '0 auto 40px' }}>
            Tus clientes eligen el inflable directo desde tu catálogo digital.<br/>
            Tú cobras una comisión. Nosotros instalamos y operamos.
          </p>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: '#E8623A', color: '#fff', padding: '16px 32px',
            borderRadius: 50, fontSize: 16, fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 8px 24px rgba(232, 98, 58, 0.3)', transition: 'transform 0.2s'
          }}>
            💬 Quiero ser socio →
          </a>
        </div>
      </section>

      {/* 2. CÓMO FUNCIONA */}
      <section style={{ padding: '5rem 2rem', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: '#1A1A2E' }}>¿Cómo funciona?</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
          {[
            { step: '1', title: 'Te registramos', desc: 'Creamos tu catálogo digital personalizado con tu logo y colores. Tu URL: rentaunbrincolin.com/tusalon' },
            { step: '2', title: 'Tus clientes eligen', desc: 'Comparte el link con tus clientes. Ellos ven el catálogo y consultan disponibilidad directo por WhatsApp.' },
            { step: '3', title: 'Tú ganas sin moverte', desc: 'Nosotros instalamos y operamos. Tú recibes tu comisión por cada renta cerrada desde tu catálogo.' }
          ].map((item) => (
            <div key={item.step} style={{ background: '#fff', padding: '2rem', borderRadius: 18, border: '1px solid #EAE8E0', position: 'relative' }}>
              <div style={{ width: 48, height: 48, background: '#E8623A', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, marginBottom: 20 }}>
                {item.step}
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{item.title}</h3>
              <p style={{ fontSize: 15, color: '#666', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. BENEFICIOS */}
      <section style={{ background: '#1A1A2E', color: '#fff', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 32, fontWeight: 800 }}>Beneficios para tu salón</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {[
              { title: 'Sin inversión inicial', desc: 'No compras ni almacenas nada. Solo compartes tu link.' },
              { title: 'Catálogo siempre actualizado', desc: 'Más de 300 inflables disponibles. Siempre juegos nuevos.' },
              { title: 'Instalación y operación incluida', desc: 'Nuestro equipo se encarga de todo el día del evento.' },
              { title: 'Comisión por cada renta', desc: 'Genera ingresos extra sin esfuerzo adicional para tu equipo.' }
            ].map((b, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: 18, border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ color: '#E8623A', fontSize: 24, marginBottom: 16 }}>✓</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{b.title}</h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. PREVIEW DEL CATÁLOGO */}
      <section style={{ padding: '5rem 2rem', background: '#F8F7F3', textAlign: 'center' }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, color: '#1A1A2E' }}>Así ve tu cliente el catálogo</h2>
        <p style={{ fontSize: 16, color: '#666', marginBottom: 48 }}>Un escaparate digital con tu propia marca</p>
        
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, textAlign: 'left' }}>
          {exampleProducts.map((p, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', border: '1px solid #EAE8E0' }}>
              <div style={{ background: p.light, height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{ fontSize: 64 }}>{p.emoji}</div>
                <div style={{ fontSize: 11, color: p.bg, fontWeight: 600, marginTop: 12, opacity: 0.8 }}>{p.size}</div>
              </div>
              <div style={{ padding: '1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{p.title}</h3>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#1A1A2E' }}>{p.price}</span>
                </div>
                <div style={{ display: "flex", gap: 5, marginBottom: 16 }}>
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 50, background: p.light, color: p.bg, fontWeight: 600 }}>{p.category}</span>
                </div>
                <div style={{ background: '#1A1A2E', color: '#fff', padding: '12px 0', borderRadius: 10, fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
                  💬 Consultar
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 32, fontSize: 14, color: '#666', fontWeight: 600 }}>
          + 300 inflables disponibles según tu ciudad
        </div>
      </section>

      {/* 5. CTA FINAL */}
      <section style={{ padding: '6rem 2rem', background: '#E8623A', color: '#fff', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, marginBottom: 16 }}>¿Listo para ofrecer brincolines en tu evento?</h2>
        <p style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', opacity: 0.9, marginBottom: 40, maxWidth: 600, margin: '0 auto 40px' }}>
          Únete a los salones que ya generan ingresos extra con su catálogo digital.
        </p>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: '#fff', color: '#E8623A', padding: '16px 32px',
          borderRadius: 50, fontSize: 16, fontWeight: 800, textDecoration: 'none'
        }}>
          💬 Hablar con un asesor →
        </a>
      </section>

      {/* 6. FOOTER */}
      <footer style={{ background: '#111122', color: '#ccc', padding: '3rem 2rem', textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 8 }}>rentaunbrincolin.com</div>
        <p style={{ fontSize: 14, opacity: 0.6, marginBottom: 32 }}>Plataforma de catálogos para salones de eventos</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <a href="/admin" style={{ fontSize: 11, color: '#666', textDecoration: 'none' }}>Acceso socios</a>
          
          <div style={{ fontSize: 12, color: '#666', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16, width: '100%', maxWidth: 200 }}>
            Sitio web creado por{' '}
            <a href="https://bipbopdev.com" target="_blank" rel="noopener noreferrer" style={{ color: '#E8623A', textDecoration: 'none', fontWeight: 600 }}>
              BipBopDev
            </a>
          </div>
        </div>
      </footer>

    </div>
  )
}
