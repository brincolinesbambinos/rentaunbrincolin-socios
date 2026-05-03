import { Partner } from '../types'

export function buildWhatsAppUrl(partner: Partner, productName: string): string {
  const phone = partner.whatsapp.replace(/\D/g, "")
  const message = (partner.whatsapp_message ?? "Hola, me interesa rentar el {producto}")
    .replace("{producto}", productName)
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
