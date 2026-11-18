import { useCallback, useState } from 'react';

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
  /* ========================================================
     SHARED SEVERITY FILTERS
  ======================================================== */

  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);

  /* ========================================================
     TOGGLE A SEVERITY
  ======================================================== */

  const toggleSeverity = useCallback((severity: string) => {
    setSelectedSeverities((current) => {
      if (current.includes(severity)) {
        return current.filter((item) => item !== severity);
      }

      return [...current, severity];
    });
  }, []);

  /* ========================================================
     SELECT ONLY ONE SEVERITY
  ======================================================== */

  const selectSeverity = useCallback((severity: string) => {
    setSelectedSeverities([severity]);
  }, []);

  /* ========================================================
     RESET FILTERS
  ======================================================== */

  const clearSeverityFilters = useCallback(() => {
    setSelectedSeverities([]);
  }, []);

  /* ========================================================
     RENDER
  ======================================================== */

  return (
    <DashboardLayout>
      {/* HEADER */}

      <DashboardHeader onNewFile={onNewFile} />

      {/* FILE INFORMATION */}

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

      {/* METRICS */}

      <NginxErrorMetrics result={result} />

      {/* CHARTS */}

      <section className="ll-dash-visuals" aria-label="Gráficos de análisis">
        <NginxErrorTimeline entries={result.entries} truncated={result.truncatedEntries} />

        <NginxSeverityChart
          result={result}
          selectedSeverities={selectedSeverities}
          onToggleSeverity={toggleSeverity}
          onClearFilters={clearSeverityFilters}
        />
      </section>

      {/* FREQUENT ERRORS */}

      <NginxFrequentErrors entries={result.entries} truncated={result.truncatedEntries} />

      {/* LOG EXPLORER */}

      <NginxErrorTable
        result={result}
        selectedSeverities={selectedSeverities}
        onSelectSeverity={selectSeverity}
        onClearSeverityFilters={clearSeverityFilters}
      />
    </DashboardLayout>
  );
}
