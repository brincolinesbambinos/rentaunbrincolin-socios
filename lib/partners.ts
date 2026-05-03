import { createClient } from './supabase/server'
import { createStaticClient } from './supabase/static'
import { Partner } from '../types'

export async function getPartnerBySlug(slug: string): Promise<Partner | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('partners')
    .select(`
      *,
      branches (
        id,
        name,
        slug,
        meta_pixel_id,
        currency,
        locale
      )
    `)
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle()

  if (error) {
    console.error('Error fetching partner:', error)
    return null
  }

  return data as Partner
}

export async function getAllActivePartners(): Promise<Partner[]> {
  const supabase = createStaticClient()
  
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('active', true)

  if (error) {
    console.error('Error fetching partners:', error)
    return []
  }

  return data as Partner[]
}
