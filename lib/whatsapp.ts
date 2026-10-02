import { Partner } from '../types'

export function buildWhatsAppUrl(
  partner: Partner, 
  productName: string,
  branchName?: string,
  overridePhone?: string,
  /** Fecha del evento ya formateada ("sábado 15 de octubre"); se agrega al mensaje */
  eventDate?: string
): string {
  const phone = (overridePhone || partner.whatsapp).replace(/\D/g, "")
  let message = (partner.whatsapp_message ?? "Hola, me interesa rentar el {producto}")
    .replace("{producto}", productName)
    .replace("{sucursal}", branchName ?? "")
  if (eventDate) message += ` para el ${eventDate}`
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
