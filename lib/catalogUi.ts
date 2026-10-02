import { Bricolage_Grotesque } from "next/font/google"
import type { Product } from "@/types"

/** Tipografía de títulos del catálogo (diseño B "fichas") */
export const displayFont = Bricolage_Grotesque({ subsets: ["latin"], weight: ["800"], display: "swap" })

/** Tinta (bordes, sombras y texto) y fondo papel del diseño B */
export const INK = "#1A1A2E"
export const PAPER = "#FFFBEF"
export const MUTED = "#4B4558"
export const FREE_BG = "#B8F0AE"
export const TAKEN_BG = "#E5E2DA"
export const WA_BG = "#25D366"
export const WA_TEXT = "#0B3B1E"

export const CAT_COLORS: Record<string, { bg: string; light: string; text: string; emoji: string }> = {
  "Acuático":    { bg: "#0EA5E9", light: "#E0F2FE", text: "#075985", emoji: "🌊" },
  "Clásico":     { bg: "#8B5CF6", light: "#EDE9FE", text: "#5B21B6", emoji: "🏰" },
  "Destreza":    { bg: "#16A34A", light: "#DCFCE7", text: "#166534", emoji: "🎯" },
  "Interactivo": { bg: "#3B82F6", light: "#DBEAFE", text: "#1E40AF", emoji: "⚡" },
  "Mecánico":    { bg: "#F97316", light: "#FEF3C7", text: "#92400E", emoji: "🤠" },
  "Personajes":  { bg: "#EF4444", light: "#FEE2E2", text: "#991B1B", emoji: "🦸" },
  "Princesas":   { bg: "#EC4899", light: "#FCE7F3", text: "#9D174D", emoji: "👑" },
  "Variedad":    { bg: "#EAB308", light: "#FEF9C3", text: "#854D0E", emoji: "🎉" },
}
export const catColors = (name: string) => CAT_COLORS[name] || { bg: "#6B7280", light: "#F3F4F6", text: "#374151", emoji: "🎪" }

export const fmtPrice = (n: number | null | undefined) => `$${(n ?? 0).toLocaleString("es-MX")}`

/** "YYYY-MM-DD" de hoy en hora de Ciudad de México */
export const todayCdmx = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" })

const asDate = (day: string) => new Date(`${day}T12:00:00-06:00`)

/** "sábado 3 de octubre" */
export const longDate = (day: string) =>
  asDate(day).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Mexico_City" })

/** "Sáb 3 oct" */
export const shortDate = (day: string) => {
  const d = asDate(day)
  const wd = d.toLocaleDateString("es-MX", { weekday: "short", timeZone: "America/Mexico_City" }).replace(/[.,]/g, "")
  const mo = d.toLocaleDateString("es-MX", { month: "short", timeZone: "America/Mexico_City" }).replace(/[.,]/g, "")
  const dd = d.toLocaleDateString("es-MX", { day: "numeric", timeZone: "America/Mexico_City" })
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${dd} ${mo}`
}

const num = (n: number | null | undefined) => (n == null ? null : Number(n).toLocaleString("es-MX", { maximumFractionDigits: 1 }))

/** "18 × 4 m" (ancho × largo); null si no hay medidas */
export const footprint = (p: Product) => {
  const w = num(p.width_m), l = num(p.length_m)
  if (w && l) return `${w} × ${l} m`
  const d = num((p as Product & { diameter_m?: number | null }).diameter_m)
  return d ? `⌀ ${d} m` : null
}

/** "18 × 4 × 5 m" (ancho × largo × alto) */
export const fullDims = (p: Product) => {
  const base = footprint(p)
  const h = num(p.height_m)
  if (!base) return h ? `${h} m de alto` : null
  return h && !base.startsWith("⌀") ? base.replace(" m", ` × ${h} m`) : base
}

/** Cupo legible: "8" → "Hasta 8" */
export const capacityText = (c: string | null) => (!c ? null : /^\d+$/.test(c.trim()) ? `Hasta ${c.trim()}` : c)
