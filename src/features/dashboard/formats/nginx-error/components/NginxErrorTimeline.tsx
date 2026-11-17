import { useEffect, useMemo, useRef } from 'react';

import * as echarts from 'echarts/core';

import { LineChart } from 'echarts/charts';

import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';

import { CanvasRenderer } from 'echarts/renderers';

import type { LogEntry } from '../../../../../core/logs/parsers/types';

echarts.use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

const series = [
  {
    key: 'error',
    name: 'Errores',
    color: '#ee258f',
  },
  {
    key: 'warn',
    name: 'Advertencias',
    color: '#ff9850',
  },
  {
    key: 'critical',
    name: 'Críticos',
    color: '#b24bff',
  },
  {
    key: 'other',
    name: 'Otros',
    color: '#ffc448',
  },
] as const;

type Category = (typeof series)[number]['key'];

type Bin = Record<Category, number>;

/* ==========================================================
   CLASSIFICATION
========================================================== */

function category(level: string): Category {
  if (level === 'error') {
    return 'error';
  }

  if (level === 'warn') {
    return 'warn';
  }

  if (level === 'crit' || level === 'alert' || level === 'emerg') {
    return 'critical';
  }

  return 'other';
}

/* ==========================================================
   TIMESTAMP
========================================================== */

/**
 * Nginx Error Log no incluye zona horaria.
 * Date.UTC se utiliza únicamente para ordenar
 * las fechas originales, no para convertirlas.
 */
function wallClockTime(stamp: string | null): number | null {
  if (!stamp) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(stamp);

  if (!match) {
    return null;
  }

  return Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +match[6]);
}

/* ==========================================================
   TIMELINE DATA
========================================================== */

function createTimeline(entries: readonly LogEntry[]) {
  const dated = entries
    .map((entry) => ({
      time: wallClockTime(entry.timestamp),
      level: category(entry.level),
    }))
    .filter(
      (
        entry,
      ): entry is {
        time: number;
        level: Category;
      } => entry.time !== null,
    );

  if (!dated.length) {
    return null;
  }

  let first = dated[0].time;
  let last = dated[0].time;

  for (const row of dated) {
    first = Math.min(first, row.time);
    last = Math.max(last, row.time);
  }

  const bins: Bin[] = Array.from({ length: 24 }, () => ({
    error: 0,
    warn: 0,
    critical: 0,
    other: 0,
  }));

  for (const row of dated) {
    const index =
      first === last ? 0 : Math.min(23, Math.floor(((row.time - first) / (last - first)) * 24));

    bins[index][row.level]++;
  }

  const labels = bins.map((_, index) => {
    const ms = first === last ? first : first + ((last - first) * index) / 23;

    return new Date(ms).toISOString().slice(5, 16).replace('T', ' ');
  });

  return {
    bins,
    labels,
  };
}

/* ==========================================================
   COMPONENT
========================================================== */

interface NginxErrorTimelineProps {
  entries: readonly LogEntry[];
  truncated: boolean;
}

export function NginxErrorTimeline({ entries, truncated }: NginxErrorTimelineProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  const timeline = useMemo(() => createTimeline(entries), [entries]);

  useEffect(() => {
    if (!timeline || !elementRef.current) {
      return;
    }

    const chart = echarts.init(elementRef.current, undefined, { renderer: 'canvas' });

    chart.setOption({
      animationDuration: 250,

      color: series.map((item) => item.color),

      textStyle: {
        color: '#aebad8',
        fontFamily: 'inherit',
      },

      grid: {
        left: 42,
        right: 16,
        top: 40,
        bottom: 40,
      },

      tooltip: {
        trigger: 'axis',
        backgroundColor: '#151b39',
        borderColor: '#41466f',

        textStyle: {
          color: '#f2f3ff',
        },
      },

      legend: {
        top: 0,

        textStyle: {
          color: '#b7c4e3',
        },
      },

      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: timeline.labels,

        axisLine: {
          lineStyle: {
            color: '#445176',
          },
        },

        axisLabel: {
          color: '#98a6c8',
          hideOverlap: true,
        },
      },

      yAxis: {
        type: 'value',
        minInterval: 1,

        splitLine: {
          lineStyle: {
            color: '#303957',
            type: 'dashed',
          },
        },

        axisLabel: {
          color: '#98a6c8',
        },
      },

      series: series.map(({ key, name }) => ({
        name,
        type: 'line',

        data: timeline.bins.map((bin) => bin[key]),

        showSymbol: false,
        smooth: 0.2,

        lineStyle: {
          width: 2.4,
        },

        areaStyle: {
          opacity: 0.1,
        },
      })),
    });

    const observer = new ResizeObserver(() => {
      chart.resize();
    });

    observer.observe(elementRef.current);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [timeline]);

  return (
    <article className="ll-dash-panel ll-dash-panel--chart">
      <div className="ll-dash-panel-heading">
        <div>
          <h2>Evolución de eventos</h2>

          <p>Eventos por severidad a lo largo del tiempo</p>
        </div>

        <span className="ll-dash-mini-tag">
          {truncated ? 'Muestra conservada' : 'Archivo completo'}
        </span>
      </div>

      {timeline ? (
        <div
          ref={elementRef}
          className="ll-nginx-chart"
          role="img"
          aria-label="Gráfico temporal de los eventos por severidad"
        />
      ) : (
        <p className="ll-dash-muted">No hay fechas válidas para el gráfico.</p>
      )}

      {truncated && (
        <p className="ll-nginx-chart-note">
          El gráfico representa únicamente los registros conservados en memoria. Los indicadores y
          las severidades sí abarcan el archivo completo.
        </p>
      )}
    </article>
  );
}
