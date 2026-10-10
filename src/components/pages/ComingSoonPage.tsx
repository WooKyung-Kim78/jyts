import { Construction } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type ComingSoonPageProps = {
  title: string
}

export function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="size-5 text-muted-foreground" aria-hidden="true" />
            준비 중
          </CardTitle>
          <CardDescription>{title} 메뉴는 준비 중입니다.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          이후 개발 단계에서 제공될 예정입니다.
        </CardContent>
      </Card>
    </div>
  )
}
