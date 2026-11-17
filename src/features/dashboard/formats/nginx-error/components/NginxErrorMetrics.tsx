/* ==========================================================
   LOGLENS — NGINX ERROR METRICS
========================================================== */

import type { LogProcessingResult } from '../../../../../core/logs/processing/types';

import { MetricCard } from '../../../components/MetricCard';

interface NginxErrorMetricsProps {
  result: LogProcessingResult;
}

/* HELPERS */

function calculatePercentage(value: number, total: number): number | undefined {
  return total > 0 ? (value / total) * 100 : undefined;
}

/* COMPONENT */

export function NginxErrorMetrics({ result }: NginxErrorMetricsProps) {
  const errors = result.levelCounts.error ?? 0;

  const warnings = result.levelCounts.warn ?? 0;

  const critical =
    (result.levelCounts.crit ?? 0) +
    (result.levelCounts.alert ?? 0) +
    (result.levelCounts.emerg ?? 0);

  const total = result.parsedLines;

  const detail = total > 0 ? 'de los registros válidos' : 'Sin registros válidos';

  return (
    <section className="ll-dash-metrics" aria-label="Indicadores principales de Nginx Error">
      <MetricCard
        label="LÍNEAS ANALIZADAS"
        value={result.totalNonEmptyLines}
        detail="Archivo completo"
        icon="file"
        tone="violet"
      />

      <MetricCard
        label="ERRORES"
        value={errors}
        detail={detail}
        icon="error"
        tone="pink"
        percentage={calculatePercentage(errors, total)}
      />

      <MetricCard
        label="ADVERTENCIAS"
        value={warnings}
        detail={detail}
        icon="warning"
        tone="orange"
        percentage={calculatePercentage(warnings, total)}
      />

      <MetricCard
        label="CRÍTICOS"
        value={critical}
        detail={detail}
        icon="critical"
        tone="purple"
        percentage={calculatePercentage(critical, total)}
      />
    </section>
  );
}
