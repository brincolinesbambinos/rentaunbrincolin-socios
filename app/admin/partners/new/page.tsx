import { PartnerForm } from '@/components/admin/PartnerForm'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function NewPartnerPage() {
  const supabase = await createClient()
  const { data: branches } = await supabase.from('branches').select('id, name')

  return (
    <div className="p-4 sm:p-8 flex-1">
      <PartnerForm branches={branches || []} />
    </div>
  )
}
