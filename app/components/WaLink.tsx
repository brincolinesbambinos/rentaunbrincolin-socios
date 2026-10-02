'use client'
import { useState, useEffect, type ReactNode, type CSSProperties } from 'react'

// ─── Números hardcodeados Guadalajara ────────────────────────────────────────
const WA_PHONES = ['523318033172', '523320781405', '523323484073']
const STORAGE_KEY = 'bb_wa_session'

/**
 * Elige un número aleatorio al iniciar la sesión y lo mantiene fijo
 * durante toda la visita (sessionStorage). Igual que BB.
 */
export function WaLink({
  children,
  msg = 'Hola, me interesa el programa Business Partner de Brincolines Bambinos. ¿Me pueden dar más información?',
  style,
  className,
}: {
  children: ReactNode
  msg?: string
  style?: CSSProperties
  className?: string
}) {
  // SSR default: primer número (nunca visible, se reemplaza en el cliente)
  const [href, setHref] = useState(
    `https://wa.me/${WA_PHONES[0]}?text=${encodeURIComponent(msg)}`
  )

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      const phone =
        stored && WA_PHONES.includes(stored)
          ? stored
          : (() => {
              const p = WA_PHONES[Math.floor(Math.random() * WA_PHONES.length)]
              sessionStorage.setItem(STORAGE_KEY, p)
              return p
            })()
      setHref(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`)
    } catch {
      // sessionStorage no disponible — se queda con el default
    }
  }, [msg])

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={style} className={className}>
      {children}
    </a>
  )
}
