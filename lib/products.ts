import { createClient } from './supabase/server'
import { apiFetch } from './api/client'
import { Product, Category } from '../types'

export async function getAllVisibleProducts(): Promise<Product[]> {
  try {
    const products = await apiFetch<Product[]>('/products')
    if (products && products.length > 0) {
      return products.filter((p) => p.visible === true || p.visible === undefined)
    }
  } catch (error) {
    // Silently continue to direct Supabase
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, name, slug, description, description_extended,
        price, size, width_m, length_m, height_m,
        capacity, min_age, needs_operator,
        image_main, image_gallery, popular, custom_tags,
        category_id,
        categories ( id, name, slug )
      `)
      .eq('visible', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error in fallback fetching all products:', error)
      return []
    }

    return (data || []) as unknown as Product[]
  } catch (err) {
    console.error('Error in fallback fetching all products:', err)
    return []
  }
}

export async function getProductsByBranch(branchId: string): Promise<Product[]> {
  try {
    const products = await apiFetch<Product[]>('/products', {
      branch_id: branchId,
    })
    if (products && products.length > 0) {
      return products.filter((p) => p.visible === true || p.visible === undefined)
    }
  } catch (error) {
    // Silently continue
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, name, slug, description, description_extended,
        price, size, width_m, length_m, height_m,
        capacity, min_age, needs_operator,
        image_main, image_gallery, popular, custom_tags,
        category_id,
        categories ( id, name, slug ),
        branch_id
      `)
      .eq('visible', true)
      .eq('branch_id', branchId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error in fallback fetching products by branch:', error)
      return []
    }

    return (data || []) as unknown as Product[]
  } catch (err) {
    console.error('Error in fallback fetching products by branch:', err)
    return []
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const categories = await apiFetch<Category[]>('/categories')
    if (categories && categories.length > 0) return categories
  } catch (error) {
    // Silently continue
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error in fallback fetching categories:', error)
      return []
    }

    return data as Category[]
  } catch (err) {
    console.error('Error in fallback fetching categories:', err)
    return []
  }
}

export async function getFeaturedProducts(branchId: string, limit: number = 6): Promise<Product[]> {
  try {
    const all = await getProductsByBranch(branchId)
    if (all && all.length > 0) {
      const featured = all.filter((p) => p.popular)
      if (featured.length > 0) {
        const shuffled = [...featured].sort(() => Math.random() - 0.5)
        return shuffled.slice(0, limit)
      }
    }
  } catch (error) {
    // Silently continue
  }

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('products')
      .select(`
        id, name, slug, description, description_extended, price, size,
        capacity, min_age, needs_operator,
        image_main, popular, custom_tags, category_id,
        categories ( id, name, slug ),
        branch_id
      `)
      .eq('visible', true)
      .eq('popular', true)
      .eq('branch_id', branchId)

    if (!data) return []

    // Shuffle aleatorio en cada carga
    const shuffled = [...data].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, limit) as unknown as Product[]
  } catch (err) {
    console.error('Error in fallback fetching featured products:', err)
    return []
  }
}

export async function getProductBySlug(slug: string, branchId: string): Promise<Product | null> {
  try {
    const product = await apiFetch<Product>(`/products/${slug}`, { branch_id: branchId })
    if (product && product.visible !== false) return product
  } catch (error) {
    // continuar a fallback
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, name, slug, description, description_extended,
        price, size, width_m, length_m, height_m, diameter_m,
        capacity, min_age, needs_operator, rental_duration, material,
        party_types, custom_tags, stage,
        image_main, image_gallery, popular, visible,
        category_id, branch_id,
        categories ( id, name, slug )
      `)
      .ilike('slug', slug)
      .eq('branch_id', branchId)
      .eq('visible', true)
      .maybeSingle()

    if (error || !data) return null
    return data as unknown as Product
  } catch (err) {
    return null
  }
}
