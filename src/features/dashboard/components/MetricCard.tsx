/* ==========================================================
   LOGLENS — METRIC CARD
========================================================== */

type MetricIconName = 'file' | 'error' | 'warning' | 'critical';

type MetricTone = 'violet' | 'pink' | 'orange' | 'purple';

interface MetricCardProps {
  label: string;
  value: number;
  detail: string;
  icon: MetricIconName;
  tone: MetricTone;
  percentage?: number;
}

/* FORMATTERS */

const numberFormatter = new Intl.NumberFormat('es-ES');

const percentageFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/* ICONS */

function MetricIcon({ name }: { name: MetricIconName }) {
  const paths = {
    file: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
      </>
    ),

    error: (
      <>
        <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),

    warning: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5V13M12 16.5h.01" />
      </>
    ),

    critical: <path d="m13 2-9 11h7l-1 9 10-12h-7V2Z" />,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}

/* COMPONENT */

export function MetricCard({ label, value, detail, icon, tone, percentage }: MetricCardProps) {
  return (
    <article className={`ll-dash-metric ll-dash-metric--${tone}`}>
      <div className="ll-dash-metric__icon">
        <MetricIcon name={icon} />
      </div>

      <div className="ll-dash-metric__content">
        <span className="ll-dash-metric__label">{label}</span>

        <strong className="ll-dash-metric__value">{numberFormatter.format(value)}</strong>

        <small className="ll-dash-metric__detail">
          {percentage !== undefined && (
            <span className="ll-dash-metric__percentage">
              {percentageFormatter.format(percentage)} %
            </span>
          )}

          {percentage !== undefined ? ' ' : ''}

          {detail}
        </small>
      </div>
    </article>
  );
}
