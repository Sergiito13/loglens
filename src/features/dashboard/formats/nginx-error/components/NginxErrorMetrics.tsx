import type { LogProcessingResult } from '../../../../../core/logs/processing/types';

import { MetricCard } from '../../../components/MetricCard';

interface NginxErrorMetricsProps {
  result: LogProcessingResult;
}

export function NginxErrorMetrics({ result }: NginxErrorMetricsProps) {
  const counts = result.levelCounts;

  const critical = (counts.crit ?? 0) + (counts.alert ?? 0) + (counts.emerg ?? 0);

  return (
    <section className="ll-dash-metrics" aria-label="Indicadores de Nginx Error">
      <MetricCard
        label="LÍNEAS ANALIZADAS"
        value={result.totalNonEmptyLines}
        detail="Archivo completo"
      />

      <MetricCard label="ERRORES" value={counts.error ?? 0} detail="Nivel error" />

      <MetricCard label="ADVERTENCIAS" value={counts.warn ?? 0} detail="Nivel warn" />

      <MetricCard label="CRÍTICOS" value={critical} detail="crit · alert · emerg" />
    </section>
  );
}
