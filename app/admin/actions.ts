'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function togglePartnerStatus(id: string, currentStatus: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('partners')
    .update({ active: !currentStatus })
    .eq('id', id)

  if (error) {
    console.error('Error toggling status:', error)
    return { error: 'Failed to update status' }
  }

  revalidatePath('/admin')
  revalidatePath('/[partner]', 'page')
  return { success: true }
}

export async function deletePartner(id: string) {
  const supabase = await createClient()
  
  // Arch doc toggle indicates NO full delete, "Activar / Desactivar | Toggle sin borrar el registro"
  // So we will just deactivate.
  const { error } = await supabase
    .from('partners')
    .update({ active: false })
    .eq('id', id)

  if (error) return { error: 'Failed' }
  revalidatePath('/admin')
  return { success: true }
}

export async function savePartner(formData: FormData) {
  const supabase = await createClient()
  
  const id = formData.get('id') as string | null
  const slug = formData.get('slug') as string
  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const whatsapp = formData.get('whatsapp') as string
  const whatsapp_message = formData.get('whatsapp_message') as string
  const primary_color = formData.get('primary_color') as string
  const secondary_color = formData.get('secondary_color') as string
  const branch_id = formData.get('branch_id') as string || null

  let logo_url = undefined

  const file = formData.get('logo_file') as File | null
  if (file && file.size > 0) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${slug}-${Date.now()}.${fileExt}`
    
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Upload image to 'partner-logos' bucket
    const { error: uploadError } = await supabase
      .storage
      .from('partner-logos')
      .upload(fileName, buffer, {
        contentType: file.type,
      })
      
    if (uploadError) {
      console.error('Storage Upload Error:', uploadError)
      return { error: 'No se pudo subir el logo. Verifica que el bucket "partner-logos" exista y sea público.' }
    }
    
    // Get public URL
    const { data: publicUrlData } = supabase
      .storage
      .from('partner-logos')
      .getPublicUrl(fileName)
      
    logo_url = publicUrlData.publicUrl
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    slug,
    name,
    phone,
    whatsapp,
    whatsapp_message,
    primary_color,
    secondary_color,
    branch_id,
    updated_at: new Date().toISOString()
  }

  if (logo_url) {
    payload.logo_url = logo_url
  }

  if (id) {
    const { error } = await supabase.from('partners').update(payload).eq('id', id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('partners').insert([{ ...payload, active: true }])
    if (error) return { error: error.message }
  }

  revalidatePath('/admin')
  return { success: true }
}
