# Prompt para Antigravity — Implementar `app/[partner]/page.tsx`

---

Implementa la página del catálogo white-label para socios comerciales en la ruta `app/[partner]/page.tsx`.

Tienes como referencia el archivo `PartnerCatalog.jsx` que contiene el diseño completo aprobado. Tu trabajo es integrar ese diseño con los datos reales de Supabase y adaptarlo a la arquitectura del proyecto.

---

## Lo que debes hacer

### 1. Obtener los datos del socio desde Supabase

Crea la función `getPartnerBySlug(slug: string)` en `lib/partners.ts`:

```ts
import { createServerClient } from "@/lib/supabase/server"

export async function getPartnerBySlug(slug: string) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .single()

  if (error || !data) return null
  return data
}
```

Si el slug no existe o el partner está inactivo, llama a `notFound()`.

---

### 2. Obtener los productos desde Supabase

Crea la función `getProductsByBranch(branchId: string)` en `lib/products.ts`:

```ts
export async function getProductsByBranch(branchId: string) {
  const supabase = createServerClient()
  const { data } = await supabase
    .from("products")
    .select(`
      id, name, slug, description, description_extended,
      price, size, width_m, length_m, height_m,
      capacity, min_age, needs_operator,
      image_main, image_gallery, popular,
      category_id,
      categories ( id, name, slug ),
      product_branches!inner (
        available,
        price_override,
        branch_id
      )
    `)
    .eq("visible", true)
    .eq("product_branches.branch_id", branchId)
    .eq("product_branches.available", true)
    .order("sort_order", { ascending: true })

  return data ?? []
}
```

El precio final de cada producto es:
```ts
const finalPrice = product.product_branches[0]?.price_override ?? product.price
```

---

### 3. Adaptar el componente `PartnerCatalog.jsx`

El archivo `PartnerCatalog.jsx` tiene el diseño completo aprobado con datos mock. Conviértelo en un componente real haciendo estos cambios:

**a) Reemplaza el objeto `PARTNER` hardcodeado** con los datos que llegan desde Supabase como prop:
```ts
// El componente recibe el partner como prop
interface Props {
  partner: Partner
  products: Product[]
}
```

**b) Reemplaza el array `PRODUCTS` hardcodeado** con los productos reales que vienen de Supabase.

**c) Reemplaza los emojis de placeholder** en las image areas con imágenes reales:
```tsx
{product.image_main ? (
  <img
    src={product.image_main}
    alt={product.name}
    style={{ width:"100%", height:"100%", objectFit:"cover" }}
  />
) : (
  <div style={{ fontSize:56 }}>{c.emoji}</div>
)}
```

**d) El nombre de la categoría** viene de `product.categories.name` (relación de Supabase).

**e) Los colores del partner** (`primary_color`, `secondary_color`) reemplazan los valores hardcodeados de `PARTNER.primary` y `PARTNER.accent`.

---

### 4. Estructura de la página (Server Component + Client Component)

La página debe separarse en dos partes:

```
app/[partner]/
├── page.tsx          ← Server Component: fetch de Supabase
└── CatalogClient.tsx ← Client Component: filtros, panel, interacciones
```

**`app/[partner]/page.tsx`** (Server Component):
```tsx
import { notFound } from "next/navigation"
import { getPartnerBySlug } from "@/lib/partners"
import { getProductsByBranch } from "@/lib/products"
import CatalogClient from "./CatalogClient"

export default async function PartnerPage({ params }: { params: { partner: string } }) {
  const partner = await getPartnerBySlug(params.partner)
  if (!partner) notFound()

  const products = await getProductsByBranch(partner.branch_id)

  return <CatalogClient partner={partner} products={products} />
}

export async function generateStaticParams() {
  // Opcional: prerenderizar slugs conocidos
  return []
}
```

**`CatalogClient.tsx`** es el componente del archivo `PartnerCatalog.jsx` adaptado con `"use client"` al inicio.

---

### 5. Tipos TypeScript

Crea en `types/index.ts`:

```ts
export interface Partner {
  id: string
  slug: string
  name: string
  logo_url: string | null
  phone: string | null
  whatsapp: string
  whatsapp_message: string
  address: string | null
  primary_color: string
  secondary_color: string
  branch_id: string
  active: boolean
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  description_extended: string | null
  price: number | null
  size: string | null
  capacity: string | null
  min_age: string | null
  needs_operator: boolean
  image_main: string | null
  image_gallery: string[] | null
  popular: boolean
  categories: { id: string; name: string; slug: string } | null
  product_branches: { available: boolean; price_override: number | null }[]
}
```

---

### 6. Logo del socio en el header

Si `partner.logo_url` existe, muestra el logo. Si no, muestra las iniciales como fallback:

```tsx
{partner.logo_url ? (
  <img src={partner.logo_url} alt={partner.name} style={{ height:36, objectFit:"contain" }} />
) : (
  <div style={{ width:44, height:44, borderRadius:"50%", background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700 }}>
    {partner.name.slice(0,2).toUpperCase()}
  </div>
)}
```

---

### 7. WhatsApp URL

```ts
// lib/whatsapp.ts
export function buildWhatsAppUrl(partner: Partner, productName: string): string {
  const phone = partner.whatsapp.replace(/\D/g, "")
  const message = (partner.whatsapp_message ?? "Hola, me interesa rentar el {producto}")
    .replace("{producto}", productName)
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
```

---

## Archivos a crear o modificar

| Archivo | Acción |
|---|---|
| `lib/partners.ts` | Crear |
| `lib/products.ts` | Crear |
| `lib/whatsapp.ts` | Crear |
| `types/index.ts` | Crear |
| `app/[partner]/page.tsx` | Crear (Server Component) |
| `app/[partner]/CatalogClient.tsx` | Crear (Client Component, basado en `PartnerCatalog.jsx`) |

---

## Notas importantes

- El diseño visual está **aprobado y cerrado**. No cambies colores, tipografía, layout ni comportamiento. Solo conecta los datos reales.
- No uses `SELECT *` en Supabase — lista las columnas explícitamente como se muestra arriba.
- El panel lateral usa `position: fixed` — funciona correctamente dentro de un iframe o en el navegador, no modificar.
- Si un producto no tiene `image_main`, mantén el emoji de categoría como placeholder visual.
- La tabla `products` puede evolucionar. Si una columna no existe todavía, usa `null` como fallback en el tipo y en el componente.
