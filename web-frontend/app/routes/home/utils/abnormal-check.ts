import {
  USE_GLOBAL_VIOLENCE_THRESHOLD,
  VIOLENCE_ASSAULT_CONFIDENCE_THRESHOLD,
  VIOLENCE_FIGHTING_CONFIDENCE_THRESHOLD,
  VIOLENCE_GLOBAL_CONFIDENCE_THRESHOLD,
  VIOLENCE_ROBBERY_CONFIDENCE_THRESHOLD,
  VIOLENCE_SHOOTING_CONFIDENCE_THRESHOLD,
} from '@/constants/violence-detection';
import { type IViolenceEventLabel, type ViolenceEvent, ViolenceEventLabel } from '@/schemas/types';

export function abnormalCheck(event: ViolenceEvent) {
  if (
    !(
      [ViolenceEventLabel.analyzing, ViolenceEventLabel.normal_event] as IViolenceEventLabel[]
    ).includes(event.label)
  ) {
    if (USE_GLOBAL_VIOLENCE_THRESHOLD === true) {
      if (event.confidence > VIOLENCE_GLOBAL_CONFIDENCE_THRESHOLD) return true;
      return false;
    }

    switch (event.label) {
      case 'assault':
        if (event.confidence > VIOLENCE_ASSAULT_CONFIDENCE_THRESHOLD) return true;
        return false;
      case 'fighting':
        if (event.confidence > VIOLENCE_FIGHTING_CONFIDENCE_THRESHOLD) return true;
        return false;
      case 'robbery':
        if (event.confidence > VIOLENCE_ROBBERY_CONFIDENCE_THRESHOLD) return true;
        return false;
      case 'shooting':
        if (event.confidence > VIOLENCE_SHOOTING_CONFIDENCE_THRESHOLD) return true;
        return false;
      default:
        return false;
    }
  }

  return false;
}
