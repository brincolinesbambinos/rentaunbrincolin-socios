import { Partner } from '../types'

export function buildWhatsAppUrl(
  partner: Partner, 
  productName: string,
  branchName?: string,
  overridePhone?: string
): string {
  const phone = (overridePhone || partner.whatsapp).replace(/\D/g, "")
  const message = (partner.whatsapp_message ?? "Hola, me interesa rentar el {producto}")
    .replace("{producto}", productName)
    .replace("{sucursal}", branchName ?? "")
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
