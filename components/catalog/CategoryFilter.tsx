import { Category } from '../../types'

interface CategoryFilterProps {
  categories: Category[]
  activeCategory: string | null
  onSelectCategory: (categoryId: string | null) => void
}

export function CategoryFilter({ categories, activeCategory, onSelectCategory }: CategoryFilterProps) {
  if (!categories || categories.length === 0) return null

  return (
    <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar snap-x justify-center">
      <button
        onClick={() => onSelectCategory(null)}
        className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 snap-center ${
          activeCategory === null
            ? 'bg-[var(--color-primary)] text-white shadow-md'
            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
        }`}
      >
        Todos
      </button>

      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 snap-center ${
            activeCategory === category.id
              ? 'bg-[var(--color-primary)] text-white shadow-md'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  )
}
