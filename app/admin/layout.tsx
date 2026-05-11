import { ReactNode } from 'react'
import { logout } from './login/actions'
import { LayoutDashboard, Users, LogOut, Package } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <Package className="w-6 h-6 text-indigo-600 mr-2" />
          <span className="font-bold text-gray-900 text-lg">WhiteLabel CMS</span>
        </div>
        
        <div className="flex-1 py-6 px-4 space-y-1">
          <Link href="/admin" className="flex items-center px-3 py-2.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium group transition-colors">
            <Users className="w-5 h-5 mr-3" />
            Catálogos y Socios
          </Link>
          <a href="/" target="_blank" className="flex items-center px-3 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg text-sm font-medium group transition-colors">
            <LayoutDashboard className="w-5 h-5 mr-3 text-gray-400 group-hover:text-gray-500" />
            Ver Portal Home
          </a>
        </div>

        <div className="p-4 border-t border-gray-100">
          <form action={logout}>
            <button type="submit" className="w-full flex items-center px-3 py-2 text-gray-600 hover:bg-red-50 hover:text-red-700 rounded-lg text-sm font-medium transition-colors group">
              <LogOut className="w-5 h-5 mr-3 text-gray-400 group-hover:text-red-500" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header -> TODO: Add mobile menu if needed, keeping simple for now */}
        <header className="h-16 bg-white border-b border-gray-200 flex md:hidden items-center px-4 justify-between">
          <div className="flex items-center">
            <Package className="w-5 h-5 text-indigo-600 mr-2" />
            <span className="font-bold text-gray-900">WhiteLabel CMS</span>
          </div>
          <form action={logout}>
            <button type="submit" className="text-gray-500 hover:text-red-600 text-sm font-medium">Salir</button>
          </form>
        </header>

        <main className="flex-1 overflow-auto bg-gray-50/50">
          {children}
        </main>
      </div>
    </div>
  )
}
