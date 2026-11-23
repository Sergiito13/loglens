import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { DataZoomComponent, GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { LogTimeData, LogTimeCounts } from '../../../../../core/logs/processing/types';
import {
  TEMPORAL_RANGES as RANGES,
  buildTimelineView,
  isRangeAvailable,
  summarizeTimelineView,
} from '../../../../../core/logs/aggregation/temporalView';
import type {
  TemporalRange as Range,
  ZoomWindow as Window,
} from '../../../../../core/logs/aggregation/temporalView';
import './NginxErrorTimeline.css';
echarts.use([LineChart, DataZoomComponent, GridComponent, TooltipComponent, CanvasRenderer]);
type Group = keyof LogTimeCounts;
const SERIES: {
  key: Group;
  name: string;
  short: string;
  color: string;
}[] = [
  {
    key: 'error',
    name: 'Errores',
    short: 'Error',
    color: '#ee258f',
  },
  {
    key: 'warn',
    name: 'Advertencias',
    short: 'Warn',
    color: '#ff9850',
  },
  {
    key: 'critical',
    name: 'Críticos',
    short: 'Críticos',
    color: '#b24bff',
  },
  {
    key: 'other',
    name: 'Otros',
    short: 'Otros',
    color: '#ffc448',
  },
];
const numberFormat = new Intl.NumberFormat('es-ES');
const percentageFormat = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
function fullTime(time: number): string {
  return new Date(time).toISOString().slice(0, 19).replace('T', ' ');
}
function formatGranularity(milliseconds: number): string {
  const totalSeconds = Math.round(milliseconds / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds} s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes} min ${remainingSeconds} s` : `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours} h ${remainingMinutes} min` : `${hours} h`;
}

/* ==========================================================
   PARTIAL INTERVALS (PRESENTATION ONLY)

   The worker already counts every event correctly. An edge
   bucket may cover less than a full step when the file or
   selected temporal range starts or ends inside that bucket.

   This helper never modifies buckets, totals or zoom limits.
========================================================== */

function describePartialIntervals(
  view: { times: number[]; stepMs: number; start: number; end: number },
  zoom: Window,
  hasZoom: boolean,
): string[] {
  if (view.times.length === 0) {
    return [];
  }

  const notes: string[] = [];
  const firstBucketStart = view.times[0];
  const lastBucketStart = view.times[view.times.length - 1];

  // A 0–100% zoom displays the file/range boundaries.
  // A zoom into the middle displays complete interior buckets.
  const firstIsVisible = !hasZoom || zoom.start <= 0.1;
  const lastIsVisible = !hasZoom || zoom.end >= 99.9;

  const firstDuration = Math.max(
    0,
    Math.min(view.stepMs, firstBucketStart + view.stepMs - view.start),
  );

  const lastDuration = Math.max(0, Math.min(view.stepMs, view.end - lastBucketStart + 1000));

  if (firstIsVisible && firstDuration > 0 && firstDuration < view.stepMs) {
    notes.push(`inicio: ${formatGranularity(firstDuration)} de ${formatGranularity(view.stepMs)}`);
  }

  // Avoid describing the same single bucket twice.
  if (
    lastIsVisible &&
    lastBucketStart !== firstBucketStart &&
    lastDuration > 0 &&
    lastDuration < view.stepMs
  ) {
    notes.push(`final: ${formatGranularity(lastDuration)} de ${formatGranularity(view.stepMs)}`);
  }

  return notes;
}

interface Props {
  temporal?: LogTimeData;
}
export function NginxErrorTimeline({ temporal }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const [range, setRange] = useState<Range>('all');
  // Al abrir el dashboard, activar solo las severidades presentes en el archivo.
  // Las categorías sin eventos pueden activarse después desde la leyenda.
  const [visible, setVisible] = useState<Group[]>(() => {
    const allCategories = SERIES.map((item) => item.key);
    if (!temporal) {
      return allCategories;
    }
    const availableCategories = SERIES.filter((item) =>
      temporal.all.buckets.some((bucket) => bucket.counts[item.key] > 0),
    ).map((item) => item.key);
    return availableCategories.length > 0 ? availableCategories : allCategories;
  });
  const [showArea, setShowArea] = useState(true);
  const [window, setWindow] = useState<Window>({
    start: 0,
    end: 100,
  });
  const view = useMemo(() => buildTimelineView(temporal, range), [temporal, range]);
  const hasZoom = Boolean(
    view && view.times.length >= 12 && view.times.at(-1)! - view.times[0] >= 10 * 60_000,
  );
  const stats = view
    ? summarizeTimelineView(view, hasZoom ? window : { start: 0, end: 100 })
    : null;
  const isZoomed = hasZoom && (window.start > 0.1 || window.end < 99.9);

  // Display edge-bucket coverage; never change the underlying event counts.
  const partialIntervals = useMemo(
    () => (view ? describePartialIntervals(view, window, hasZoom) : []),
    [view, window, hasZoom],
  );

  const selectValue =
    visible.length === SERIES.length ? 'all' : visible.length === 1 ? visible[0] : 'custom';
  function toggleCategory(key: Group) {
    setVisible((current) =>
      current.includes(key)
        ? current.length === 1
          ? SERIES.map((item) => item.key)
          : current.filter((value) => value !== key)
        : [...current, key],
    );
  }
  function resetZoom() {
    instanceRef.current?.dispatchAction({
      type: 'dataZoom',
      dataZoomId: 'timeline-slider',
      start: 0,
      end: 100,
    });
    setWindow({
      start: 0,
      end: 100,
    });
  }
  useEffect(() => {
    if (!view || !chartRef.current) {
      return;
    }
    const element = chartRef.current;
    const chart = echarts.init(element, undefined, {
      renderer: 'canvas',
    });
    instanceRef.current = chart;
    chart.setOption({
      backgroundColor: 'transparent',
      animationDuration: 250,
      grid: {
        top: 18,
        // Dejamos espacio para que no se corte la última fecha real.
        right: 42,
        bottom: hasZoom ? 84 : 38,
        left: 46,
      },
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: '#111832',
        borderColor: '#41466f',
        textStyle: {
          color: '#f6f7ff',
          fontSize: 12,
        },
        axisPointer: {
          type: 'line',
          lineStyle: {
            type: 'dashed',
            color: '#ac80ea',
          },
        },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: view.labels,
        axisLine: {
          lineStyle: {
            color: '#445176',
          },
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: '#98a6c8',
          fontSize: 10,
          hideOverlap: true,
          // Prioriza el inicio y el fin reales del período.
          showMinLabel: true,
          showMaxLabel: true,
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        minInterval: 1,
        axisLabel: {
          color: '#98a6c8',
          fontSize: 10,
        },
        splitLine: {
          lineStyle: {
            color: '#303957',
            type: 'dashed',
          },
        },
      },
      // A single slider controls the X axis and is the source of truth
      // for the visible interval. No second inside zoom can get out of sync.
      dataZoom: hasZoom
        ? [
            {
              type: 'slider',
              id: 'timeline-slider',
              xAxisIndex: 0,
              start: 0,
              end: 100,
              filterMode: 'filter',
              bottom: 14,
              height: 24,
              showDetail: false,
              brushSelect: false,
              borderColor: 'rgba(153,106,217,.3)',
              backgroundColor: '#101735',
              fillerColor: 'rgba(168,65,217,.22)',
              handleStyle: {
                color: '#b45cff',
                borderColor: '#d8adff',
              },
              dataBackground: {
                lineStyle: { color: '#e7298f' },
                areaStyle: { color: 'rgba(238,37,143,.14)' },
              },
              selectedDataBackground: {
                lineStyle: { color: '#ee258f' },
                areaStyle: { color: 'rgba(238,37,143,.3)' },
              },
            },
          ]
        : [],
      series: SERIES.map((item) => ({
        id: item.key,
        name: item.name,
        type: 'line',
        data: view.bins.map((bin) => bin[item.key]),
        showSymbol: view.total <= 15,
        symbolSize: 6,
        smooth: view.total > 15 ? 0.2 : 0,
        itemStyle: {
          color: item.color,
        },
        lineStyle: {
          color: item.color,
          width: 2.3,
        },
        areaStyle: {
          color: item.color,
          opacity: 0.12,
        },
      })),
    });
    const onZoom = (event: unknown) => {
      if (!event || typeof event !== 'object') {
        return;
      }

      const payload = event as {
        start?: number;
        end?: number;
        batch?: Array<{ start?: number; end?: number }>;
      };

      // The event contains the new zoom window. If the browser emits
      // a batch event, read its first range. The slider option is a
      // fallback (we do not read a separate, potentially stale zoom).
      const changed = payload.batch?.[0] ?? payload;
      const option = chart.getOption() as {
        dataZoom?: Array<{ id?: string; start?: number; end?: number }>;
      };
      const slider = option.dataZoom?.find((item) => item.id === 'timeline-slider');
      if (!slider) return;
      const start = Math.max(0, Math.min(100, changed.start ?? slider.start ?? 0));
      const end = Math.max(start, Math.min(100, changed.end ?? slider.end ?? 100));
      // Keep the period label, percentages and reset button synchronized
      // with ECharts' actual slider selection.
      setWindow((previous) =>
        Math.abs(previous.start - start) < 0.001 && Math.abs(previous.end - end) < 0.001
          ? previous
          : { start, end },
      );
    };
    chart.on('datazoom', onZoom);
    const observer = new ResizeObserver(() => {
      if (!chart.isDisposed()) {
        chart.resize();
      }
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      chart.off('datazoom', onZoom);
      chart.dispose();
      instanceRef.current = null;
    };
  }, [view, hasZoom]);
  useEffect(() => {
    const chart = instanceRef.current;
    if (!chart || !view) {
      return;
    }
    chart.setOption({
      series: SERIES.map((item) => ({
        id: item.key,
        name: item.name,
        type: 'line',
        data: visible.includes(item.key) ? view.bins.map((bin) => bin[item.key]) : [],
        smooth: view.total > 15 ? 0.2 : 0,
        showSymbol: view.total <= 15,
        symbolSize: 6,
        itemStyle: {
          color: item.color,
        },
        lineStyle: {
          color: item.color,
          width: 2.4,
        },
        areaStyle: {
          opacity: showArea ? 0.12 : 0,
          color: item.color,
        },
      })),
    });
  }, [view, visible, showArea]);
  return (
    <article className="ll-dash-panel ll-dash-panel--chart ll-nginx-timeline">
      {/* ====================================================
          HEADER
      ==================================================== */}
      <header className="ll-nginx-timeline__header">
        <div>
          <h2>Evolución de eventos</h2>
          <p>Eventos por severidad a lo largo del tiempo</p>
        </div>
        <div className="ll-nginx-timeline__controls">
          {/* TIME RANGE */}
          <div className="ll-nginx-timeline__ranges" role="group" aria-label="Intervalo temporal">
            {RANGES.map((item) => {
              const available = isRangeAvailable(temporal, item.id);
              return (
                <span
                  key={item.id}
                  title={
                    available
                      ? item.label
                      : 'El archivo no contiene suficiente período para que este filtro reduzca la vista.'
                  }
                >
                  <button
                    type="button"
                    aria-pressed={range === item.id}
                    className={range === item.id ? 'is-active' : ''}
                    disabled={!available}
                    onClick={() => {
                      setRange(item.id);
                      setWindow({
                        start: 0,
                        end: 100,
                      });
                    }}
                  >
                    {item.label}
                  </button>
                </span>
              );
            })}
          </div>
          {/* SEVERITY SELECT */}
          <select
            className="ll-nginx-timeline__select"
            aria-label="Series visibles"
            value={selectValue}
            onChange={(event) => {
              const key = event.target.value;
              setVisible(key === 'all' ? SERIES.map((item) => item.key) : [key as Group]);
            }}
          >
            <option value="all">Todas las severidades</option>
            {SERIES.map((item) => (
              <option key={item.key} value={item.key}>
                {item.name}
              </option>
            ))}
            {selectValue === 'custom' && (
              <option value="custom" disabled>
                Selección personalizada
              </option>
            )}
          </select>
        </div>
      </header>
      {/* ====================================================
          TEMPORAL INFORMATION
      ==================================================== */}
      <div className="ll-nginx-timeline__meta">
        <span className="ll-nginx-timeline__complete">Análisis temporal completo</span>
        {view && (
          <span>
            Granularidad: {formatGranularity(view.stepMs)}
            {partialIntervals.length > 0 && (
              <span
                title={`Intervalos parciales: ${partialIntervals.join(' · ')}. Sus recuentos cubren menos tiempo que los intervalos completos.`}
                aria-label={`Intervalos parciales: ${partialIntervals.join(' · ')}`}
                role="note"
              >
                {' '}
                ⓘ
              </span>
            )}
          </span>
        )}
        {view && stats && (
          <span className="ll-nginx-timeline__period" aria-live="polite">
            Período: {fullTime(stats.first)}
            {' → '}
            {fullTime(stats.last)}
          </span>
        )}
        {hasZoom && (
          <button type="button" onClick={resetZoom} disabled={!isZoomed}>
            Restablecer zoom
          </button>
        )}
      </div>
      {/* ====================================================
          LEGEND
      ==================================================== */}
      <div className="ll-nginx-timeline__legend" role="group" aria-label="Categorías del gráfico">
        {SERIES.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={visible.includes(item.key)}
            className={visible.includes(item.key) ? '' : 'is-muted'}
            onClick={() => toggleCategory(item.key)}
          >
            <i
              style={
                {
                  '--line-color': item.color,
                } as CSSProperties
              }
            />
            {item.name}
          </button>
        ))}
      </div>
      {/* ====================================================
          CHART
      ==================================================== */}
      {view ? (
        <div
          ref={chartRef}
          className="ll-nginx-timeline__chart"
          role="img"
          aria-label="Evolución de eventos con zoom temporal"
        />
      ) : (
        <p className="ll-dash-muted">No hay eventos con fechas válidas.</p>
      )}
      {/* ====================================================
          FOOTER
      ==================================================== */}
      {view && stats && (
        <footer className="ll-nginx-timeline__footer">
          <div className="ll-nginx-timeline__summary">
            <span>
              Total en el período:
              <strong>{numberFormat.format(stats.total)}</strong>
            </span>
            {SERIES.map((item) => (
              <span
                key={item.key}
                className="ll-nginx-timeline__badge"
                style={
                  {
                    '--line-color': item.color,
                  } as CSSProperties
                }
              >
                {percentageFormat.format(stats.total ? (stats[item.key] / stats.total) * 100 : 0)}%{' '}
                {item.short}
              </span>
            ))}
          </div>
          <div className="ll-nginx-timeline__footer-right">
            <button
              type="button"
              role="switch"
              aria-checked={showArea}
              onClick={() => setShowArea((value) => !value)}
            >
              <i className={showArea ? 'is-on' : ''} />
              Mostrar área
            </button>
          </div>
        </footer>
      )}
    </article>
  );
}
