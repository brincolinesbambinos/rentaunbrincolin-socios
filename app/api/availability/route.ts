import { NextResponse } from 'next/server'

/**
 * Disponibilidad por fecha (proxy server-to-server a RentaUnBrincolin).
 * GET /api/availability?branch_id=…&date=YYYY-MM-DD
 * → [{ product_id, available, stock_remaining }]
 * La API key nunca llega al navegador. Mismo endpoint que usa el sitio de
 * Bambinos (brincolinesbambinos: src/app/api/availability/route.ts).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get('branch_id')
  const date = searchParams.get('date')
  if (!branchId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Faltan branch_id o date (YYYY-MM-DD)' }, { status: 400 })
  }

  const API_BASE = 'https://admin.rentaunbrincolin.com/api/v1'
  const API_KEY = (process.env.RENTAUNBRINCOLIN_API_KEY ?? '').trim()
  const url = new URL(`${API_BASE}/availability`)
  url.searchParams.set('branch_id', branchId)
  url.searchParams.set('date', date)
  url.searchParams.set('apiKey', API_KEY)

  try {
    const res = await fetch(url.toString(), {
      headers: { 'X-RentaUnBrincolin-Key': API_KEY },
      cache: 'no-store',
    })
    if (!res.ok) {
      return NextResponse.json({ error: `RentaUnBrincolin respondió ${res.status}` }, { status: 502 })
    }
    const json = await res.json()
    return NextResponse.json(json?.data ?? json ?? [])
  } catch (e) {
    console.error('[api/availability]', e)
    return NextResponse.json({ error: 'No se pudo consultar la disponibilidad' }, { status: 502 })
  }
}
