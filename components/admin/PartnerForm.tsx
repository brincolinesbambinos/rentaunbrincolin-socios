'use client'

import { useState, useRef } from 'react'
import { Partner } from '@/types'
import { useRouter } from 'next/navigation'
import { Upload, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { savePartner } from '@/app/admin/actions'

interface PartnerFormProps {
  initialData?: Partner | null
  branches?: { id: string; name: string }[]
}

export function PartnerForm({ initialData, branches = [] }: PartnerFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewLogo, setPreviewLogo] = useState<string | null>(initialData?.logo_url || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const displayUrl = URL.createObjectURL(file)
      setPreviewLogo(displayUrl)
    } else {
      setPreviewLogo(initialData?.logo_url || null)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    if (initialData?.id) {
      formData.append('id', initialData.id)
    }

    try {
      const res = await savePartner(formData)
      if (res.error) {
        setError(res.error)
        setLoading(false)
      } else {
        router.push('/admin')
      }
    } catch (err) {
      setError('Error inesperado al guardar el socio.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin" className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {initialData ? `Editar Socio: ${initialData.name}` : 'Registrar Nuevo Socio'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-8">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        {/* Logo Upload Section */}
        <div className="flex flex-col items-center sm:flex-row gap-6 pb-8 border-b border-gray-100">
          <div 
            className="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {previewLogo ? (
              <img src={previewLogo} alt="Preview" className="w-full h-full object-contain p-2" />
            ) : (
              <div className="text-center p-4">
                <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                <span className="text-xs font-medium text-gray-500">Subir Logo</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
              <span className="text-white text-xs font-medium">Cambiar</span>
            </div>
            <input 
              type="file" 
              name="logo_file" 
              ref={fileInputRef} 
              onChange={handleImageChange}
              accept="image/png, image/jpeg, image/webp" 
              className="hidden" 
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Identidad Visual</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">Sube el logotipo en formato PNG sin fondo o JPG. Tamaño ideal: cuadrado o panorámico pequeño (máximo 2MB).</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Nombre de Empresa *</label>
            <input name="name" required defaultValue={initialData?.name} placeholder="ej. Terraza Cielo Vista" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">SLUG (URL amigable) *</label>
            <input name="slug" required defaultValue={initialData?.slug} placeholder="ej. cielovista" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" />
            <p className="text-xs text-gray-400">Sólo minúsculas, sin espacios (ej. rentas-leon).</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Color Primario (Hex)</label>
            <div className="flex gap-2">
              <input type="color" name="primary_color" defaultValue={initialData?.primary_color || '#1A1A2E'} className="p-1 h-11 w-11 rounded border border-gray-200 cursor-pointer" />
              <input type="text" defaultValue={initialData?.primary_color || '#1A1A2E'} className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" disabled />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Color Secundario (Hex)</label>
            <div className="flex gap-2">
              <input type="color" name="secondary_color" defaultValue={initialData?.secondary_color || '#E8C44A'} className="p-1 h-11 w-11 rounded border border-gray-200 cursor-pointer" />
              <input type="text" defaultValue={initialData?.secondary_color || '#E8C44A'} className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" disabled />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Teléfono Oficina</label>
            <input name="phone" defaultValue={initialData?.phone || ''} placeholder="+52 123 456 7890" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">WhatsApp de Cotizaciones *</label>
            <input name="whatsapp" required defaultValue={initialData?.whatsapp} placeholder="+52 123 456 7890" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" />
          </div>
        </div>

        <div className="space-y-1.5 border-t border-gray-100 pt-8">
          <label className="block text-sm font-medium text-gray-700">Plantilla Mensaje de WhatsApp</label>
          <textarea 
            name="whatsapp_message" 
            rows={3} 
            defaultValue={initialData?.whatsapp_message || 'Hola, me interesa rentar el {producto} para mi evento. ¿Me pueden dar información?'} 
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none" 
          />
          <p className="text-xs text-gray-500">Usa la etiqueta <strong className="text-indigo-600 font-mono">{"{producto}"}</strong> para que se reemplace auto-mágicamente por el nombre del inflable.</p>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div>
            <label className="block text-base font-semibold text-gray-900">Sucursal Asignada</label>
            <p className="text-sm text-gray-500 mt-1">Selecciona a qué inventario estará atado este catálogo de White-Label. Si seleccionas Global, ofrecerá todos los productos.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* Global Option */}
            <label className="relative flex cursor-pointer rounded-xl border bg-white p-4 shadow-sm focus:outline-none has-[:checked]:border-indigo-600 has-[:checked]:ring-1 has-[:checked]:ring-indigo-600 transition-colors border-gray-200 hover:bg-gray-50">
              <input type="radio" name="branch_id" value="" defaultChecked={!initialData?.branch_id} className="sr-only" />
              <span className="flex flex-col">
                <span className="block text-sm font-semibold text-gray-900">Catálogo Global</span>
                <span className="mt-1 flex items-center text-xs text-gray-500">Todos los productos</span>
              </span>
            </label>

            {/* Dynamic Branch Options */}
            {branches.map(branch => (
              <label key={branch.id} className="relative flex cursor-pointer rounded-xl border bg-white p-4 shadow-sm focus:outline-none has-[:checked]:border-indigo-600 has-[:checked]:ring-1 has-[:checked]:ring-indigo-600 transition-colors border-gray-200 hover:bg-gray-50">
                <input type="radio" name="branch_id" value={branch.id} defaultChecked={initialData?.branch_id === branch.id} className="sr-only" />
                <span className="flex flex-col">
                  <span className="block text-sm font-semibold text-gray-900">{branch.name}</span>
                  <span className="mt-1 flex items-center text-xs text-gray-500 font-mono truncate" title={branch.id}>{branch.id.split('-')[0]}...</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-4 flex items-center justify-end border-t border-gray-100">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm disabled:opacity-50 flex items-center"
          >
            {loading ? 'Guardando...' : (initialData ? 'Guardar Cambios' : 'Registrar Socio')}
          </button>
        </div>
      </form>
    </div>
  )
}
