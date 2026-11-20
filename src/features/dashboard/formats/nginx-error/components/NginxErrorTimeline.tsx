import { useEffect, useMemo, useRef, useState } from 'react';

import type { CSSProperties } from 'react';

import * as echarts from 'echarts/core';

import { LineChart } from 'echarts/charts';

import { DataZoomComponent, GridComponent, TooltipComponent } from 'echarts/components';

import { CanvasRenderer } from 'echarts/renderers';

import type {
  LogTimeData,
  LogTimeCounts,
  LogTimeSeries,
} from '../../../../../core/logs/processing/types';

import './NginxErrorTimeline.css';

/* ==========================================================
   ECHARTS REGISTRATION
========================================================== */

echarts.use([LineChart, DataZoomComponent, GridComponent, TooltipComponent, CanvasRenderer]);

/* ==========================================================
   TYPES
========================================================== */

type Range = '1h' | '6h' | '24h' | '7d' | 'all';

type Group = keyof LogTimeCounts;

type Window = {
  start: number;
  end: number;
};

type TimelineView = {
  times: number[];
  labels: string[];
  bins: LogTimeCounts[];
  stepMs: number;
  total: number;
};

/* ==========================================================
   TIME CONSTANTS
========================================================== */

const HOUR = 3_600_000;

const DAY = 24 * HOUR;

/* ==========================================================
   TIME RANGES
========================================================== */

const RANGES: {
  id: Range;
  label: string;
  duration: number | null;
}[] = [
  { id: '1h', label: '1 h', duration: HOUR },
  { id: '6h', label: '6 h', duration: 6 * HOUR },
  { id: '24h', label: '24 h', duration: DAY },
  { id: '7d', label: '7 d', duration: 7 * DAY },
  { id: 'all', label: 'Todo', duration: null },
];

/* ==========================================================
   SERIES CONFIGURATION
========================================================== */

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

/* ==========================================================
   SUPPORTED GRANULARITIES
========================================================== */

const STEPS = [
  1000,
  5000,
  10_000,
  30_000,
  60_000,
  300_000,
  900_000,
  1_800_000,
  HOUR,
  3 * HOUR,
  6 * HOUR,
  12 * HOUR,
  DAY,
  7 * DAY,
  30 * DAY,
  90 * DAY,
  365 * DAY,
];

/* ==========================================================
   FORMATTERS
========================================================== */

const numberFormat = new Intl.NumberFormat('es-ES');

const percentageFormat = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

/* ==========================================================
   HELPERS
========================================================== */

function empty(): LogTimeCounts {
  return {
    error: 0,
    warn: 0,
    critical: 0,
    other: 0,
  };
}

function formatTime(time: number, withSeconds: boolean): string {
  const iso = new Date(time).toISOString();

  return withSeconds ? iso.slice(5, 19).replace('T', ' ') : iso.slice(5, 16).replace('T', ' ');
}

function fullTime(time: number): string {
  return new Date(time).toISOString().slice(0, 19).replace('T', ' ');
}

/* ==========================================================
   SELECT TEMPORAL SERIES
========================================================== */

function pickSeries(data: LogTimeData, range: Range): LogTimeSeries {
  if (range === '1h') {
    return data.lastHour;
  }

  if (range === '6h' || range === '24h') {
    return data.lastDay;
  }

  if (range === '7d') {
    return data.lastWeek;
  }

  return data.all;
}

/* ==========================================================
   BUILD TIMELINE
========================================================== */

function buildView(data: LogTimeData | undefined, range: Range): TimelineView | null {
  if (!data || data.firstTime === null || data.lastTime === null) {
    return null;
  }

  const source = pickSeries(data, range);

  const duration = RANGES.find((item) => item.id === range)?.duration ?? null;

  const from =
    duration === null ? data.firstTime : Math.max(data.firstTime, data.lastTime - duration);

  const until = data.lastTime;

  const span = until - from;

  /* ========================================================
     ADAPTIVE BUCKET SIZE
  ======================================================== */

  const requiredStep = Math.max(source.stepMs, Math.ceil(span / 63));

  const stepMs = STEPS.find((step) => step >= requiredStep) ?? Math.ceil(requiredStep / DAY) * DAY;

  const first = Math.floor(from / stepMs) * stepMs;

  const last = Math.floor(until / stepMs) * stepMs;

  const count = Math.floor((last - first) / stepMs) + 1;

  const times = Array.from({ length: count }, (_, index) => first + index * stepMs);

  const bins = times.map(() => empty());

  /* ========================================================
     AGGREGATE SOURCE BUCKETS
  ======================================================== */

  for (const bucket of source.buckets) {
    if (bucket.time + source.stepMs <= from || bucket.time > until) {
      continue;
    }

    const index = Math.max(0, Math.min(count - 1, Math.floor((bucket.time - first) / stepMs)));

    const target = bins[index];

    target.error += bucket.counts.error;
    target.warn += bucket.counts.warn;
    target.critical += bucket.counts.critical;
    target.other += bucket.counts.other;
  }

  const total = bins.reduce(
    (sum, bucket) => sum + bucket.error + bucket.warn + bucket.critical + bucket.other,
    0,
  );

  return {
    times,

    labels: times.map((time) => formatTime(time, stepMs < 60_000)),

    bins,

    stepMs,

    total,
  };
}

/* ==========================================================
   SUMMARIZE ZOOM WINDOW
========================================================== */

function summarize(
  view: TimelineView,
  window: Window,
): LogTimeCounts & {
  total: number;
  first: number;
  last: number;
} {
  const maxIndex = view.bins.length - 1;

  const from = Math.min(maxIndex, Math.max(0, Math.ceil((window.start / 100) * maxIndex - 1e-6)));

  const to = Math.min(maxIndex, Math.max(from, Math.floor((window.end / 100) * maxIndex + 1e-6)));

  const counts = empty();

  for (let index = from; index <= to; index++) {
    const row = view.bins[index];

    counts.error += row.error;
    counts.warn += row.warn;
    counts.critical += row.critical;
    counts.other += row.other;
  }

  return {
    ...counts,

    total: counts.error + counts.warn + counts.critical + counts.other,

    first: view.times[from],

    last: view.times[to],
  };
}

/* ==========================================================
   COMPONENT PROPS
========================================================== */

interface Props {
  temporal?: LogTimeData;
}

/* ==========================================================
   NGINX ERROR TIMELINE
========================================================== */

export function NginxErrorTimeline({ temporal }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);

  const instanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);

  /* ========================================================
     STATE
  ======================================================== */

  const [range, setRange] = useState<Range>('all');

  const [visible, setVisible] = useState<Group[]>(SERIES.map((item) => item.key));

  const [showArea, setShowArea] = useState(true);

  const [window, setWindow] = useState<Window>({
    start: 0,
    end: 100,
  });

  /* ========================================================
     TIMELINE
  ======================================================== */

  const view = useMemo(() => buildView(temporal, range), [temporal, range]);

  const hasZoom = Boolean(
    view && view.times.length >= 12 && view.times.at(-1)! - view.times[0] >= 10 * 60_000,
  );

  const stats = view ? summarize(view, hasZoom ? window : { start: 0, end: 100 }) : null;

  const isZoomed = hasZoom && (window.start > 0.1 || window.end < 99.9);

  const selectValue =
    visible.length === SERIES.length ? 'all' : visible.length === 1 ? visible[0] : 'custom';

  /* ========================================================
     TOGGLE CATEGORY
  ======================================================== */

  function toggleCategory(key: Group) {
    setVisible((current) =>
      current.includes(key)
        ? current.length === 1
          ? SERIES.map((item) => item.key)
          : current.filter((value) => value !== key)
        : [...current, key],
    );
  }

  /* ========================================================
     RESET ZOOM
  ======================================================== */

  function resetZoom() {
    instanceRef.current?.dispatchAction({
      type: 'dataZoom',
      start: 0,
      end: 100,
    });

    setWindow({
      start: 0,
      end: 100,
    });
  }

  /* ========================================================
     INITIALIZE ECHARTS
  ======================================================== */

  useEffect(() => {
    if (!view || !chartRef.current) {
      return;
    }

    const element = chartRef.current;

    const chart = echarts.init(element, undefined, { renderer: 'canvas' });

    instanceRef.current = chart;

    chart.setOption({
      backgroundColor: 'transparent',

      animationDuration: 250,

      grid: {
        top: 18,
        right: 16,
        bottom: hasZoom ? 84 : 38,
        left: 46,
      },

      /* ====================================================
         TOOLTIP
      ==================================================== */

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

      /* ====================================================
         X AXIS
      ==================================================== */

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
        },
      },

      /* ====================================================
         Y AXIS
      ==================================================== */

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

      /* ====================================================
         DATAZOOM
      ==================================================== */

      dataZoom: hasZoom
        ? [
            {
              type: 'inside',
              id: 'inside',
              xAxisIndex: 0,
              start: 0,
              end: 100,
              filterMode: 'filter',
              zoomOnMouseWheel: false,
              moveOnMouseWheel: false,
            },
            {
              type: 'slider',
              id: 'slider',
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
                lineStyle: {
                  color: '#e7298f',
                },

                areaStyle: {
                  color: 'rgba(238,37,143,.14)',
                },
              },

              selectedDataBackground: {
                lineStyle: {
                  color: '#ee258f',
                },

                areaStyle: {
                  color: 'rgba(238,37,143,.3)',
                },
              },
            },
          ]
        : [],

      /* ====================================================
         SERIES
      ==================================================== */

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

    /* ======================================================
       DATAZOOM EVENT
    ====================================================== */

    const onZoom = () => {
      const option = chart.getOption() as {
        dataZoom?: {
          start?: number;
          end?: number;
        }[];
      };

      const current = option.dataZoom?.[0];

      if (!current) {
        return;
      }

      const start = current.start ?? 0;
      const end = current.end ?? 100;

      setWindow((previous) =>
        Math.abs(previous.start - start) < 0.01 && Math.abs(previous.end - end) < 0.01
          ? previous
          : { start, end },
      );
    };

    chart.on('datazoom', onZoom);

    /* ======================================================
       RESPONSIVE RESIZE
    ====================================================== */

    const observer = new ResizeObserver(() => {
      if (!chart.isDisposed()) {
        chart.resize();
      }
    });

    observer.observe(element);

    /* ======================================================
       CLEANUP
    ====================================================== */

    return () => {
      observer.disconnect();

      chart.off('datazoom', onZoom);

      chart.dispose();

      instanceRef.current = null;
    };
  }, [view, hasZoom]);

  /* ========================================================
     UPDATE VISIBLE SERIES
  ======================================================== */

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

  /* ========================================================
     RENDER
  ======================================================== */

  return (
    <article className="ll-dash-panel ll-dash-panel--chart ll-nginx-timeline">
      {/* HEADER */}

      <header className="ll-nginx-timeline__header">
        <div>
          <h2>Evolución de eventos</h2>

          <p>Eventos por severidad a lo largo del tiempo</p>
        </div>

        {/* CONTROLS */}

        <div className="ll-nginx-timeline__controls">
          <div className="ll-nginx-timeline__ranges" role="group" aria-label="Intervalo temporal">
            {RANGES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={range === item.id}
                className={range === item.id ? 'is-active' : ''}
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
            ))}
          </div>

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

      {/* TEMPORAL INFORMATION */}

      <div className="ll-nginx-timeline__meta">
        <span className="ll-nginx-timeline__complete">Análisis temporal completo</span>

        {view && (
          <span>
            Granularidad:{' '}
            {view.stepMs < 60_000
              ? `${view.stepMs / 1000} s`
              : view.stepMs < HOUR
                ? `${view.stepMs / 60_000} min`
                : `${view.stepMs / HOUR} h`}
          </span>
        )}

        {hasZoom && (
          <button type="button" onClick={resetZoom} disabled={!isZoomed}>
            Restablecer zoom
          </button>
        )}
      </div>

      {/* LEGEND */}

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

      {/* CHART */}

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

      {/* FOOTER */}

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
            {isZoomed && (
              <span>
                {fullTime(stats.first)}
                {' → '}
                {fullTime(stats.last)}
              </span>
            )}

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

      {/* DATAZOOM INFORMATION */}

      {hasZoom && (
        <p className="ll-nginx-timeline__hint">
          Arrastra los extremos de la banda inferior para ampliar el período; desplázala para
          navegar.
        </p>
      )}
    </article>
  );
}
