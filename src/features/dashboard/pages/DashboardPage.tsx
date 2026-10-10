import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const summaryCards = [
  { title: '장비 현황', description: '고객사별 장비 현황이 표시될 예정입니다.' },
  { title: '정기점검 예정', description: '예정된 정기점검 일정이 표시될 예정입니다.' },
  { title: 'A/S 진행 현황', description: '접수 및 처리 중인 A/S가 표시될 예정입니다.' },
]

export function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          장비, 정기점검 및 A/S 현황을 한눈에 확인합니다.
        </p>
      </div>

      <section aria-label="현황 요약" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map(({ title, description }) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>준비 중 · {description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

    </div>
  )
}
