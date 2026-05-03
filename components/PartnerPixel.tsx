'use client'

import { useEffect } from 'react'

interface Props {
  pixelId: string | null
}

export default function PartnerPixel({ pixelId }: Props) {
  useEffect(() => {
    if (!pixelId) return
    import('react-facebook-pixel').then((module) => {
      const ReactPixel = module.default
      ReactPixel.init(pixelId)
      ReactPixel.pageView()
    })
  }, [pixelId])

  return null
}
