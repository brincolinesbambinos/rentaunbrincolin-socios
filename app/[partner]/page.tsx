import { notFound, redirect } from "next/navigation"
import { getPartnerBySlug, getPartnerBranches } from "@/lib/partners"
import { getAllVisibleProducts } from "@/lib/products"
import CatalogClient from "./CatalogClient"
import Link from "next/link"
import type { Metadata } from "next"

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ partner: string }> }): Promise<Metadata> {
  const { partner: slug } = await params
  const partner = await getPartnerBySlug(slug)
  
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
      url: `https://www.rentaunbrincolin.com/${partner.slug}`,
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

export default async function PartnerRootPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ partner: string }>,
  searchParams: Promise<{ active_whatsapp_slug?: string }>
}) {
  const { partner: slug } = await params
  const { active_whatsapp_slug } = await searchParams
  const partner = await getPartnerBySlug(slug)
  
  if (!partner) notFound()

  const branchIds = partner.branch_ids ?? (partner.branch_id ? [partner.branch_id] : [])

  // Case 1: Global Catalogue (No branches)
  if (branchIds.length === 0) {
    const products = await getAllVisibleProducts()
    const featured = products.filter(p => p.popular).slice(0, 6)
    return (
      <CatalogClient 
        partner={partner} 
        products={products} 
        featured={featured} 
        pixelId={null}
        activeSlug={active_whatsapp_slug || slug}
      />
    )
  }

  // Case 2: Only one branch -> Redirect to /catalogo
  if (branchIds.length === 1) {
    const branches = await getPartnerBranches(branchIds)
    if (branches.length > 0) {
      const target = active_whatsapp_slug 
        ? `/${slug}/${active_whatsapp_slug}/${branches[0].slug}/catalogo`
        : `/${slug}/${branches[0].slug}/catalogo`
      redirect(target)
    }
  }

  // Case 3: Multiple branches -> Selection UI
  const branches = await getPartnerBranches(branchIds)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FDFCF9]" 
         style={{ '--primary': partner.primary_color, '--secondary': partner.secondary_color } as any}>
      <div className="max-w-md w-full text-center space-y-8">
        {partner.logo_url && (
          <img src={partner.logo_url} alt={partner.name} className="h-20 mx-auto object-contain" />
        )}
        
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido a {partner.name}</h1>
          <p className="text-gray-500 mt-2">Selecciona tu sucursal para ver el catálogo.</p>
        </div>

        <div className="grid gap-4">
          {branches.map(branch => (
            <Link 
              key={branch.id}
              href={active_whatsapp_slug ? `/${slug}/${active_whatsapp_slug}/${branch.slug}/catalogo` : `/${slug}/${branch.slug}/catalogo`}
              className="group relative bg-white border-2 border-gray-100 p-5 rounded-2xl hover:border-[var(--primary)] transition-all hover:shadow-md text-left flex items-center justify-between"
            >
              <div>
                <span className="block font-bold text-lg text-gray-900 group-hover:text-[var(--primary)]">{branch.name}</span>
                <span className="text-sm text-gray-400">Ver inventario disponible</span>
              </div>
              <span className="text-2xl opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
