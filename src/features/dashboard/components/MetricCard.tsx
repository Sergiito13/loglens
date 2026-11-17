interface MetricCardProps {
  label: string;
  value: number;
  detail: string;
}

const formatter = new Intl.NumberFormat('es-ES');

export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <article>
      <span>{label}</span>

      <strong>{formatter.format(value)}</strong>

      <small>{detail}</small>
    </article>
  );
}
