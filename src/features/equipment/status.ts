import type { BadgeTone } from '@/components/ui/badge'
import type { EquipmentStatus } from './api/equipment'

const statusTones: Record<EquipmentStatus, BadgeTone> = {
  ACTIVE: 'success',
  INSPECTION_REQUIRED: 'warning',
  OUT_OF_SERVICE: 'danger',
  DISPOSED: 'neutral',
}

export function equipmentStatusTone(status: EquipmentStatus): BadgeTone {
  return statusTones[status]
}
