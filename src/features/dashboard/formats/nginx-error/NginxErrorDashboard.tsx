import type { DashboardProps } from '../../types';

import { DashboardHeader } from '../../components/DashboardHeader';
import { DashboardLayout } from '../../components/DashboardLayout';

import { formatFileSize } from '../../../../core/utils/formatFileSize';

import { NginxErrorMetrics } from './components/NginxErrorMetrics';
import { NginxErrorTimeline } from './components/NginxErrorTimeline';
import { NginxSeverityChart } from './components/NginxSeverityChart';
import { NginxFrequentErrors } from './components/NginxFrequentErrors';
import { NginxErrorTable } from './components/NginxErrorTable';

import './NginxErrorDashboard.css';

const formatter = new Intl.NumberFormat('es-ES');

export function NginxErrorDashboard({ file, result, onNewFile }: DashboardProps) {
  return (
    <DashboardLayout>
      {/* CABECERA */}

      <DashboardHeader onNewFile={onNewFile} />

      {/* INFORMACIÓN DEL ARCHIVO */}

      <section className="ll-dash-intro">
        <div>
          <p className="ll-dash-eyebrow">ANÁLISIS COMPLETADO</p>

          <h1>Nginx Error Log</h1>

          <p>Diagnóstico de errores, advertencias y eventos del servidor.</p>
        </div>

        <div className="ll-dash-file">
          <strong>{file.name}</strong>

          <span>
            {formatFileSize(file.size)}
            {' · '}
            {result.detection.name ?? 'Nginx Error Log'}
          </span>

          <span>{formatter.format(result.invalidLines)} líneas sin interpretar</span>
        </div>
      </section>

      {/* INDICADORES */}

      <NginxErrorMetrics result={result} />

      {/* GRÁFICOS */}

      <section className="ll-dash-visuals" aria-label="Gráficos de análisis">
        <NginxErrorTimeline entries={result.entries} truncated={result.truncatedEntries} />

        <NginxSeverityChart result={result} />
      </section>

      {/* PROBLEMAS FRECUENTES */}

      <NginxFrequentErrors entries={result.entries} truncated={result.truncatedEntries} />

      {/* EXPLORADOR */}

      <NginxErrorTable result={result} />
    </DashboardLayout>
  );
}
