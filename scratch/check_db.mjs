
import { createClient } from '@supabase/supabase-js'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  console.log('Checking partners table...')
  const { data: partners, error: partnersError } = await supabase
    .from('partners')
    .select('*')
    .limit(1)
  
  if (partnersError) {
    console.error('Error selecting from partners:', partnersError)
  } else {
    console.log('Partners table exists. Sample data:', partners)
  }

  console.log('\nChecking branches table...')
  const { data: branches, error: branchesError } = await supabase
    .from('branches')
    .select('*')
    .limit(1)
  
  if (branchesError) {
    console.error('Error selecting from branches:', branchesError)
  } else {
    console.log('Branches table exists. Sample data:', branches)
  }

  console.log('\nChecking storage buckets...')
  const { data: buckets, error: bucketsError } = await supabase
    .storage
    .listBuckets()
  
  if (bucketsError) {
    console.error('Error listing buckets:', bucketsError)
  } else {
    console.log('Buckets:', buckets?.map(b => b.name))
    const logoBucket = buckets?.find(b => b.name === 'partner-logos')
    if (logoBucket) {
      console.log('partner-logos bucket exists and is', logoBucket.public ? 'public' : 'private')
    } else {
      console.warn('partner-logos bucket NOT found')
    }
  }
}

check()
