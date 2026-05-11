import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function check() {
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'partners' })
  if (error) {
    console.log('RPC failed, trying query')
    const { data: cols, error: err2 } = await supabase.from('partners').select('*').limit(1)
    if (err2) console.error(err2)
    else console.log('Columns:', Object.keys(cols[0] || {}))
  } else {
    console.log(data)
  }
}
check()
