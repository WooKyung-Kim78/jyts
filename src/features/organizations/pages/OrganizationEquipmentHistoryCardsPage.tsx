import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Printer } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/feedback/LoadingState'
import { getOrganizations } from '../api/organizations'
import { getEquipment } from '@/features/equipment/api/equipment'
import { EquipmentHistoryCardDocument } from '@/features/equipment/pages/EquipmentHistoryCardPage'

export function OrganizationEquipmentHistoryCardsPage() {
  const { organizationId } = useParams()
  const organizations = useQuery({ queryKey: ['organizations'], queryFn: getOrganizations })
  const equipment = useQuery({
    queryKey: ['equipment', organizationId],
    queryFn: () => getEquipment(organizationId ?? ''),
    enabled: Boolean(organizationId),
  })

  if (organizations.isPending || equipment.isPending) {
    return <LoadingState message="고객사 장비이력카드를 불러오는 중입니다…" />
  }

  const organization = organizations.data?.find((item) => item.id === organizationId)
  if (!organization || equipment.isError) {
    return <p role="alert" className="text-sm text-destructive">고객사 장비이력카드를 불러오지 못했습니다.</p>
  }

  const linkedEquipment = equipment.data ?? []

  return (
    <main className="history-print-page customer-equipment-history-cards mx-auto flex w-full max-w-5xl flex-col gap-3 text-slate-900">
      <div className="history-screen-only flex items-center justify-between gap-2">
        <Button asChild variant="outline"><Link to="/organizations"><ArrowLeft aria-hidden="true" />고객사로 돌아가기</Link></Button>
        <Button type="button" onClick={() => window.print()}><Printer aria-hidden="true" />전체 장비이력카드 인쇄</Button>
      </div>
      <header className="history-screen-only flex items-end justify-between border-b border-slate-300 pb-2">
        <div>
          <h1 className="text-xl font-bold">{organization.name} 장비이력카드</h1>
          <p className="mt-1 text-sm text-muted-foreground">연결 장비 {linkedEquipment.length}대</p>
        </div>
      </header>

      {linkedEquipment.length === 0 ? (
        <p className="history-screen-only py-8 text-center text-sm text-muted-foreground">연결된 장비가 없습니다.</p>
      ) : linkedEquipment.map((item, index) => <EquipmentHistoryCardDocument
        key={item.id}
        equipment={{
          ...item,
          organization_name: organization.name,
          organization_contact_name: organization.contact_name,
          organization_contact_phone: organization.contact_phone,
          organization_address: organization.address,
          organization_map_image_url: organization.map_image_url,
        }}
        pageBreakBefore={index > 0}
      />)}
    </main>
  )
}