import { NextRequest, NextResponse } from 'next/server'
import { sendCAPIEvent } from '@/lib/meta-capi'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    eventName,
    eventSourceUrl,
    branchSlug,
    contentName,
    contentId,
    contentCategory,
    value,
    currency,
  } = body

  await sendCAPIEvent({
    eventName,
    eventSourceUrl,
    branchSlug,
    userAgent: req.headers.get('user-agent') ?? undefined,
    clientIpAddress: req.headers.get('x-forwarded-for')?.split(',')[0] ?? undefined,
    fbc: req.cookies.get('_fbc')?.value,
    fbp: req.cookies.get('_fbp')?.value,
    contentName,
    contentId,
    contentCategory,
    value,
    currency,
  })

  return NextResponse.json({ ok: true })
}
