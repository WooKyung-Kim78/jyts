import type { RouteObject } from 'react-router'

import { LoadingState } from '@/components/feedback/LoadingState'
import { AppLayout } from '@/components/layout/AppLayout'
import { upcomingNavigationItems } from '@/components/layout/navigation'
import { ComingSoonPage } from '@/components/pages/ComingSoonPage'
import { NotFoundPage } from '@/components/pages/NotFoundPage'
import { RouteErrorPage } from '@/components/pages/RouteErrorPage'
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { RequireRole } from '@/features/auth/components/RequireRole'

export const routes: RouteObject[] = [
  {
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <LoadingState fullScreen />,
    children: [
      {
        path: '/login',
        lazy: async () => {
          const { LoginPage } = await import('@/features/auth/pages/LoginPage')
          return { Component: LoginPage }
        },
      },
      {
        path: '/',
        element: (
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        ),
        children: [
          {
            errorElement: <RouteErrorPage />,
            children: [
              {
                index: true,
                lazy: async () => {
                  const { DashboardPage } = await import('@/features/dashboard/pages/DashboardPage')
                  return { Component: DashboardPage }
                },
              },
              {
                path: '/organizations',
                lazy: async () => {
                  const { OrganizationsPage } = await import('@/features/organizations/pages/OrganizationsPage')
                  return { Component: OrganizationsPage }
                },
              },
              {
                path: '/organizations/:organizationId/equipment-history-card',
                lazy: async () => {
                  const { OrganizationEquipmentHistoryCardsPage } = await import('@/features/organizations/pages/OrganizationEquipmentHistoryCardsPage')
                  return { Component: OrganizationEquipmentHistoryCardsPage }
                },
              },
              {
                path: '/equipment',
                lazy: async () => {
                  const { EquipmentPage } = await import('@/features/equipment/pages/EquipmentPage')
                  return { Component: EquipmentPage }
                },
              },
              {
                path: '/equipment/new',
                lazy: async () => {
                  const { EquipmentEditorPage } = await import('@/features/equipment/pages/EquipmentEditorPage')
                  return { Component: () => <EquipmentEditorPage mode="create" /> }
                },
              },
              {
                path: '/equipment/:equipmentId/edit',
                lazy: async () => {
                  const { EquipmentEditorPage } = await import('@/features/equipment/pages/EquipmentEditorPage')
                  return { Component: () => <EquipmentEditorPage mode="edit" /> }
                },
              },
              {
                path: '/equipment/:equipmentId/history-card',
                lazy: async () => {
                  const { EquipmentHistoryCardPage } = await import('@/features/equipment/pages/EquipmentHistoryCardPage')
                  return { Component: EquipmentHistoryCardPage }
                },
              },
              {
                path: '/equipment/:equipmentId/copy',
                lazy: async () => {
                  const { EquipmentEditorPage } = await import('@/features/equipment/pages/EquipmentEditorPage')
                  return { Component: () => <EquipmentEditorPage mode="copy" /> }
                },
              },
              {
                path: '/equipment/master',
                lazy: async () => {
                  const { EquipmentMasterPage } = await import('@/features/equipment/pages/EquipmentMasterPage')
                  return { Component: EquipmentMasterPage }
                },
              },
              {
                path: '/account/password',
                lazy: async () => {
                  const { ChangePasswordPage } = await import('@/features/auth/pages/ChangePasswordPage')
                  return { Component: ChangePasswordPage }
                },
              },
              {
                path: '/inspections',
                lazy: async () => {
                  const { InspectionListPage } = await import('@/features/inspections/pages/InspectionListPage')
                  return { Component: InspectionListPage }
                },
              },
              {
                path: '/inspections/:inspectionId/report',
                lazy: async () => {
                  const { InspectionReportPage } = await import('@/features/inspections/pages/InspectionReportPage')
                  return { Component: InspectionReportPage }
                },
              },
              {
                path: '/inspections/new',
                lazy: async () => {
                  const { InspectionEntryPage } = await import('@/features/inspections/pages/InspectionEntryPage')
                  return { Component: InspectionEntryPage }
                },
              },
              {
                path: '/inspections/:inspectionId',
                lazy: async () => {
                  const { InspectionFormPage } = await import('@/features/inspections/pages/InspectionFormPage')
                  return { Component: InspectionFormPage }
                },
              },
              {
                path: '/inspections/master',
                lazy: async () => {
                  const { InspectionTemplateMasterPage } = await import('@/features/inspections/pages/InspectionTemplateMasterPage')
                  return {
                    Component: () => (
                      <RequireRole roles={['ADMIN']}>
                        <InspectionTemplateMasterPage />
                      </RequireRole>
                    ),
                  }
                },
              },
              {
                path: '/employees',
                lazy: async () => {
                  const { EmployeesPage } = await import('@/features/employees/pages/EmployeesPage')
                  return {
                    Component: () => (
                      <RequireRole roles={['ADMIN']}>
                        <EmployeesPage />
                      </RequireRole>
                    ),
                  }
                },
              },
              ...upcomingNavigationItems.filter(({ to }) => to !== '/organizations').map(({ to, label, roles }) => ({
                path: to,
                element: roles ? (
                  <RequireRole roles={roles}>
                    <ComingSoonPage title={label} />
                  </RequireRole>
                ) : (
                  <ComingSoonPage title={label} />
                ),
              })),
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]
