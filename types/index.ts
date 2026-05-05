export interface Category {
  id: string
  name: string
  name_en: string | null
  slug: string
  description: string | null
  sort_order: number
}

export interface Branch {
  id: string
  name: string
  slug: string
  meta_pixel_id: string | null
  gtm_id: string | null
  ga_measurement_id: string | null
  whatsapp_display: string | null
  instagram: string | null
  facebook: string | null
  tiktok: string | null
  tracking?: {
    meta_pixel_id: string | null
    gtm_id: string | null
    ga_measurement_id: string | null
  }
  contact?: {
    whatsapp: string | null
    instagram: string | null
  }
  currency: string
  locale: string
}

export interface Partner {
  id: string
  slug: string
  name: string
  logo_url: string | null
  phone: string | null
  whatsapp: string
  whatsapp_message: string | null
  address: string | null
  primary_color: string
  secondary_color: string
  branch_id: string | null
  branch_ids: string[]
  branches: Branch | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  bambinos_id: string | null
  sort_order: number
  name: string
  name_en: string | null
  slug: string
  slug_en: string | null
  description: string | null
  description_extended: string | null
  description_en: string | null
  price: number | null
  final_price?: number | null
  size: string | null
  width_m: number | null
  length_m: number | null
  height_m: number | null
  diameter_m: number | null
  capacity: string | null
  min_age: string | null
  needs_operator: boolean
  rental_duration: string | null
  material: string | null
  party_types: string[]
  custom_tags: string[]
  category_id: string | null
  branch_id: string | null
  categories: Category | null
  visible: boolean
  launch_date: string | null
  popular: boolean
  stock: number
  image_main: string | null
  image_gallery: string[] | null
  stage?: string[]
  created_at: string
  updated_at: string
}
