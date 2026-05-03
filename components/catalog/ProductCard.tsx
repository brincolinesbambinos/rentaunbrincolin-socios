import { Partner, Product } from '../../types'
import { buildWhatsAppUrl } from '../../lib/whatsapp'
import { MessageCircle } from 'lucide-react'

interface ProductCardProps {
  product: Product
  partner: Partner
}

export function ProductCard({ product, partner }: ProductCardProps) {
  const whatsappUrl = buildWhatsAppUrl(partner, product.name)
  const price = product.final_price ?? product.price

  return (
    <div className="group rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col border border-gray-100 h-full">
      <div className="relative aspect-square overflow-hidden bg-gray-50 p-6 flex items-center justify-center">
        {/* Usando img estándar por simplicidad, en un caso real se usaría next/image si se configuran los dominios */}
        {product.image_main ? (
          <img 
            src={product.image_main} 
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-xl text-gray-400">
            Sin imagen
          </div>
        )}
        
        {product.popular && (
          <div className="absolute top-4 left-4 bg-[var(--color-secondary)] text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">
            Popular
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2 gap-2">
          <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2">
            {product.name}
          </h3>
          <div className="text-right whitespace-nowrap">
            <p className="text-[var(--color-primary)] font-black text-xl">
              ${price}
            </p>
          </div>
        </div>
        
        {product.categories?.name && (
          <p className="text-sm text-gray-500 mb-3">{product.categories?.name}</p>
        )}

        <div className="mt-auto">
          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
            {product.description || 'Brincolín de alta calidad, perfecto para tu evento.'}
          </p>

          {(product.width_m || product.capacity) && (
            <div className="flex flex-wrap gap-2 mb-5">
              {product.width_m && product.length_m && (
                <span className="inline-flex items-center text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                  {product.length_m}x{product.width_m}m
                </span>
              )}
              {product.capacity && (
                <span className="inline-flex items-center text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                  {product.capacity}
                </span>
              )}
            </div>
          )}

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-medium transition-all duration-300 hover:opacity-90 active:scale-95"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <MessageCircle className="w-5 h-5" />
            <span>Consultar disponibilidad</span>
          </a>
        </div>
      </div>
    </div>
  )
}
