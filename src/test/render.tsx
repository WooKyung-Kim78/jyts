import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'

import { AuthContext, type AuthContextValue } from '@/features/auth/hooks/useAuth'
import { createQueryClient } from '@/lib/query-client'
import { routes } from '@/routes'
import { activeAuth } from './auth'

type RenderRouteOptions = {
  routeObjects?: RouteObject[]
  auth?: AuthContextValue
}

export function renderRoute(path: string, { routeObjects = routes, auth = activeAuth() }: RenderRouteOptions = {}) {
  const router = createMemoryRouter(routeObjects, { initialEntries: [path] })

  return {
    router,
    auth,
    ...render(
      <QueryClientProvider client={createQueryClient()}>
        <AuthContext.Provider value={auth}>
          <RouterProvider router={router} />
        </AuthContext.Provider>
      </QueryClientProvider>,
    ),
  }
}
