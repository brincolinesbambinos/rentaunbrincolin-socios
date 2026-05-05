'use client'

import { Product, Partner } from '@/types'
import { buildWhatsAppUrl } from '@/lib/whatsapp'
import { ArrowLeft, MessageCircle, Maximize2, Users, Clock, Ruler } from 'lucide-react'
import Link from 'next/link'

interface Props {
  product: Product
  partner: Partner
  similar: Product[]
  branchName: string
  backUrl: string
}

export default function ProductDetailClient({ product, partner, similar, branchName, backUrl }: Props) {
  const whatsappUrl = buildWhatsAppUrl(partner, product.name, branchName)

  return (
    <div className="min-h-screen bg-[#FDFCF9] pb-20">
      {/* Header / Nav */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href={backUrl} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <span className="font-bold text-gray-900 truncate px-4">{product.name}</span>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-square rounded-3xl overflow-hidden bg-gray-100 border border-gray-100">
            <img src={product.image_main || "/placeholder.png"} alt={product.name} className="w-full h-full object-contain" />
          </div>
          {product.image_gallery && product.image_gallery.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {product.image_gallery.map((img, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden border border-gray-100">
                  <img src={img} alt={`${product.name} ${i}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-[var(--color-secondary)] text-[var(--color-primary)] text-xs font-bold rounded-full uppercase tracking-wider">
                {product.categories?.name || 'Juego'}
              </span>
              {product.popular && (
                <span className="px-3 py-1 bg-orange-100 text-orange-600 text-xs font-bold rounded-full uppercase tracking-wider">
                  Popular 🔥
                </span>
              )}
            </div>
            <h1 className="text-3xl font-black text-gray-900 leading-tight">{product.name}</h1>
            <p className="text-2xl font-bold text-[var(--color-primary)] mt-2">
              ${product.price?.toLocaleString()} <span className="text-sm font-normal text-gray-400">MXN</span>
            </p>
          </div>

          <p className="text-gray-600 leading-relaxed text-lg">
            {product.description_extended || product.description}
          </p>

          {/* Specs Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg"><Ruler className="w-5 h-5 text-indigo-500" /></div>
              <div>
                <span className="block text-[10px] text-gray-400 font-bold uppercase">Medidas</span>
                <span className="text-sm font-bold text-gray-700">{product.width_m}x{product.length_m}x{product.height_m}m</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-3">
              <div className="p-2 bg-green-50 rounded-lg"><Users className="w-5 h-5 text-green-500" /></div>
              <div>
                <span className="block text-[10px] text-gray-400 font-bold uppercase">Capacidad</span>
                <span className="text-sm font-bold text-gray-700">{product.capacity || 'N/A'}</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-3">
              <div className="p-2 bg-blue-50 rounded-lg"><Clock className="w-5 h-5 text-blue-500" /></div>
              <div>
                <span className="block text-[10px] text-gray-400 font-bold uppercase">Renta</span>
                <span className="text-sm font-bold text-gray-700">{product.rental_duration || 'Por evento'}</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-3">
              <div className="p-2 bg-purple-50 rounded-lg"><Maximize2 className="w-5 h-5 text-purple-500" /></div>
              <div>
                <span className="block text-[10px] text-gray-400 font-bold uppercase">Espacio Req.</span>
                <span className="text-sm font-bold text-gray-700">{product.size || 'Estándar'}</span>
              </div>
            </div>
          </div>

          {/* WhatsApp CTA */}
          <a 
            href={whatsappUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-5 bg-[var(--color-primary)] text-white font-bold rounded-2xl shadow-lg shadow-[var(--color-primary)]/20 hover:scale-[1.02] active:scale-95 transition-all text-lg"
          >
            <MessageCircle className="w-6 h-6" />
            Cotizar por WhatsApp
          </a>
        </div>
      </div>

      {/* Similar Products */}
      {similar.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 mt-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Productos Similares</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {similar.map(p => (
              <Link 
                key={p.id} 
                href={backUrl + '/' + p.slug}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="aspect-[4/3] bg-gray-50 overflow-hidden">
                  <img src={p.image_main || "/placeholder.png"} alt={p.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                </div>
                <div className="p-4">
                  <span className="block font-bold text-gray-900 truncate">{p.name}</span>
                  <span className="text-sm font-bold text-[var(--color-primary)]">${p.price?.toLocaleString()}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
