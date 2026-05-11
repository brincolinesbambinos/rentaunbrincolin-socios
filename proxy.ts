import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  // First, handle Supabase session
  const response = await updateSession(request)
  
  const url = request.nextUrl.clone()
  const pathParts = url.pathname.split('/').filter(Boolean)

  // We are looking for /[partner]/[wX]/...
  if (pathParts.length >= 2) {
    const partner = pathParts[0]
    const maybeWhatsappId = pathParts[1]

    // If it's a whatsapp ID (starts with 'w' followed by digits)
    if (partner !== 'admin' && partner !== 'api' && maybeWhatsappId.match(/^w\d+$/)) {
      const newPathParts = [partner, ...pathParts.slice(2)]
      url.pathname = '/' + newPathParts.join('/')
      url.searchParams.set('active_whatsapp_slug', maybeWhatsappId)
      
      // We must preserve any headers/cookies from updateSession response
      const rewriteResponse = NextResponse.rewrite(url)
      
      // Copy cookies from updateSession response to the rewrite response
      response.cookies.getAll().forEach(cookie => {
        rewriteResponse.cookies.set(cookie.name, cookie.value)
      })
      
      return rewriteResponse
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
