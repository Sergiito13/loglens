import { useEffect, useMemo, useRef, useState } from 'react';

import * as echarts from 'echarts/core';

import { PieChart } from 'echarts/charts';

import { TooltipComponent } from 'echarts/components';

import { CanvasRenderer } from 'echarts/renderers';

import type { LogProcessingResult } from '../../../../../core/logs/processing/types';

echarts.use([PieChart, TooltipComponent, CanvasRenderer]);

/* ==========================================================
   TYPES
========================================================== */

interface NginxSeverityChartProps {
  result: LogProcessingResult;

  selectedSeverities: readonly string[];

  onToggleSeverity: (severity: string) => void;

  onClearFilters: () => void;
}

type ViewMode = 'distribution' | 'details';

/* ==========================================================
   SEVERITY CONFIGURATION
========================================================== */

const severityLevels = [
  {
    id: 'error',
    name: 'ERROR',
    color: '#ee258f',
  },
  {
    id: 'warn',
    name: 'WARN',
    color: '#ff9850',
  },
  {
    id: 'crit',
    name: 'CRIT',
    color: '#b24bff',
  },
  {
    id: 'alert',
    name: 'ALERT',
    color: '#9747e9',
  },
  {
    id: 'emerg',
    name: 'EMERG',
    color: '#7835c9',
  },
  {
    id: 'notice',
    name: 'NOTICE',
    color: '#ffc448',
  },
  {
    id: 'info',
    name: 'INFO',
    color: '#ffdb75',
  },
  {
    id: 'debug',
    name: 'DEBUG',
    color: '#b9a5dc',
  },
] as const;

/* ==========================================================
   FORMATTERS
========================================================== */

const numberFormatter = new Intl.NumberFormat('es-ES');

const percentageFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/* ==========================================================
   COMPONENT
========================================================== */

export function NginxSeverityChart({
  result,
  selectedSeverities,
  onToggleSeverity,
  onClearFilters,
}: NginxSeverityChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartInstance = useRef<ReturnType<typeof echarts.init> | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('distribution');

  /* ========================================================
     SEVERITY DATA
  ======================================================== */

  const severityData = useMemo(() => {
    return severityLevels
      .map((level) => ({
        ...level,
        value: result.levelCounts[level.id] ?? 0,
      }))
      .filter((level) => level.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [result.levelCounts]);

  /* ========================================================
     SELECTED SEVERITIES
  ======================================================== */

  const selectedSet = useMemo(() => new Set(selectedSeverities), [selectedSeverities]);

  const hasFilters = selectedSeverities.length > 0;

  /* ========================================================
     SELECTED EVENT COUNT
  ======================================================== */

  const selectedTotal = useMemo(() => {
    if (!hasFilters) {
      return result.parsedLines;
    }

    return selectedSeverities.reduce(
      (total, severity) => total + (result.levelCounts[severity] ?? 0),
      0,
    );
  }, [hasFilters, result.levelCounts, result.parsedLines, selectedSeverities]);

  const selectedPercentage =
    result.parsedLines > 0 ? (selectedTotal / result.parsedLines) * 100 : 0;

  /* ========================================================
     INITIALIZE ECHARTS
  ======================================================== */

  useEffect(() => {
    const element = chartRef.current;

    if (!element || severityData.length === 0 || viewMode !== 'distribution') {
      return;
    }

    const chart = echarts.init(element, undefined, {
      renderer: 'canvas',
    });

    chartInstance.current = chart;

    chart.setOption({
      backgroundColor: 'transparent',

      animation: true,
      animationDuration: 350,
      animationEasing: 'cubicOut',

      tooltip: {
        trigger: 'item',
        confine: true,

        backgroundColor: '#151b39',

        borderColor: '#41466f',
        borderWidth: 1,

        padding: [10, 14],

        textStyle: {
          color: '#f6f7ff',
          fontSize: 12,
        },

        formatter: '{b}: {c} ({d}%)',
      },

      series: [
        {
          name: 'Severidades',

          type: 'pie',

          radius: ['62%', '83%'],

          center: ['50%', '50%'],

          clockwise: true,

          startAngle: 90,

          selectedMode: false,

          stillShowZeroSum: false,

          label: {
            show: false,
          },

          labelLine: {
            show: false,
          },

          itemStyle: {
            borderColor: '#0a102d',
            borderWidth: 2,
            borderRadius: 3,
          },

          emphasis: {
            scale: true,
            scaleSize: 4,
          },

          data: severityData.map((level) => ({
            name: level.name,
            value: level.value,

            itemStyle: {
              color: level.color,
            },
          })),
        },
      ],
    });

    /* ======================================================
       CLICK ON DONUT SEGMENT
    ====================================================== */

    chart.on('click', (params) => {
      if (typeof params.name !== 'string') {
        return;
      }

      const severity = severityData.find((level) => level.name === params.name);

      if (severity) {
        onToggleSeverity(severity.id);
      }
    });

    /* ======================================================
       RESIZE
    ====================================================== */

    const observer = new ResizeObserver(() => {
      chart.resize();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();

      chart.dispose();

      chartInstance.current = null;
    };
  }, [severityData, onToggleSeverity, viewMode]);

  /* ========================================================
     UPDATE SELECTED SEGMENTS
  ======================================================== */

  useEffect(() => {
    const chart = chartInstance.current;

    if (!chart || viewMode !== 'distribution') {
      return;
    }

    chart.setOption({
      series: [
        {
          data: severityData.map((level) => {
            const isSelected = selectedSet.has(level.id);

            const isMuted = hasFilters && !isSelected;

            return {
              name: level.name,

              value: level.value,

              itemStyle: {
                color: level.color,

                opacity: isMuted ? 0.2 : 1,
              },
            };
          }),
        },
      ],
    });
  }, [severityData, selectedSet, hasFilters, viewMode]);

  /* ========================================================
     RENDER
  ======================================================== */

  return (
    <article className="ll-dash-panel ll-dash-panel--levels">
      {/* HEADER */}

      <div className="ll-dash-panel-heading ll-nginx-severity-header">
        <div>
          <h2>Distribución por severidad</h2>

          <p>
            Eventos del archivo completo ({numberFormatter.format(result.parsedLines)} registros)
          </p>
        </div>
      </div>

      {/* TOOLBAR */}

      <div className="ll-nginx-severity-toolbar">
        <div
          className="ll-nginx-severity-tabs"
          role="group"
          aria-label="Visualización de severidades"
        >
          <button
            type="button"
            className={`ll-nginx-severity-tab ${viewMode === 'distribution' ? 'is-active' : ''}`}
            aria-pressed={viewMode === 'distribution'}
            onClick={() => setViewMode('distribution')}
          >
            Distribución
          </button>

          <button
            type="button"
            className={`ll-nginx-severity-tab ${viewMode === 'details' ? 'is-active' : ''}`}
            aria-pressed={viewMode === 'details'}
            onClick={() => setViewMode('details')}
          >
            Detalle
          </button>
        </div>

        <button
          type="button"
          className="ll-nginx-severity-reset"
          disabled={!hasFilters}
          onClick={onClearFilters}
        >
          Restablecer filtros
        </button>
      </div>

      {/* EMPTY STATE */}

      {severityData.length === 0 ? (
        <p className="ll-dash-muted">No se encontraron eventos válidos.</p>
      ) : (
        <>
          {/* DISTRIBUTION VIEW */}

          {viewMode === 'distribution' && (
            <div className="ll-nginx-severity-layout">
              {/* DONUT */}

              <div className="ll-nginx-severity-donut">
                <div
                  ref={chartRef}
                  className="ll-nginx-severity-canvas"
                  role="img"
                  aria-label="Gráfico interactivo de distribución por severidad"
                />

                {/* DYNAMIC CENTER */}

                <div className="ll-nginx-severity-center">
                  <strong>{numberFormatter.format(selectedTotal)}</strong>

                  <span>
                    {hasFilters
                      ? selectedSeverities.length === 1
                        ? selectedSeverities[0].toUpperCase()
                        : `${selectedSeverities.length} seleccionadas`
                      : 'Registros válidos'}
                  </span>

                  {hasFilters && <small>{percentageFormatter.format(selectedPercentage)} %</small>}
                </div>
              </div>

              {/* INTERACTIVE LEGEND */}

              <div className="ll-nginx-severity-legend">
                <div className="ll-nginx-severity-columns">
                  <span>SEVERIDAD</span>
                  <span>EVENTOS</span>
                  <span>%</span>
                </div>

                {severityData.map((level) => {
                  const percentage =
                    result.parsedLines > 0 ? (level.value / result.parsedLines) * 100 : 0;

                  const isSelected = selectedSet.has(level.id);

                  const isMuted = hasFilters && !isSelected;

                  return (
                    <button
                      key={level.id}
                      type="button"
                      className={`ll-nginx-severity-item ${
                        isSelected ? 'is-selected' : ''
                      } ${isMuted ? 'is-muted' : ''}`}
                      aria-pressed={isSelected}
                      onClick={() => onToggleSeverity(level.id)}
                    >
                      <span className="ll-nginx-severity-name">
                        <span
                          className="ll-nginx-severity-dot"
                          style={{
                            backgroundColor: level.color,
                          }}
                        />

                        {level.name}
                      </span>

                      <strong>{numberFormatter.format(level.value)}</strong>

                      <small>{percentageFormatter.format(percentage)}%</small>

                      <span
                        className={`ll-nginx-severity-check ${isSelected ? 'is-checked' : ''}`}
                        aria-hidden="true"
                      >
                        {isSelected ? '✓' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* DETAILS VIEW */}

          {viewMode === 'details' && (
            <div className="ll-nginx-severity-breakdown">
              {severityData.map((level) => {
                const percentage =
                  result.parsedLines > 0 ? (level.value / result.parsedLines) * 100 : 0;

                const isSelected = selectedSet.has(level.id);

                return (
                  <button
                    key={level.id}
                    type="button"
                    className={`ll-nginx-breakdown-item ${isSelected ? 'is-selected' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => onToggleSeverity(level.id)}
                  >
                    <span className="ll-nginx-breakdown-heading">
                      <span>
                        <i
                          style={{
                            backgroundColor: level.color,
                          }}
                        />

                        {level.name}
                      </span>

                      <span>
                        {numberFormatter.format(level.value)}
                        {' · '}
                        {percentageFormatter.format(percentage)} %
                      </span>
                    </span>

                    <span className="ll-nginx-breakdown-track">
                      <span
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: level.color,
                        }}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ACTIVE FILTERS */}

          <div className="ll-nginx-filter-footer">
            {hasFilters ? (
              <>
                <span className="ll-nginx-filter-label">Filtros activos:</span>

                <div className="ll-nginx-filter-chips">
                  {selectedSeverities.map((severity) => (
                    <button
                      key={severity}
                      type="button"
                      className="ll-nginx-filter-chip"
                      aria-label={`Quitar filtro ${severity}`}
                      onClick={() => onToggleSeverity(severity)}
                    >
                      {severity.toUpperCase()}

                      <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>

                <span className="ll-nginx-filter-summary">
                  {numberFormatter.format(selectedTotal)} eventos (
                  {percentageFormatter.format(selectedPercentage)}
                  %)
                </span>
              </>
            ) : (
              <span className="ll-nginx-filter-hint">
                Selecciona una o varias severidades para filtrar el explorador de registros.
              </span>
            )}
          </div>
        </>
      )}
    </article>
  );
}
