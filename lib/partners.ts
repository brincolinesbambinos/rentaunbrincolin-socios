import { createClient } from './supabase/server'
import { createStaticClient } from './supabase/static'
import { Partner, Branch } from '../types'

export async function getPartnerBySlug(slug: string): Promise<Partner | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('partners')
    .select(`
      *,
      branch_ids,
      branches (
        id,
        name,
        slug,
        meta_pixel_id,
        gtm_id,
        ga_measurement_id,
        whatsapp_display,
        instagram,
        facebook,
        tiktok,
        currency,
        locale
      )
    `)
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle()

  if (error) {
    console.error('Error fetching partner:', JSON.stringify(error, null, 2))
    return null
  }

  return data as Partner
}

export async function getPartnerBranches(branchIds: string[]): Promise<Branch[]> {
  if (!branchIds || branchIds.length === 0) return []
  
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('branches')
    .select('id, name, slug, meta_pixel_id, gtm_id, ga_measurement_id, currency, locale, whatsapp_display')
    .in('id', branchIds)
    .order('name')

  if (error) {
    console.error('Error fetching partner branches:', error)
    return []
  }

  return data as Branch[]
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
