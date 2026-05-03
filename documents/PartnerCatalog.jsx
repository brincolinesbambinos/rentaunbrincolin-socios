import { useState, useMemo } from "react"

const PARTNER = {
  name: "Jardín de Eventos Cielo Vista",
  shortName: "Cielo Vista",
  tagline: "Encuentra el inflable perfecto para tu próximo evento",
  primary: "#1A1A2E",
  accent: "#E8623A",
  whatsapp: "523323553610",
  waMsgTemplate: "Hola, me interesa rentar el {producto} para mi evento en Cielo Vista. ¿Tienen disponibilidad?",
}

const CATEGORIES = ["Todos","Acuático","Clásico","Destreza","Interactivo","Mecánico","Personajes","Princesas","Variedad"]
const AGE_GROUPS = ["Todos","3–5 años","6–9 años","10+ años","Adultos"]

const CAT_COLORS = {
  Acuático:    { bg:"#0EA5E9", light:"#E0F2FE", emoji:"🌊" },
  Clásico:     { bg:"#8B5CF6", light:"#EDE9FE", emoji:"🏰" },
  Destreza:    { bg:"#16A34A", light:"#DCFCE7", emoji:"🎯" },
  Interactivo: { bg:"#3B82F6", light:"#DBEAFE", emoji:"⚡" },
  Mecánico:    { bg:"#F97316", light:"#FEF3C7", emoji:"🤠" },
  Personajes:  { bg:"#EF4444", light:"#FEE2E2", emoji:"🦸" },
  Princesas:   { bg:"#EC4899", light:"#FCE7F3", emoji:"👑" },
  Variedad:    { bg:"#EAB308", light:"#FEF9C3", emoji:"🎉" },
}

const PRODUCTS = [
  { id:1,  name:"Nano Zone Blaster 10x12",  category:"Destreza",    price:11500, minAge:"6+", ageGroup:"6–9 años",   capacity:"10 participantes", size:"10x12m", description:"Zona de batalla con bolas de gel para los más aventureros.", descriptionExt:"Incluye 2 lanzadores, 500 bolas de gel y chalecos protectores. La experiencia perfecta para cumpleaños de niños activos que quieren algo diferente.", needsOperator:true,  popular:true  },
  { id:2,  name:"Bunkers Blaster Zone",      category:"Destreza",    price:9500,  minAge:"6+", ageGroup:"6–9 años",   capacity:"10 participantes", size:"8x8m",   description:"Arena de combate con bunkers tácticos inflables.",           descriptionExt:"Campo de batalla con múltiples obstáculos para que los jugadores se cubran. Equipo completo incluido.", needsOperator:true,  popular:false },
  { id:3,  name:"Mini Golf Gigante",         category:"Destreza",    price:7390,  minAge:"4+", ageGroup:"3–5 años",   capacity:"9 participantes",  size:"6x10m",  description:"Campo de mini golf inflable con 4 hoyos temáticos.",         descriptionExt:"Perfecto para todas las edades. Incluye palos, pelotas y señalización de cada hoyo. Fácil de instalar.", needsOperator:false, popular:true  },
  { id:4,  name:"Adrenaline Adventure",      category:"Interactivo", price:5990,  minAge:"5+", ageGroup:"6–9 años",   capacity:"45 participantes", size:"8.5x11m",description:"Gran parque lleno de obstáculos, toboganes y túneles.",       descriptionExt:"El juego favorito de las fiestas. Toboganes, túneles, obstáculos y zona de escalada. Diseño colorido.", needsOperator:false, popular:true  },
  { id:5,  name:"Toro Mecánico Pro",         category:"Mecánico",    price:8500,  minAge:"8+", ageGroup:"10+ años",   capacity:"1 participante",   size:"4x4m",   description:"Toro mecánico con varios niveles de dificultad.",            descriptionExt:"La atracción estrella de cualquier evento. Incluye colchón de caída y operador. Apto para adultos y niños mayores de 8 años.", needsOperator:true,  popular:true  },
  { id:6,  name:"Castillo Arco Iris",        category:"Clásico",     price:3500,  minAge:"3+", ageGroup:"3–5 años",   capacity:"8 participantes",  size:"5x5m",   description:"Brincolin clásico ideal para los más pequeños.",             descriptionExt:"Diseño colorido y seguro. Malla de seguridad en todos los lados, materiales de alta resistencia y base anclada.", needsOperator:false, popular:false },
  { id:7,  name:"Peaches Play House",        category:"Princesas",   price:6200,  minAge:"3+", ageGroup:"3–5 años",   capacity:"10 participantes", size:"7x7m",   description:"Casa de princesas con tobogán y zona de juego.",             descriptionExt:"Diseño exclusivo tipo casita con colores pasteles y detalles florales. Tobogán doble y arco de entrada decorado.", needsOperator:false, popular:true  },
  { id:8,  name:"Spinner XL",                category:"Mecánico",    price:9800,  minAge:"10+",ageGroup:"Adultos",    capacity:"4 participantes",  size:"4x4m",   description:"Plataforma giratoria que pone a prueba el equilibrio.",      descriptionExt:"Cuatro participantes compiten para ver quién aguanta más. Ideal para adultos y teens en eventos con mucha energía.", needsOperator:true,  popular:false },
  { id:9,  name:"Acuaslide Tsunami",         category:"Acuático",    price:12000, minAge:"5+", ageGroup:"6–9 años",   capacity:"20 participantes", size:"6x12m",  description:"Tobogán acuático doble de 5 metros de altura.",             descriptionExt:"El rey de las fiestas de verano. Doble carril con zona de aterrizaje. Incluye manguera y bomba de presión.", needsOperator:false, popular:true  },
  { id:10, name:"Minions Adventure Park",    category:"Personajes",  price:7800,  minAge:"3+", ageGroup:"3–5 años",   capacity:"12 participantes", size:"9x9m",   description:"Parque temático inflable de los Minions.",                   descriptionExt:"Zona de salto, mini tobogán y obstáculos temáticos. El sueño de cualquier fan. Diseño oficial y colorido.", needsOperator:false, popular:false },
]

const fmt = (n) => `$${n.toLocaleString("es-MX")}`

export default function PartnerCatalog() {
  const [activeCategory, setActiveCategory] = useState("Todos")
  const [maxPrice, setMaxPrice]             = useState(12000)
  const [activeAge, setActiveAge]           = useState("Todos")
  const [selected, setSelected]             = useState(null)

  const filtered = useMemo(() => PRODUCTS.filter(p => {
    const cat   = activeCategory === "Todos" || p.category === activeCategory
    const price = p.price <= maxPrice
    const age   = activeAge === "Todos" || p.ageGroup === activeAge
    return cat && price && age
  }), [activeCategory, maxPrice, activeAge])

  const recommended = selected
    ? PRODUCTS.filter(p => p.id !== selected.id && p.category === selected.category).slice(0, 3)
    : []

  const waLink = (p) => {
    const msg = PARTNER.waMsgTemplate.replace("{producto}", p.name)
    return `https://wa.me/${PARTNER.whatsapp}?text=${encodeURIComponent(msg)}`
  }

  const cc = (cat) => CAT_COLORS[cat] || { bg:"#6B7280", light:"#F3F4F6", emoji:"🎪" }

  return (
    <div style={{ fontFamily:"system-ui,-apple-system,sans-serif", background:"#F8F7F3", minHeight:"100vh", color:"#1A1A2E" }}>

      {/* ── HEADER ── */}
      <div style={{ background:PARTNER.primary, color:"#fff" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"1rem 2rem", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:"50%", background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, letterSpacing:1 }}>CV</div>
            <div>
              <div style={{ fontSize:15, fontWeight:700 }}>{PARTNER.shortName}</div>
              <div style={{ fontSize:11, opacity:0.5, letterSpacing:0.5 }}>Jardín de Eventos</div>
            </div>
          </div>
          <a href={`https://wa.me/${PARTNER.whatsapp}`} target="_blank"
            style={{ background:PARTNER.accent, color:"#fff", padding:"10px 20px", borderRadius:50, fontSize:13, fontWeight:600, textDecoration:"none", display:"flex", alignItems:"center", gap:8 }}>
            💬 Contacto directo
          </a>
        </div>

        {/* Hero */}
        <div style={{ textAlign:"center", padding:"3rem 2rem 3.5rem" }}>
          <div style={{ fontSize:11, letterSpacing:3, opacity:0.4, textTransform:"uppercase", marginBottom:14 }}>Catálogo de inflables</div>
          <h1 style={{ fontSize:44, fontWeight:800, margin:"0 0 12px", lineHeight:1.1 }}>Nuestros Inflables</h1>
          <p style={{ fontSize:16, opacity:0.6, margin:0, maxWidth:420, marginLeft:"auto", marginRight:"auto" }}>{PARTNER.tagline}</p>
          <div style={{ display:"flex", gap:40, justifyContent:"center", marginTop:28 }}>
            {[["300+","inflables disponibles"],["16+","años de experiencia"],["GDL","zona de cobertura"]].map(([n,l]) => (
              <div key={l} style={{ textAlign:"center" }}>
                <div style={{ fontSize:22, fontWeight:800 }}>{n}</div>
                <div style={{ fontSize:11, opacity:0.5, marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div style={{ background:"#fff", borderBottom:"1.5px solid #EAE8E0", padding:"1rem 2rem", position:"sticky", top:0, zIndex:10 }}>
        {/* Category pills */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              padding:"6px 16px", borderRadius:50, border:"1.5px solid",
              borderColor: activeCategory===cat ? PARTNER.primary : "#E5E3DC",
              background:  activeCategory===cat ? PARTNER.primary : "#fff",
              color:        activeCategory===cat ? "#fff" : "#666",
              fontSize:13, fontWeight:500, cursor:"pointer",
            }}>{cat}</button>
          ))}
        </div>
        {/* Price + Age */}
        <div style={{ display:"flex", gap:32, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:12, color:"#999", whiteSpace:"nowrap" }}>Precio máx:</span>
            <input type="range" min={3000} max={12000} step={500} value={maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value))}
              style={{ width:120, accentColor:PARTNER.primary }} />
            <span style={{ fontSize:13, fontWeight:700, color:PARTNER.primary, minWidth:64 }}>{fmt(maxPrice)}</span>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {AGE_GROUPS.map(age => (
              <button key={age} onClick={() => setActiveAge(age)} style={{
                padding:"4px 12px", borderRadius:50, border:"1px solid",
                borderColor: activeAge===age ? PARTNER.accent : "#E5E3DC",
                background:  activeAge===age ? "#FEF0EB" : "#fff",
                color:        activeAge===age ? PARTNER.accent : "#999",
                fontSize:12, cursor:"pointer", fontWeight: activeAge===age ? 600 : 400
              }}>{age}</button>
            ))}
          </div>
          <span style={{ marginLeft:"auto", fontSize:12, color:"#bbb" }}>{filtered.length} inflables</span>
        </div>
      </div>

      {/* ── PRODUCT GRID ── */}
      <div style={{ padding:"2rem", display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:20, maxWidth:1280, margin:"0 auto" }}>
        {filtered.map(product => {
          const c = cc(product.category)
          return (
            <div key={product.id}
              style={{ background:"#fff", borderRadius:18, overflow:"hidden", cursor:"pointer", border:"1px solid #EAE8E0", transition:"transform 0.15s" }}
              onClick={() => setSelected(product)}
              onMouseEnter={e => e.currentTarget.style.transform="translateY(-4px)"}
              onMouseLeave={e => e.currentTarget.style.transform="translateY(0)"}
            >
              {/* Image placeholder */}
              <div style={{ background:c.light, height:190, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative" }}>
                <div style={{ fontSize:56 }}>{c.emoji}</div>
                <div style={{ fontSize:11, color:c.bg, fontWeight:600, marginTop:6, opacity:0.7 }}>{product.size}</div>
                {product.popular && (
                  <div style={{ position:"absolute", top:12, left:12, background:PARTNER.accent, color:"#fff", fontSize:10, fontWeight:700, padding:"4px 10px", borderRadius:50 }}>⭐ POPULAR</div>
                )}
                {product.needsOperator && (
                  <div style={{ position:"absolute", top:12, right:12, background:PARTNER.primary, color:"#fff", fontSize:10, padding:"4px 10px", borderRadius:50 }}>Con operador</div>
                )}
              </div>
              {/* Content */}
              <div style={{ padding:"1rem 1.1rem 1.2rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:8 }}>
                  <h3 style={{ fontSize:14, fontWeight:700, margin:0, lineHeight:1.3 }}>{product.name}</h3>
                  <span style={{ fontSize:16, fontWeight:800, color:PARTNER.primary, whiteSpace:"nowrap" }}>{fmt(product.price)}</span>
                </div>
                <div style={{ display:"flex", gap:5, marginBottom:10, flexWrap:"wrap" }}>
                  <span style={{ fontSize:11, padding:"3px 10px", borderRadius:50, background:c.light, color:c.bg, fontWeight:600 }}>{product.category}</span>
                  <span style={{ fontSize:11, padding:"3px 10px", borderRadius:50, background:"#F3F2EE", color:"#777" }}>🎂 {product.minAge}</span>
                  <span style={{ fontSize:11, padding:"3px 10px", borderRadius:50, background:"#F3F2EE", color:"#777" }}>👥 {product.capacity}</span>
                </div>
                <p style={{ fontSize:12, color:"#999", margin:"0 0 14px", lineHeight:1.6 }}>{product.description}</p>
                <div style={{ display:"flex", gap:8 }}>
                  <a href={waLink(product)} target="_blank" onClick={e => e.stopPropagation()}
                    style={{ flex:1, background:PARTNER.primary, color:"#fff", padding:"10px 0", borderRadius:10, fontSize:12, fontWeight:700, textDecoration:"none", textAlign:"center" }}>
                    💬 Consultar
                  </a>
                  <button onClick={e => { e.stopPropagation(); setSelected(product) }}
                    style={{ padding:"10px 14px", borderRadius:10, border:"1px solid #E5E3DC", background:"#fff", cursor:"pointer", fontSize:12, color:"#666" }}>
                    Ver más →
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"5rem 2rem", color:"#bbb" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
            <p style={{ fontSize:15 }}>No encontramos inflables con esos filtros.</p>
            <button onClick={() => { setActiveCategory("Todos"); setMaxPrice(12000); setActiveAge("Todos") }}
              style={{ marginTop:12, padding:"10px 24px", borderRadius:50, background:PARTNER.primary, color:"#fff", border:"none", cursor:"pointer", fontSize:13, fontWeight:600 }}>
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background:PARTNER.primary, color:"rgba(255,255,255,0.4)", textAlign:"center", padding:"1.5rem", fontSize:12, marginTop:"2rem" }}>
        Catálogo con tecnología de <strong style={{ color:"rgba(255,255,255,0.6)" }}>Brincolines Bambinos</strong>
      </div>

      {/* ── DETAIL PANEL ── */}
      {selected && (() => {
        const p = selected
        const c = cc(p.category)
        return (
          <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex" }}>
            <div onClick={() => setSelected(null)} style={{ flex:1, background:"rgba(0,0,0,0.5)" }} />
            <div style={{ width:460, background:"#fff", overflowY:"auto", display:"flex", flexDirection:"column", animation:"slideIn 0.2s ease" }}>
              <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

              {/* Panel hero */}
              <div style={{ background:c.light, padding:"2rem 1.5rem 1.5rem", position:"relative" }}>
                <button onClick={() => setSelected(null)}
                  style={{ position:"absolute", top:16, right:16, background:"rgba(0,0,0,0.1)", border:"none", borderRadius:50, width:34, height:34, cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                <div style={{ fontSize:64, marginBottom:14 }}>{c.emoji}</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
                  <span style={{ fontSize:11, padding:"4px 12px", borderRadius:50, background:c.bg, color:"#fff", fontWeight:600 }}>{p.category}</span>
                  {p.popular && <span style={{ fontSize:11, padding:"4px 12px", borderRadius:50, background:PARTNER.accent, color:"#fff", fontWeight:600 }}>⭐ Popular</span>}
                  {p.needsOperator && <span style={{ fontSize:11, padding:"4px 12px", borderRadius:50, background:PARTNER.primary, color:"#fff" }}>Con operador</span>}
                </div>
                <h2 style={{ fontSize:24, fontWeight:800, margin:"0 0 6px", lineHeight:1.2 }}>{p.name}</h2>
                <div style={{ fontSize:28, fontWeight:800, color:PARTNER.primary }}>{fmt(p.price)}</div>
              </div>

              {/* Description + specs */}
              <div style={{ padding:"1.5rem", flex:1 }}>
                <p style={{ fontSize:14, color:"#555", lineHeight:1.75, marginBottom:20 }}>{p.descriptionExt}</p>

                <div style={{ background:"#F8F7F3", borderRadius:14, padding:"1.1rem 1.2rem", marginBottom:24 }}>
                  <div style={{ fontSize:10, fontWeight:800, letterSpacing:1.5, color:"#aaa", textTransform:"uppercase", marginBottom:14 }}>Especificaciones</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                    {[
                      ["📐 Tamaño", p.size || "—"],
                      ["👥 Capacidad", p.capacity],
                      ["🎂 Edad mínima", p.minAge],
                      ["👷 Operador", p.needsOperator ? "Incluido" : "No requiere"],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <div style={{ fontSize:11, color:"#aaa", marginBottom:3 }}>{label}</div>
                        <div style={{ fontSize:13, fontWeight:700 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <a href={waLink(p)} target="_blank" style={{
                  display:"block", background:PARTNER.primary, color:"#fff",
                  padding:"15px", borderRadius:14, textAlign:"center",
                  fontWeight:700, fontSize:15, textDecoration:"none", marginBottom:10
                }}>💬 Consultar disponibilidad</a>
                <p style={{ fontSize:11, color:"#ccc", textAlign:"center", margin:0 }}>Se abrirá WhatsApp con un mensaje pre-llenado</p>
              </div>

              {/* Recommended */}
              {recommended.length > 0 && (
                <div style={{ padding:"0 1.5rem 2rem" }}>
                  <div style={{ fontSize:10, fontWeight:800, letterSpacing:1.5, color:"#aaa", textTransform:"uppercase", marginBottom:14 }}>También te puede interesar</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {recommended.map(r => {
                      const rc = cc(r.category)
                      return (
                        <div key={r.id} onClick={() => setSelected(r)}
                          style={{ display:"flex", gap:12, padding:"12px 14px", background:"#F8F7F3", borderRadius:14, cursor:"pointer", alignItems:"center" }}>
                          <div style={{ width:48, height:48, borderRadius:12, background:rc.light, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>{rc.emoji}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.name}</div>
                            <div style={{ fontSize:12, color:PARTNER.primary, fontWeight:700, marginTop:2 }}>{fmt(r.price)}</div>
                          </div>
                          <span style={{ color:"#ccc", fontSize:20 }}>›</span>
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
