// lib/api/client.ts

export async function apiFetch<T>(
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>
): Promise<T | null> {
  try {
    const API_BASE = 'https://admin.rentaunbrincolin.com/api/v1'
    const API_KEY = (process.env.RENTAUNBRINCOLIN_API_KEY ?? '').trim()

    const url = new URL(`${API_BASE}${path}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          url.searchParams.set(key, String(value))
        }
      })
    }

    const res = await fetch(url.toString(), {
      headers: {
        'X-RentaUnBrincolin-Key': API_KEY,
      },
    })

    if (!res.ok) {
      return null
    }

    const json = await res.json()
    return (json.data ?? json) as T
  } catch (error) {
    return null
  }
}
