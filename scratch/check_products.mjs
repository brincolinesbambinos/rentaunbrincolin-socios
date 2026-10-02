
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data: products } = await supabase
    .from('products')
    .select('id, name, min_age, custom_tags, party_types')
    .limit(10)
  
  console.log(JSON.stringify(products, null, 2))
}

check()
