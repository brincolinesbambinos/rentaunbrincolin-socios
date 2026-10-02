import { Partner } from '../../types'

export function PartnerHeader({ partner }: { partner: Partner }) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {partner.logo_url ? (
            <img 
              src={partner.logo_url} 
              alt={`Logo de ${partner.name}`}
              className="h-12 w-auto object-contain"
            />
          ) : (
            <div className="h-12 w-12 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-sm" style={{ backgroundColor: 'var(--color-primary)' }}>
              {partner.name.charAt(0)}
            </div>
          )}
          <h1 className="font-bold text-xl text-gray-900 hidden sm:block">
            {partner.name}
          </h1>
        </div>
        
        <div className="flex items-center">
          <a
            href={`https://wa.me/${partner.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium px-5 py-2.5 rounded-xl text-white shadow-sm transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: 'var(--color-secondary)' }}
          >
            Contacto directo
          </a>
        </div>
      </div>
    </header>
  )
}
