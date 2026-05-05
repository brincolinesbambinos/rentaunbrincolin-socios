'use client'

import { useEffect } from 'react'

interface Props {
  pixelId: string | null
}

export default function PartnerPixel({ pixelId }: Props) {
  useEffect(() => {
    if (!pixelId) {
      console.log('PartnerPixel: No pixelId provided')
      return
    }
    
    console.log('PartnerPixel: Initializing with ID:', pixelId)
    
    import('react-facebook-pixel').then((module) => {
      const ReactPixel = module.default
      ReactPixel.init(pixelId)
      ReactPixel.pageView()
    })
  }, [pixelId])

  return null
}
