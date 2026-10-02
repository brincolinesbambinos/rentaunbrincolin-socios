import { notFound } from 'next/navigation'
import { getPartnerBySlug, getPartnerBranches } from '@/lib/partners'
import PartnerGTM from '@/components/PartnerGTM'

export default async function BranchLayout({ 
  children, 
  params 
}: { 
  children: React.ReactNode, 
  params: Promise<{ partner: string, branch: string }> 
}) {
  const { partner: partnerSlug, branch: branchSlug } = await params
  const partner = await getPartnerBySlug(partnerSlug)
  if (!partner) notFound()

  const branchIds = partner.branch_ids ?? (partner.branch_id ? [partner.branch_id] : [])
  const branches = await getPartnerBranches(branchIds)
  const activeBranch = branches.find(b => b.slug === branchSlug)
  
  if (!activeBranch) notFound()

  return (
    <div
      style={{
        '--color-primary': partner.primary_color || '#1A1A2E',
        '--color-secondary': partner.secondary_color || '#E8C44A',
      } as React.CSSProperties}
    >
      <PartnerGTM gtmId={activeBranch.gtm_id ?? null} />
      {children}
    </div>
  )
}
