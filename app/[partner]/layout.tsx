import { notFound } from 'next/navigation'
import { getPartnerBySlug } from '../../lib/partners'
import { ReactNode } from 'react'

export async function generateMetadata({ params }: { params: Promise<{ partner: string }> }) {
  const { partner: slug } = await params
  const partner = await getPartnerBySlug(slug)

  if (!partner) {
    return {
      title: 'Socio no encontrado',
    }
  }

  return {
    title: `Catálogo de ${partner.name}`,
    description: `Descubre los brincolines e inflables disponibles en ${partner.name}`,
  }
}

export default async function PartnerLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ partner: string }>
}) {
  const { partner: slug } = await params
  const partner = await getPartnerBySlug(slug)

  if (!partner) {
    notFound()
  }

  return (
    <div 
      className="min-h-screen bg-white"
      style={{
        '--color-primary': partner.primary_color || '#1A1A2E',
        '--color-secondary': partner.secondary_color || '#E8C44A',
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
