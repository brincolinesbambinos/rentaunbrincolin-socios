import { EventRequest, UserData, CustomData, ServerEvent } from 'facebook-nodejs-business-sdk'

function getCapiToken(branchSlug: string | null | undefined): string {
  const tokens: Record<string, string> = {
    'guadalajara': process.env.META_CAPI_TOKEN_GDL ?? '',
    'monterrey':   process.env.META_CAPI_TOKEN_MTY ?? '',
    'leon':        process.env.META_CAPI_TOKEN_LEON ?? '',
    'los-angeles': process.env.META_CAPI_TOKEN_LA ?? '',
  }
  return tokens[branchSlug ?? ''] ?? ''
}

function getPixelId(branchSlug: string | null | undefined): string {
  const pixels: Record<string, string> = {
    'guadalajara': process.env.META_PIXEL_GDL ?? '',
    'monterrey':   process.env.META_PIXEL_MTY ?? '',
    'leon':        process.env.META_PIXEL_LEON ?? '',
    'los-angeles': process.env.META_PIXEL_LA ?? '',
  }
  return pixels[branchSlug ?? ''] ?? ''
}

interface CAPIEventParams {
  eventName: 'PageView' | 'ViewContent' | 'Contact' | 'Lead'
  eventSourceUrl: string
  branchSlug?: string | null
  userAgent?: string
  clientIpAddress?: string
  fbc?: string
  fbp?: string
  contentName?: string
  contentId?: string
  contentCategory?: string
  value?: number
  currency?: string
}

export async function sendCAPIEvent(params: CAPIEventParams) {
  const pixelId = getPixelId(params.branchSlug)
  const accessToken = getCapiToken(params.branchSlug)

  if (!pixelId || !accessToken) {
    console.warn('CAPI: no pixel/token for branch', params.branchSlug)
    return
  }

  try {
    const userData = new UserData()
    if (params.clientIpAddress) userData.setClientIpAddress(params.clientIpAddress)
    if (params.userAgent) userData.setClientUserAgent(params.userAgent)
    if (params.fbc) userData.setFbc(params.fbc)
    if (params.fbp) userData.setFbp(params.fbp)

    const customData = new CustomData()
    if (params.contentName) customData.setContentName(params.contentName)
    if (params.contentId) customData.setContentIds([params.contentId])
    if (params.contentCategory) customData.setContentCategory(params.contentCategory)
    if (params.value) customData.setValue(params.value)
    customData.setCurrency(params.currency ?? 'MXN')

    const serverEvent = new ServerEvent()
    serverEvent.setEventName(params.eventName)
    serverEvent.setEventTime(Math.floor(Date.now() / 1000))
    serverEvent.setEventSourceUrl(params.eventSourceUrl)
    serverEvent.setActionSource('website')
    serverEvent.setUserData(userData)
    serverEvent.setCustomData(customData)

    const eventRequest = new EventRequest(accessToken, pixelId)
    eventRequest.setEvents([serverEvent])
    await eventRequest.execute()
  } catch (error) {
    console.error('CAPI error:', error)
    // No lanzar — un fallo de tracking no debe romper la página
  }
}
