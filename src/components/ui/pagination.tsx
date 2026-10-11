import { Button } from './button'

function Pagination({ label, summary, page, lastPage, disabled = false, onChange }: {
  label: string
  summary: string
  page: number
  lastPage: number
  disabled?: boolean
  onChange: (page: number) => void
}) {
  const first = Math.max(1, Math.min(page - 2, lastPage - 4))
  const pages = Array.from({ length: Math.min(5, lastPage) }, (_, index) => first + index)

  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">{summary}</p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>이전</Button>
        {pages.map((number) => (
          <Button
            key={number}
            variant={number === page ? 'default' : 'outline'}
            size="sm"
            aria-label={`${number} 페이지`}
            aria-current={number === page ? 'page' : undefined}
            disabled={disabled}
            onClick={() => onChange(number)}
          >
            {number}
          </Button>
        ))}
        <Button variant="outline" size="sm" disabled={disabled || page >= lastPage} onClick={() => onChange(page + 1)}>다음</Button>
      </div>
    </nav>
  )
}

export { Pagination }
