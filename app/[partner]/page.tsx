import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getPartnerBySlug } from "@/lib/partners"
import { getProductsByBranch, getAllVisibleProducts, getFeaturedProducts } from "@/lib/products"
import CatalogClient from "./CatalogClient"

export const dynamic = 'force-dynamic'

export async function generateMetadata(
  { params }: { params: Promise<{ partner: string }> }
): Promise<Metadata> {
  const { partner: slug } = await params
  const partner = await getPartnerBySlug(slug)
  
  if (!partner) return {}

  const title = `Renta un Brincolin en ${partner.name}`
  const description = `Elige entre cientos de inflables para tu próximo evento en ${partner.name}. Consulta disponibilidad directo por WhatsApp.`
  const logo = partner.logo_url ?? "/og-default.png"

  return {
    title,
    description,
    icons: {
      icon: logo,
      apple: logo,
    },
    openGraph: {
      title,
      description,
      images: [
        {
          url: logo,
          width: 1200,
          height: 630,
          alt: partner.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [logo],
    },
  }
}

export default async function PartnerPage({ params }: { params: Promise<{ partner: string }> }) {
  const { partner: slug } = await params
  const partner = await getPartnerBySlug(slug)
  
  if (!partner) notFound()

  // Use branch_id if available, otherwise fetch global catalogue (fallback)
  const products = partner.branch_id 
    ? await getProductsByBranch(partner.branch_id)
    : await getAllVisibleProducts()
  
  // Since featured requires branchId right now, let's just filter locally or fetch if strictly needed. Actually, using user's explicit query from prompt. If it's a global partner, this will fail so we filter.
  // Wait, the prompt says `const featured = await getFeaturedProducts(partner.branch_id)`
  const featured = partner.branch_id ? await getFeaturedProducts(partner.branch_id) : products.filter(p => p.popular).sort(() => Math.random() - 0.5).slice(0, 6)

  return (
    <CatalogClient 
      partner={partner} 
      products={products} 
      featured={featured} 
      pixelId={partner.branches?.meta_pixel_id ?? null}
      branchSlug={partner.branches?.slug ?? null}
    />
  )
}
