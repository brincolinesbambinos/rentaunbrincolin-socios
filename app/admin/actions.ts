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
  
  const { error } = await supabase
    .from('partners')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Delete Error:', error)
    return { error: `No se pudo eliminar: ${error.message}` }
  }
  revalidatePath('/admin')
  return { success: true }
}

export async function savePartner(formData: FormData) {
  try {
    const supabase = await createClient()
    
    const id = formData.get('id') as string | null
    const slug = formData.get('slug') as string
    const name = formData.get('name') as string
    const phone = formData.get('phone') as string
    const whatsapp = formData.get('whatsapp') as string
    const whatsapp_message = formData.get('whatsapp_message') as string
    const primary_color = formData.get('primary_color') as string
    const secondary_color = formData.get('secondary_color') as string
    const branch_ids_json = formData.get('branch_ids_json') as string
    const branch_ids = branch_ids_json ? JSON.parse(branch_ids_json) : []
    
    const links_json = formData.get('links_json') as string
    const links = links_json ? JSON.parse(links_json) : []
    
    // Fallback: Si no hay branch_id (singular), usamos la primera del array de sucursales
    // Esto es vital para evitar errores de RLS si la política requiere un branch_id válido.
    const branch_id = (formData.get('branch_id') as string) || (branch_ids.length > 0 ? branch_ids[0] : null)

    let logo_url = undefined

    const file = formData.get('logo_file') as File | null
    if (file && file.size > 0) {
      console.log('Uploading file:', file.name, 'size:', file.size)
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
          upsert: true
        })
        
      if (uploadError) {
        console.error('Storage Upload Error:', uploadError)
        return { error: `No se pudo subir el logo: ${uploadError.message}` }
      }
      
      // Get public URL
      const { data: publicUrlData } = supabase
        .storage
        .from('partner-logos')
        .getPublicUrl(fileName)
        
      logo_url = publicUrlData.publicUrl
      console.log('Logo URL generated:', logo_url)
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
      branch_ids,
      links,
      updated_at: new Date().toISOString()
    }

    if (logo_url) {
      payload.logo_url = logo_url
    }

    console.log('Saving partner with payload:', JSON.stringify(payload, null, 2))

    if (id) {
      const { error } = await supabase.from('partners').update(payload).eq('id', id)
      if (error) {
        console.error('Update Error:', error)
        return { error: `Error al actualizar: ${error.message}` }
      }
    } else {
      const { error } = await supabase.from('partners').insert([{ ...payload, active: true }])
      if (error) {
        console.error('Insert Error:', error)
        return { error: `Error al insertar: ${error.message}` }
      }
    }

    revalidatePath('/admin')
    return { success: true }
  } catch (err: any) {
    console.error('Unexpected error in savePartner:', err)
    return { error: `Error inesperado en el servidor: ${err.message || 'Desconocido'}` }
  }
}
