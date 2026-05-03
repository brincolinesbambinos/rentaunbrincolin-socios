# Arquitectura — Catálogo White-Label
## `rentaunbrincolin.com` / `rentauninflable.com`
_Documento de handoff para desarrollador — Brincolines Bambinos_
_Actualizado con schema real de Supabase_

---

## 1. Contexto del Proyecto

Proyecto **independiente** de BambinOS. Comparte la misma instancia de Supabase pero tiene su propio repo, dominio y propósito.

**¿Qué es?**
Un catálogo digital white-label para socios comerciales (salones de eventos, terrazas, venues) que rentan brincolines de Brincolines Bambinos y se llevan una comisión. El cliente final visita el catálogo del salón, elige el brincolin y contacta al salón vía WhatsApp. **No hay pasarela de pagos.**

El salón queda como el intermediario visible. Brincolines Bambinos opera en el fondo.

---

## 2. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js (versión más reciente) (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 |
| Base de datos | Supabase (instancia existente de BambinOS) |
| Storage (logos) | Supabase Storage |
| Auth (admin) | Supabase Auth (email/password) |
| Deploy | Vercel |
| Dominio principal | rentaunbrincolin.com |
| Dominio alternativo | rentauninflable.com (mismo proyecto en Vercel) |

---

## 3. Supabase — Conexión

```
Project URL:      https://qsicmaprkrqpotrlcrmq.supabase.co
Publishable Key:  sb_publishable_tLwd9frjxGsnmTdWobM92Q_5MovjnUQ
```

> ⚠️ **Nota importante:** Esta instancia también es usada por BambinOS (la web principal). Las tablas de productos ya existen y pueden sufrir cambios mientras se desarrolla la web principal. Diseñar las queries del catálogo white-label para ser resilientes a cambios de columnas no críticas.

---

## 4. Schema Existente — Tablas Relevantes

### `products`
La tabla principal del catálogo.

| Columna | Uso en el catálogo |
|---------|-------------------|
| `id` | Identificador único |
| `name` | Nombre del producto (ES) |
| `name_en` | Nombre del producto (EN, para futuro) |
| `slug` | URL amigable |
| `description` | Descripción corta |
| `price` | Precio base (puede ser sobreescrito por `product_branches.price_override`) |
| `size` | Tamaño en texto |
| `width_m`, `length_m`, `height_m` | Dimensiones métricas |
| `capacity` | Aforo |
| `min_age` | Edad mínima |
| `needs_operator` | Si requiere operador |
| `category_id` | FK a `categories` |
| `visible` | **Filtrar solo `visible = true`** |
| `image_main` | URL de imagen principal |
| `image_gallery` | Array de URLs adicionales |
| `popular` | Badge de "Popular" |
| `party_types` | Array de tipos de fiesta |

### `categories`
Para filtros en el catálogo.

| Columna | Uso |
|---------|-----|
| `name` | Nombre de categoría (ES) |
| `slug` | Filtro en URL |
| `sort_order` | Orden de aparición |

### `product_branches`
Tabla pivote que conecta productos con sucursales.

| Columna | Uso |
|---------|-----|
| `product_id` | FK a `products` |
| `branch_id` | FK a `branches` |
| `available` | Disponibilidad en esa sucursal |
| `price_override` | Precio específico de la sucursal (si existe, usar este) |

### `branches`
Sucursales de Bambinos (Guadalajara, Monterrey, León, LA).

### `product_images`
Imágenes adicionales por producto (complementa `image_gallery` en `products`).

---

## 5. Decisión de Diseño — ¿Qué productos mostrar?

> **Pendiente de confirmar con Yanga antes de implementar.**

El catálogo white-label puede mostrar productos de dos formas:

**Opción A — Catálogo global** _(recomendada para Fase 1)_
Mostrar todos los productos con `visible = true`, sin filtrar por sucursal. El socio ofrece el catálogo completo de Bambinos.

```sql
select p.*, c.name as category_name
from products p
left join categories c on p.category_id = c.id
where p.visible = true
order by p.sort_order asc;
```

**Opción B — Catálogo por sucursal**
Mostrar solo los productos disponibles en una sucursal específica (ej. Guadalajara). Útil si el socio opera en una ciudad específica.

```sql
select p.*, c.name as category_name,
  coalesce(pb.price_override, p.price) as final_price
from products p
inner join product_branches pb on p.id = pb.product_id
left join categories c on p.category_id = c.id
where p.visible = true
  and pb.branch_id = '[branch_uuid]'
  and pb.available = true
order by p.sort_order asc;
```

> Para Fase 1 con Terraza Cielo Vista (Guadalajara), se puede asignar un `branch_id` a cada `partner` y usar la Opción B. Esto también permite precio correcto por sucursal.

---

## 6. Tablas Nuevas — Agregar a Supabase

### Tabla: `partners`

```sql
create table partners (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  logo_url text,
  phone text,
  whatsapp text not null,
  whatsapp_message text default 'Hola, me interesa rentar el {producto} para mi evento. ¿Me pueden dar información?',
  primary_color text default '#1A1A2E',
  secondary_color text default '#FFFFFF',
  branch_id uuid references branches(id),   -- sucursal de Bambinos asignada a este socio
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table partners enable row level security;

create policy "Public can read active partners"
  on partners for select
  using (active = true);

create policy "Authenticated users manage partners"
  on partners for all
  using (auth.role() = 'authenticated');
```

---

## 7. Supabase Storage — Logos

Crear bucket público:

```
Nombre: partner-logos
Tipo: Public
```

El admin sube el logo → Supabase devuelve URL pública → se guarda en `partners.logo_url`.

---

## 8. Estructura de Rutas

```
rentaunbrincolin.com/
├── [partner]                  ← Catálogo del socio (ej: /cielovista)
├── admin/
│   ├── login                  ← Autenticación
│   ├── (dashboard)/
│   │   ├── page               ← Lista de socios
│   │   ├── partners/new       ← Crear socio
│   │   └── partners/[id]/edit ← Editar socio
```

La raíz `/` puede redirigir a `/admin` o mostrar una página genérica de "Plataforma de catálogos".

---

## 9. Estructura de Archivos

```
/
├── app/
│   ├── [partner]/
│   │   ├── layout.tsx         ← Inyecta CSS vars de colores del socio
│   │   └── page.tsx           ← Catálogo con grid de productos
│   ├── admin/
│   │   ├── layout.tsx         ← Guard: redirect si no autenticado
│   │   ├── login/page.tsx
│   │   ├── page.tsx           ← Lista de socios
│   │   └── partners/
│   │       ├── new/page.tsx
│   │       └── [id]/edit/page.tsx
│   ├── layout.tsx
│   └── page.tsx               ← Redirect a /admin o landing
│
├── components/
│   ├── catalog/
│   │   ├── ProductCard.tsx    ← Card con imagen, nombre, precio, botón WhatsApp
│   │   ├── ProductGrid.tsx    ← Grid responsivo
│   │   ├── CategoryFilter.tsx ← Filtros por categoría
│   │   └── WhatsAppButton.tsx ← CTA principal
│   ├── partner/
│   │   └── PartnerHeader.tsx  ← Logo + nombre del socio en header
│   └── admin/
│       ├── PartnerForm.tsx    ← Formulario crear/editar
│       ├── PartnerList.tsx
│       └── LogoUpload.tsx     ← Upload a Supabase Storage
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts          ← Browser client
│   │   └── server.ts          ← Server client (SSR)
│   ├── partners.ts            ← getPartnerBySlug(), getAllPartners()
│   ├── products.ts            ← getProductsByBranch(), getAllProducts()
│   └── whatsapp.ts            ← buildWhatsAppUrl()
│
└── types/
    └── index.ts               ← Partner, Product, Category types
```

---

## 10. Lógica de la Página del Socio

### `app/[partner]/page.tsx`

```tsx
// Pseudocódigo
export default async function PartnerPage({ params }) {
  const partner = await getPartnerBySlug(params.partner)
  if (!partner) notFound()

  const products = partner.branch_id
    ? await getProductsByBranch(partner.branch_id)
    : await getAllVisibleProducts()

  const categories = await getCategories()

  return (
    <>
      <PartnerHeader partner={partner} />
      <CategoryFilter categories={categories} />
      <ProductGrid products={products} partner={partner} />
    </>
  )
}

export async function generateStaticParams() {
  const partners = await getAllActivePartners()
  return partners.map(p => ({ partner: p.slug }))
}
```

### `app/[partner]/layout.tsx` — Colores dinámicos

```tsx
export default async function PartnerLayout({ params, children }) {
  const partner = await getPartnerBySlug(params.partner)

  return (
    <div style={{
      '--color-primary': partner.primary_color,
      '--color-secondary': partner.secondary_color,
    } as React.CSSProperties}>
      {children}
    </div>
  )
}
```

---

## 11. WhatsApp CTA

```ts
// lib/whatsapp.ts
export function buildWhatsAppUrl(partner: Partner, productName: string): string {
  const phone = partner.whatsapp.replace(/\D/g, '')
  const message = (partner.whatsapp_message ?? '')
    .replace('{producto}', productName)
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
```

El botón en `ProductCard.tsx` abre WhatsApp del socio, no de Bambinos. El cliente nunca ve que el backend es Brincolines Bambinos.

---

## 12. Panel de Administración

### Funcionalidades

| Acción | Descripción |
|--------|-------------|
| Listar socios | Tabla con nombre, slug, sucursal asignada, estado |
| Crear socio | Formulario completo + subida de logo |
| Editar socio | Modificar cualquier campo |
| Activar / Desactivar | Toggle sin borrar el registro |
| Copiar URL | `rentaunbrincolin.com/[slug]` al portapapeles |

### Auth

Supabase Auth email/password. El primer usuario admin se crea manualmente en Supabase → Authentication → Users.

```ts
// app/admin/layout.tsx
export default async function AdminLayout({ children }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  return <>{children}</>
}
```

---

## 13. Variables de Entorno

`.env.local` en la raíz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://qsicmaprkrqpotrlcrmq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_tLwd9frjxGsnmTdWobM92Q_5MovjnUQ
NEXT_PUBLIC_SITE_URL=https://rentaunbrincolin.com
```

Estas mismas variables van en Vercel → Settings → Environment Variables.

---

## 14. Configuración Vercel

1. Crear proyecto nuevo, conectar al repo de este proyecto
2. Agregar dominio `rentaunbrincolin.com`
3. Agregar dominio `rentauninflable.com` (mismo proyecto, ambos dominios activos)
4. Configurar variables de entorno
5. Vercel gestiona SSL automáticamente para ambos dominios

---

## 15. Primer Socio — Terraza Cielo Vista

Insertar después del setup inicial:

```sql
insert into partners (slug, name, phone, whatsapp, whatsapp_message, primary_color, secondary_color, branch_id)
values (
  'cielovista',
  'Terraza Cielo Vista',
  '+52XXXXXXXXXX',        -- completar
  '+52XXXXXXXXXX',        -- completar
  'Hola, me interesa rentar el {producto} para mi evento en Terraza Cielo Vista. ¿Tienen disponibilidad?',
  '#1A1A2E',              -- ajustar al branding de la terraza
  '#E8C44A',              -- ajustar al branding de la terraza
  '[uuid-de-guadalajara]' -- obtener con: SELECT id FROM branches WHERE slug = 'guadalajara'
);
```

**URL resultante:**
```
https://rentaunbrincolin.com/cielovista
```

---

## 16. Consideraciones por el Schema en Evolución

> ⚠️ La tabla `products` puede cambiar mientras se desarrolla BambinOS. Tener en cuenta:

- No hacer `SELECT *` — listar columnas explícitamente para evitar errores si se agregan columnas incompatibles
- Si se renombran columnas críticas (`image_main`, `visible`, `slug`), actualizar las queries del catálogo white-label
- Mantener comunicación entre el dev de este proyecto y el dev de BambinOS sobre cambios al schema

---

## 17. Fase 1 — Alcance

### ✅ Incluido
- Catálogo de productos filtrado por categoría
- Branding del socio (logo, colores, nombre)
- WhatsApp CTA por producto
- Panel admin para gestionar socios
- Dos dominios apuntando al mismo proyecto

### ❌ Fuera de alcance (fases futuras)
- Pasarela de pagos
- Sistema de reservas (eso vive en BambinOS / Llevaturenta.com)
- Subconjunto de productos personalizado por socio
- Portal de acceso para el socio (solo admin interno de Bambinos)
- Estadísticas de tráfico por socio
- Comisiones automáticas

---

## 18. Pregunta Pendiente Antes de Implementar

**¿El catálogo del socio muestra todos los productos activos o solo los de una sucursal específica?**

- Si Terraza Cielo Vista opera en Guadalajara → asignarle `branch_id = guadalajara` y mostrar solo productos disponibles en esa sucursal con su precio correcto
- Si el catálogo es global → no filtrar por branch

La tabla `partners` ya tiene la columna `branch_id` para soportar ambos casos.

---

_Documento generado para Brincolines Bambinos — Proyecto rentaunbrincolin.com_
_Conecta con: BambinOS (web principal) · Supabase (compartido) · Llevaturenta.com (futuro sistema de gestión)_
