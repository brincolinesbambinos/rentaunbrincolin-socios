import { login } from './actions'
import { Lock } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function LoginPage({ searchParams }: { searchParams: any }) {
  const error = searchParams?.error === 'true'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
          <Lock className="text-white w-6 h-6" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Panel de Control
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Inicia sesión para gestionar el catálogo White-Label
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" action={login}>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">
                Credenciales incorrectas. Verifica tu email o contraseña.
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo electrónico
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                  placeholder="admin@bambinos.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Ingresar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
