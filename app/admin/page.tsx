import { createClient } from '@/lib/supabase/server'
import { PartnerList } from '@/components/admin/PartnerList'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Partner, Branch } from '@/types'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  
  // Fetch partners including inactive ones for the admin panel
  const { data: partners, error: partnerError } = await supabase
    .from('partners')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch branches
  const { data: branches, error: branchError } = await supabase
    .from('branches')
    .select('id, name, slug')
    .order('name')

  const error = partnerError || branchError

  // Group partners by branch
  // A partner can have multiple branches in branch_ids (or a single one in branch_id)
  const partnersByBranch: Record<string, { branch: Branch | null, partners: Partner[] }> = {}
  
  const allPartners = (partners || []) as Partner[]
  const allBranches = (branches || []) as Branch[]

  // Initialize groups for each branch
  allBranches.forEach(branch => {
    partnersByBranch[branch.id] = { branch, partners: [] }
  })
  
  // Group for partners with no branches or whose branches are not found
  partnersByBranch['none'] = { branch: null, partners: [] }

  allPartners.forEach(partner => {
    const branchIds = partner.branch_ids || (partner.branch_id ? [partner.branch_id] : [])
    if (branchIds.length === 0) {
      partnersByBranch['none'].partners.push(partner)
    } else {
      branchIds.forEach(bid => {
        if (partnersByBranch[bid]) {
          partnersByBranch[bid].partners.push(partner)
        } else {
          // If branch ID is not in our list of branches (shouldn't happen but for safety)
          partnersByBranch['none'].partners.push(partner)
        }
      })
    }
  })

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Socios Comerciales</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona los catálogos White-Label agrupados por sucursal.</p>
        </div>
        <Link 
          href="/admin/partners/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm flex items-center transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Socio
        </Link>
      </div>

      {error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium">
          Hubo un error cargando los datos. Revisa la consola o configuración de Supabase.
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(partnersByBranch).map(([branchId, group]) => {
            if (group.partners.length === 0) return null
            return (
              <div key={branchId}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-bold text-gray-800">
                    {group.branch ? `Sucursal: ${group.branch.name}` : 'Sin Sucursal / Global'}
                  </h2>
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">
                    {group.partners.length}
                  </span>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                  <PartnerList partners={group.partners} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
