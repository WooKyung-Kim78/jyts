import { Badge } from '@/components/ui/badge'
import { EQUIPMENT_STATUS_LABELS, type EquipmentStatus } from '../api/equipment'
import { equipmentStatusTone } from '../status'

export function EquipmentStatusBadge({ status, className }: { status: EquipmentStatus; className?: string }) {
  return <Badge tone={equipmentStatusTone(status)} dot className={className}>{EQUIPMENT_STATUS_LABELS[status]}</Badge>
}
