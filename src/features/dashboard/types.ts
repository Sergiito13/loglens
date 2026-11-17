import type { LogProcessingResult } from '../../core/logs/processing/types';

export interface DashboardProps {
  file: File;
  result: LogProcessingResult;
  onNewFile: () => void;
}
