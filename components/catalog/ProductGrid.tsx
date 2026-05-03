'use client'

import { useState } from 'react'
import { Partner, Product, Category } from '../../types'
import { ProductCard } from './ProductCard'
import { CategoryFilter } from './CategoryFilter'

interface ProductGridProps {
  products: Product[]
  partner: Partner
  categories: Category[]
}

export function ProductGrid({ products, partner, categories }: ProductGridProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filteredProducts = activeCategory
    ? products.filter(p => {
        // En un esquema real, product.category_id o product.category_name se usaría
        // Necesitamos mapear por id si lo tenemos
        return p.category_id === activeCategory
      })
    : products

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          Nuestros Inflables
        </h2>
        <p className="mt-4 text-lg text-gray-600">
          Elige el brincolín perfecto para tu próximo evento
        </p>
      </div>

      <CategoryFilter 
        categories={categories} 
        activeCategory={activeCategory} 
        onSelectCategory={setActiveCategory} 
      />

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8 mt-10">
          {filteredProducts.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              partner={partner} 
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50 rounded-2xl mt-10 border border-gray-100">
          <p className="text-gray-500 text-lg">No se encontraron productos en esta categoría.</p>
          <button 
            onClick={() => setActiveCategory(null)}
            className="mt-4 px-6 py-2 rounded-lg bg-[var(--color-secondary)] text-white font-medium hover:bg-opacity-90 transition-colors"
          >
            Ver todos los inflables
          </button>
        </div>
      )}
    </div>
  )
}
