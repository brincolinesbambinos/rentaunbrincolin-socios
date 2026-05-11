import { notFound } from 'next/navigation'
import { getPartnerBySlug, getPartnerBranches } from '@/lib/partners'
import { getProductBySlug, getProductsByBranch } from '@/lib/products'
import ProductDetailClient from './ProductDetailClient'

export async function generateMetadata({ params }: { params: Promise<{ partner: string, branch: string, slug: string }> }) {
  const { partner: partnerSlug, branch: branchSlug, slug } = await params
  const partner = await getPartnerBySlug(partnerSlug)
  if (!partner) return {}

  const branchIds = partner.branch_ids ?? (partner.branch_id ? [partner.branch_id] : [])
  const branches = await getPartnerBranches(branchIds)
  const activeBranch = branches.find(b => b.slug.toLowerCase() === branchSlug.toLowerCase())
  if (!activeBranch) return {}

  const product = await getProductBySlug(slug, activeBranch.id)
  if (!product) return { title: partner.name }

  return {
    title: `${product.name} - ${partner.name}`,
    description: product.description,
    openGraph: {
      images: product.image_main ? [{ url: product.image_main }] : []
    }
  }
}

export default async function ProductPage({ params }: { params: Promise<{ partner: string, branch: string, slug: string }> }) {
  const { partner: partnerSlug, branch: branchSlug, slug } = await params

  const partner = await getPartnerBySlug(partnerSlug)
  if (!partner) notFound()

  const branchIds = partner.branch_ids ?? (partner.branch_id ? [partner.branch_id] : [])
  const branches = await getPartnerBranches(branchIds)
  const activeBranch = branches.find(b => b.slug.toLowerCase() === branchSlug.toLowerCase())
  if (!activeBranch) notFound()

  const product = await getProductBySlug(slug, activeBranch.id)
  if (!product) notFound()

  // Similar products (same category)
  const allProducts = await getProductsByBranch(activeBranch.id)
  const similar = allProducts
    .filter(p => p.id !== product.id && p.category_id === product.category_id)
    .slice(0, 3)

  // JSON-LD
  const productSchema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "image": product.image_main,
    "description": product.description,
    "offers": {
      "@type": "Offer",
      "priceCurrency": "MXN",
      "price": product.price,
      "availability": "https://schema.org/InStock"
    }
  }

  return (
    <>
      <script 
        type="application/ld+json" 
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} 
      />
      <ProductDetailClient 
        product={product} 
        partner={partner} 
        similar={similar}
        branchName={activeBranch.name}
        backUrl={`/${partnerSlug}/${branchSlug}/catalogo`}
      />
    </>
  )
}
