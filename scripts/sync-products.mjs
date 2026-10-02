import { createClient } from '@supabase/supabase-js'

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTAY5D5d4xvrl62FUK8pJ9TmOMmUEwLFfyr_ppDYjpAP2NmsALedLDKcVcQfNdXuQf4aBJJfU8OwaLy/pub?gid=1694077104&single=true&output=csv'

const SUPABASE_URL     = 'https://qsicmaprkrqpotrlcrmq.supabase.co'
const SUPABASE_SERVICE_KEY = 'PEGAR_SERVICE_ROLE_KEY_AQUI'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ── Mapas de código → UUID (se llenan dinámicamente) ──────────────────────────
const BRANCH_CODE_MAP   = { '101': null, '102': null, '103': null, '104': null, '999': null }
const CATEGORY_CODE_MAP = { '111': null, '222': null, '333': null, '444': null, '555': null, '666': null, '777': null, '888': null }

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseBambinosId(id) {
  if (!id) return {}
  const s = id.toString().trim()
  return {
    branchCode:    s.substring(0, 3),
    categoryCode:  s.substring(3, 6),
    productNumber: s.substring(6),
  }
}

function parsePrice(val) {
  return val ? parseFloat(val.replace(/[$,\s]/g, '')) || null : null
}

function parseNum(val) {
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

function parseBool(val) {
  const v = (val ?? '').toString().trim().toUpperCase()
  return v === 'TRUE' || v === 'SI' || v === 'SÍ' || v === '1'
}

function parseTags(val) {
  return val ? val.split(',').map(s => s.trim()).filter(Boolean) : []
}

function parseGallery(...urls) {
  return urls.map(u => u?.trim()).filter(Boolean)
}

function generateSlug(name, branchCode) {
  const branchSuffix = { '101': 'gdl', '102': 'mty', '103': 'leon', '104': 'la', '999': 'mx' }
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + (branchSuffix[branchCode] ?? 'mx')
}

// ── Script principal ──────────────────────────────────────────────────────────
async function main() {
  console.log('🔄 Iniciando sincronización...\n')

  // 1. Cargar y mapear branches
  const { data: branches } = await supabase.from('branches').select('id, slug')
  const branchSlugToCode = {
    'guadalajara': '101', 'monterrey': '102',
    'leon': '103', 'los-angeles': '104',
  }
  branches?.forEach(b => {
    const code = branchSlugToCode[b.slug]
    if (code) BRANCH_CODE_MAP[code] = b.id
  })
  console.log('✅ Branches:', Object.entries(BRANCH_CODE_MAP).map(([k,v]) => `${k}=${v ? '✓' : '✗'}`).join(' '))

  // 2. Cargar y mapear categorías
  const { data: categories } = await supabase.from('categories').select('id, slug')
  const catSlugToCode = {
    'acuatico': '111', 'clasico': '222', 'destreza': '333', 'interactivo': '444',
    'mecanico': '555', 'personajes': '666', 'princesas': '777', 'variedad': '888',
  }
  categories?.forEach(c => {
    const code = catSlugToCode[c.slug]
    if (code) CATEGORY_CODE_MAP[code] = c.id
  })
  console.log('✅ Categorías:', Object.entries(CATEGORY_CODE_MAP).map(([k,v]) => `${k}=${v ? '✓' : '✗'}`).join(' '))

  // 3. Descargar CSV
  console.log('\n📥 Descargando CSV...')
  const res = await fetch(SHEET_URL)
  const csvText = await res.text()
  const lines = csvText.split('\n').filter(l => l.trim())
  const sep = lines[0].includes('\t') ? '\t' : ','
  const headers = lines[0].split(sep).map(h => h.trim().replace(/"/g, ''))
  const rows = lines.slice(1).map(line => {
    const vals = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''))
    const row = {}
    headers.forEach((h, i) => { row[h] = vals[i] || '' })
    return row
  }).filter(r => r['Nombre']?.trim() && r['BambinosID']?.trim())

  console.log(`✅ ${rows.length} productos en el CSV\n`)

  // 4. Procesar
  let ok = 0, errors = 0

  for (const row of rows) {
    const bambinosId = row['BambinosID']?.trim()
    const { branchCode, categoryCode } = parseBambinosId(bambinosId)
    const branchId   = BRANCH_CODE_MAP[branchCode] ?? null
    const categoryId = CATEGORY_CODE_MAP[categoryCode] ?? null
    const nombre     = row['Nombre']?.trim()

    if (!branchId)   console.warn(`  ⚠️  Branch no encontrada: código ${branchCode} (${bambinosId})`)
    if (!categoryId) console.warn(`  ⚠️  Categoría no encontrada: código ${categoryCode} (${bambinosId})`)

    const { error } = await supabase
      .from('products')
      .upsert({
        bambinos_id:          bambinosId,
        sort_order:           parseInt(row['Orden']) || 0,
        name:                 nombre,
        slug:                 generateSlug(nombre, branchCode),
        description:          row['Descripción']?.trim() || null,
        description_extended: row['Operación y Requerimientos']?.trim() || null,
        price:                parsePrice(row['Precio']),
        size:                 row['Tamaño']?.trim() || null,
        width_m:              parseNum(row['Ancho']),
        length_m:             parseNum(row['Largo']),
        height_m:             parseNum(row['Alto']),
        diameter_m:           parseNum(row['Diametro']),
        capacity:             row['Participantes']?.trim() || null,
        min_age:              row['Rango_edad']?.trim() || null,
        needs_operator:       parseBool(row['Operador']),
        rental_duration:      row['Duracion']?.trim() || null,
        custom_tags:          parseTags(row['Etapa']),
        category_id:          categoryId,
        branch_id:            branchId,
        visible:              parseBool(row['mostrar en sitio']),
        stock:                parseInt(row['Inventario']) || 1,
        image_main:           row['Imagen']?.trim() || null,
        image_gallery:        parseGallery(row['Imagen_1'], row['Imagen_2'], row['Imagen_3'], row['Imagen_4'], row['Imagen_5']),
        popular:              parseBool(row['Popular']),
        launch_date:          row['Fecha Lanzamiento']?.trim() || null,
      }, { onConflict: 'bambinos_id' })

    if (error) {
      console.error(`❌ ${nombre} (${bambinosId}):`, error.message)
      errors++
    } else {
      console.log(`✅ ${nombre} (${bambinosId})`)
      ok++
    }
  }

  console.log('\n─────────────────────────────')
  console.log(`✅ Procesados: ${ok}`)
  console.log(`❌ Errores:    ${errors}`)
  console.log('─────────────────────────────\n')
}

main().catch(err => {
  console.error('Error fatal:', err)
  process.exit(1)
})
