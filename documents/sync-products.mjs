// scripts/sync-products.mjs
// Ejecutar con: node scripts/sync-products.mjs

import { createClient } from '@supabase/supabase-js'

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTAY5D5d4xvrl62FUK8pJ9TmOMmUEwLFfyr_ppDYjpAP2NmsALedLDKcVcQfNdXuQf4aBJJfU8OwaLy/pub?gid=1694077104&single=true&output=csv'

// ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://qsicmaprkrqpotrlcrmq.supabase.co'
const SUPABASE_SERVICE_KEY = 'PEGAR_SERVICE_ROLE_KEY_AQUI' // Settings → API → service_role key

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function parsePrice(val) {
  if (!val) return null
  return parseFloat(val.replace(/[$,\s]/g, '')) || null
}

function parseFloat2(val) {
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

function parseBool(val) {
  if (!val) return false
  const v = val.toString().trim().toUpperCase()
  return v === 'TRUE' || v === 'SI' || v === 'SÍ' || v === '1'
}

function parseCustomTags(val) {
  if (!val) return []
  return val.split(',').map(s => s.trim()).filter(Boolean)
}

function parseGallery(...urls) {
  return urls.map(u => u?.trim()).filter(Boolean)
}

function parseCSV(text) {
  const lines = text.split('\n')
  const headers = lines[0].split('\t').map(h => h.trim())
  
  // Intentar detectar separador (tab vs comma)
  const sep = headers.length > 1 ? '\t' : ','
  const realHeaders = lines[0].split(sep).map(h => h.trim().replace(/"/g, ''))

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''))
    const row = {}
    realHeaders.forEach((h, i) => { row[h] = values[i] || '' })
    return row
  })
}

// ─── SCRIPT PRINCIPAL ─────────────────────────────────────────────────────────
async function main() {
  console.log('🔄 Iniciando sincronización...\n')

  // 1. Cargar datos de referencia de Supabase
  console.log('📦 Cargando sucursales y categorías de Supabase...')

  const { data: branches } = await supabase
    .from('branches')
    .select('id, name, slug')

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')

  if (!branches || !categories) {
    console.error('❌ No se pudieron cargar branches o categories')
    process.exit(1)
  }

  // Mapas de lookup por nombre
  const branchByName = {}
  branches.forEach(b => {
    branchByName[b.name.toLowerCase()] = b
    branchByName[b.slug.toLowerCase()] = b
  })

  const categoryByName = {}
  categories.forEach(c => {
    categoryByName[c.name.toLowerCase()] = c
    // Normalizar nombres comunes del CSV
    categoryByName['mecánicos'] = c.name.toLowerCase() === 'mecánico' ? c : categoryByName['mecánicos']
    categoryByName['mecanicos'] = categoryByName['mecánicos']
  })
  // Re-mapear con nombres exactos del CSV
  categories.forEach(c => {
    categoryByName[c.name.toLowerCase()] = c
  })

  console.log(`✅ ${branches.length} sucursales, ${categories.length} categorías cargadas`)
  console.log('   Sucursales:', branches.map(b => b.name).join(', '))
  console.log('   Categorías:', categories.map(c => c.name).join(', '))

  // 2. Descargar CSV
  console.log('\n📥 Descargando CSV...')
  const res = await fetch(SHEET_URL)
  const csvText = await res.text()

  // Detectar separador
  const firstLine = csvText.split('\n')[0]
  const sep = firstLine.includes('\t') ? '\t' : ','

  // Parsear CSV manualmente (sin dependencias)
  const lines = csvText.split('\n').filter(l => l.trim())
  const headers = lines[0].split(sep).map(h => h.trim().replace(/"/g, ''))

  const rows = lines.slice(1).map(line => {
    const values = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''))
    const row = {}
    headers.forEach((h, i) => { row[h] = values[i] || '' })
    return row
  }).filter(r => r['Nombre']?.trim())

  console.log(`✅ ${rows.length} productos encontrados en el CSV`)

  // 3. Procesar cada fila
  let created = 0, updated = 0, errors = 0

  for (const row of rows) {
    const nombre = row['Nombre']?.trim()
    if (!nombre) continue

    // Buscar branch
    const sucursalNombre = row['Sucursal']?.trim().toLowerCase()
    const branch = branchByName[sucursalNombre]
    if (!branch) {
      console.warn(`⚠️  Sucursal no encontrada: "${row['Sucursal']}" (producto: ${nombre})`)
    }

    // Buscar category
    const categoriaNombre = row['Categoría']?.trim().toLowerCase()
    const category = categoryByName[categoriaNombre]
    if (!category) {
      console.warn(`⚠️  Categoría no encontrada: "${row['Categoría']}" (producto: ${nombre})`)
    }

    // Construir slug
    const slug = nombre
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + (branch?.slug ?? 'mx')

    // Galería de imágenes
    const gallery = parseGallery(
      row['Imagen_1'], row['Imagen_2'], row['Imagen_3'],
      row['Imagen_4'], row['Imagen_5']
    )

    // Datos del producto
    const productData = {
      bambinos_id:          row['BambinosID']?.trim() || null,
      sort_order:           parseInt(row['Orden']) || 0,
      name:                 nombre,
      slug:                 slug,
      description:          row['Descripción']?.trim() || null,
      description_extended: row['Operación y Requerimientos']?.trim() || null,
      price:                parsePrice(row['Precio']),
      size:                 row['Tamaño']?.trim() || null,
      width_m:              parseFloat2(row['Ancho']),
      length_m:             parseFloat2(row['Largo']),
      height_m:             parseFloat2(row['Alto']),
      diameter_m:           parseFloat2(row['Diametro']),
      capacity:             row['Participantes']?.trim() || null,
      min_age:              row['Rango_edad']?.trim() || null,
      needs_operator:       parseBool(row['Operador']),
      rental_duration:      row['Duracion']?.trim() || null,
      custom_tags:          parseCustomTags(row['Etapa']),
      category_id:          category?.id ?? null,
      branch_id:            branch?.id ?? null,
      visible:              parseBool(row['mostrar en sitio']),
      stock:                parseInt(row['Inventario']) || 1,
      image_main:           row['Imagen']?.trim() || null,
      image_gallery:        gallery,
      popular:              parseBool(row['Popular']),
      launch_date:          row['Fecha Lanzamiento']?.trim() || null,
    }

    // Upsert en products (usando bambinos_id como clave única)
    const { data: upserted, error: upsertError } = await supabase
      .from('products')
      .upsert(productData, { onConflict: 'bambinos_id' })
      .select('id')
      .single()

    if (upsertError) {
      console.error(`❌ Error en "${nombre}":`, upsertError.message)
      errors++
      continue
    }

    const productId = upserted?.id

    // Upsert en product_branches
    if (productId && branch) {
      await supabase
        .from('product_branches')
        .upsert({
          product_id: productId,
          branch_id:  branch.id,
          available:  parseBool(row['Disponibilidad'] === 'in stock' ? 'true' : row['Disponibilidad']),
          stock:      parseInt(row['Inventario']) || 1,
          price_override: null,
        }, { onConflict: 'product_id,branch_id' })
    }

    // Determinar si fue creado o actualizado
    const wasNew = !row['bambinos_id']
    wasNew ? created++ : updated++

    process.stdout.write(`✅ ${nombre}\n`)
  }

  // 4. Resumen
  console.log('\n─────────────────────────────────')
  console.log(`✅ Completado`)
  console.log(`   Procesados: ${rows.length}`)
  console.log(`   Errores:    ${errors}`)
  console.log('─────────────────────────────────\n')
}

main().catch(err => {
  console.error('Error fatal:', err)
  process.exit(1)
})
