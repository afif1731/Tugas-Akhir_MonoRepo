import { ViolenceDetectionConfig } from '@/constants/violence-detection';
import { type ViolenceEvent, ViolenceEventLabel } from '@/schemas/types';

export function abnormalCheck(event: ViolenceEvent) {
  if (
    event.label !== ViolenceEventLabel.analyzing &&
    event.label !== ViolenceEventLabel.normal_event
  ) {
    if (ViolenceDetectionConfig.USE_GLOBAL_VIOLENCE_THRESHOLD) {
      if (event.confidence > ViolenceDetectionConfig.VIOLENCE_GLOBAL_CONFIDENCE_THRESHOLD)
        return true;
      return false;
    }

    switch (event.label) {
      case 'assault':
        if (event.confidence > ViolenceDetectionConfig.VIOLENCE_ASSAULT_CONFIDENCE_THRESHOLD)
          return true;
        return false;
      case 'fighting':
        if (event.confidence > ViolenceDetectionConfig.VIOLENCE_FIGHTING_CONFIDENCE_THRESHOLD)
          return true;
        return false;
      case 'robbery':
        if (event.confidence > ViolenceDetectionConfig.VIOLENCE_ROBBERY_CONFIDENCE_THRESHOLD)
          return true;
        return false;
      case 'shooting':
        if (event.confidence > ViolenceDetectionConfig.VIOLENCE_SHOOTING_CONFIDENCE_THRESHOLD)
          return true;
        return false;
      default:
        return false;
    }
  }

  return false;
}
