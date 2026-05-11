import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getPartnerBySlug, getPartnerBranches } from "@/lib/partners"
import { getProductsByBranch, getFeaturedProducts } from "@/lib/products"
import CatalogClient from "../../CatalogClient"

export const dynamic = 'force-dynamic'

export async function generateMetadata(
  { params }: { params: Promise<{ partner: string, branch: string }> }
): Promise<Metadata> {
  const { partner: partnerSlug, branch: branchSlug } = await params
  const partner = await getPartnerBySlug(partnerSlug)
  
  if (!partner) return {}

  const title = `Catálogo de Brincolines Inflables - ${partner.name}`
  const description = `Explora nuestro catálogo de inflables y juegos en ${partner.name}.`
  const logo = partner.logo_url ?? "/og-default.png"

  return {
    metadataBase: new URL('https://www.rentaunbrincolin.com'),
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://www.rentaunbrincolin.com/${partnerSlug}/${branchSlug}/catalogo`,
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

export default async function CatalogoPage({ params }: { params: Promise<{ partner: string, branch: string }> }) {
  const { partner: partnerSlug, branch: branchSlug } = await params
  const partner = await getPartnerBySlug(partnerSlug)
  
  if (!partner) notFound()

  // Get branches for this partner
  const branches = await getPartnerBranches(partner.branch_ids ?? [])
  const activeBranch = branches.find(b => b.slug.toLowerCase() === branchSlug.toLowerCase())

  if (!activeBranch) notFound()

  // Fetch products for THIS branch
  const products = await getProductsByBranch(activeBranch.id)
  const featured = await getFeaturedProducts(activeBranch.id)

  const pixelId = activeBranch.tracking?.meta_pixel_id || activeBranch.meta_pixel_id || null

  return (
    <CatalogClient 
      partner={partner} 
      products={products} 
      featured={featured} 
      pixelId={pixelId}
      branchName={activeBranch.name}
      branchSlug={activeBranch.slug}
    />
  )
}
