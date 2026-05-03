import { createClient } from '@/lib/supabase/server'
import { PartnerList } from '@/components/admin/PartnerList'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  
  // Fetch partners including inactive ones for the admin panel
  const { data: partners, error } = await supabase
    .from('partners')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Socios Comerciales</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona los catálogos White-Label y sus sucursales vinculadas.</p>
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
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <PartnerList partners={partners || []} />
        </div>
      )}
    </div>
  )
}
