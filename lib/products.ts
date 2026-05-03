import { createClient } from './supabase/server'
import { Product, Category } from '../types'

export async function getAllVisibleProducts(): Promise<Product[]> {
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
    console.error('Error fetching all products:', error)
    return []
  }

  return (data || []) as unknown as Product[]
}

export async function getProductsByBranch(branchId: string): Promise<Product[]> {
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
    console.error('Error fetching products by branch:', error)
    return []
  }

  return (data || []) as unknown as Product[]
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching categories:', error)
    return []
  }

  return data as Category[]
}

export async function getFeaturedProducts(branchId: string, limit: number = 6): Promise<Product[]> {
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
}
