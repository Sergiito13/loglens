interface DashboardHeaderProps {
  onNewFile: () => void;
}

export function DashboardHeader({ onNewFile }: DashboardHeaderProps) {
  return (
    <header className="ll-dash-header">
      <div className="ll-dash-identity">
        <img src="/LogLens_loglens-horizontal.svg" alt="LogLens" />

        <span className="ll-dash-title-pill">Resultados del análisis</span>
      </div>

      <button type="button" className="ll-dash-new" onClick={onNewFile}>
        + Importar otro archivo
      </button>
    </header>
  );
}
