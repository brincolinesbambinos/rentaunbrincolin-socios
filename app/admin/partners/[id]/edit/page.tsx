import { PartnerForm } from '@/components/admin/PartnerForm'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EditPartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    notFound()
  }

  const { data: branches } = await supabase.from('branches').select('id, name')

  return (
    <div className="p-4 sm:p-8 flex-1">
      <PartnerForm initialData={data} branches={branches || []} />
    </div>
  )
}
