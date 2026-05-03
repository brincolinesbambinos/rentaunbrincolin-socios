'use client'

import { Partner } from '@/types'
import { Link2, MoreVertical, Edit2, Archive, ArchiveRestore } from 'lucide-react'
import { togglePartnerStatus } from '@/app/admin/actions'
import { useState } from 'react'
import Link from 'next/link'

export function PartnerList({ partners }: { partners: Partner[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/${slug}`
    navigator.clipboard.writeText(url)
    // Could add a toast here
    alert('URL copiada al portapapeles: ' + url)
  }

  const handleToggle = async (id: string, currentStatus: boolean) => {
    setLoadingId(id)
    await togglePartnerStatus(id, currentStatus)
    setLoadingId(null)
  }

  if (partners.length === 0) {
    return (
      <div className="text-center py-16">
        <h3 className="text-sm font-medium text-gray-900">No hay socios</h3>
        <p className="mt-1 text-sm text-gray-500">Comienza agregando un nuevo socio comercial.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
          <tr>
            <th className="px-6 py-4 font-semibold">Socio</th>
            <th className="px-6 py-4 font-semibold">URL Slug</th>
            <th className="px-6 py-4 font-semibold">Sucursal (Branch)</th>
            <th className="px-6 py-4 font-semibold">Estado</th>
            <th className="px-6 py-4 font-semibold text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {partners.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  {p.logo_url ? (
                    <img src={p.logo_url} className="w-8 h-8 rounded-full border border-gray-200 object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: p.primary_color }}>
                      {p.name.charAt(0)}
                    </div>
                  )}
                  <div className="font-medium text-gray-900">{p.name}</div>
                </div>
              </td>
              <td className="px-6 py-4 text-gray-500 font-mono text-xs">{p.slug}</td>
              <td className="px-6 py-4 text-gray-500">{p.branch_id ? <span className="font-mono text-xs truncate max-w-[120px] inline-block" title={p.branch_id}>{p.branch_id}</span> : 'Global'}</td>
              <td className="px-6 py-4">
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                  p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {p.active ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => handleCopyLink(p.slug)}
                    className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                    title="Copiar URL"
                  >
                    <Link2 className="w-4 h-4" />
                  </button>
                  <Link 
                    href={`/admin/partners/${p.id}/edit`}
                    className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors inline-block"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Link>
                  <button 
                    onClick={() => handleToggle(p.id, p.active)}
                    disabled={loadingId === p.id}
                    className="p-2 text-gray-400 hover:text-orange-600 rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50"
                    title={p.active ? 'Desactivar catálogo' : 'Activar catálogo'}
                  >
                    {p.active ? <Archive className="w-4 h-4" /> : <ArchiveRestore className="w-4 h-4" />}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
