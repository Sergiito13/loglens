export function AmbientBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <svg
        className="h-full w-full"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Curva violeta y magenta */}
          <linearGradient id="leftRibbon" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF914D" />
            <stop offset="25%" stopColor="#F51A83" />
            <stop offset="65%" stopColor="#8128E8" />
            <stop offset="100%" stopColor="#3321A5" />
          </linearGradient>

          {/* Borde luminoso */}
          <linearGradient id="leftEdge" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFB347" />
            <stop offset="35%" stopColor="#FF279A" />
            <stop offset="100%" stopColor="#7B2EFF" />
          </linearGradient>

          {/* Iluminación superior derecha */}
          <radialGradient id="topRightGlow">
            <stop offset="0%" stopColor="#FF984A" />
            <stop offset="35%" stopColor="#F51A83" />
            <stop offset="70%" stopColor="#8128E8" />
            <stop offset="100%" stopColor="#8128E8" stopOpacity="0" />
          </radialGradient>

          {/* Iluminación inferior */}
          <linearGradient id="bottomRibbon" x1="0%" y1="0%" x2="100%" y2="40%">
            <stop offset="0%" stopColor="#FF914D" />
            <stop offset="30%" stopColor="#F51A83" />
            <stop offset="65%" stopColor="#8B35F5" />
            <stop offset="100%" stopColor="#3221A5" />
          </linearGradient>

          <filter id="ambientBlur">
            <feGaussianBlur stdDeviation="70" />
          </filter>
        </defs>

        {/* Fondo principal */}
        <rect width="1600" height="900" fill="#040925" />

        {/* Resplandor superior izquierdo */}
        <ellipse
          cx="0"
          cy="120"
          rx="430"
          ry="350"
          fill="#7B2EFF"
          opacity="0.3"
          filter="url(#ambientBlur)"
        />

        {/* Resplandor superior derecho */}
        <ellipse cx="1510" cy="-60" rx="540" ry="310" fill="url(#topRightGlow)" opacity="0.95" />

        {/* Curva superior izquierda */}
        <path
          d="M -100 -80 H 425 C 220 40 100 175 -35 405 L -100 460 Z"
          fill="url(#leftRibbon)"
          opacity="0.85"
        />

        {/* Borde brillante de la curva */}
        <path
          d="M -35 405 C 100 175 220 40 425 -80"
          fill="none"
          stroke="url(#leftEdge)"
          strokeWidth="9"
          opacity="0.95"
        />

        {/* Resplandor inferior izquierdo */}
        <ellipse
          cx="100"
          cy="890"
          rx="450"
          ry="220"
          fill="#D51AA8"
          opacity="0.5"
          filter="url(#ambientBlur)"
        />

        {/* Curva inferior izquierda */}
        <path
          d="M -100 860 C 75 710 230 790 475 930 H -100 Z"
          fill="url(#bottomRibbon)"
          opacity="0.9"
        />

        <path
          d="M -100 860 C 75 710 230 790 475 930"
          fill="none"
          stroke="url(#leftEdge)"
          strokeWidth="8"
        />

        {/* Resplandor inferior derecho */}
        <ellipse
          cx="1550"
          cy="830"
          rx="410"
          ry="260"
          fill="#C51BA5"
          opacity="0.35"
          filter="url(#ambientBlur)"
        />

        {/* Curva inferior derecha */}
        <path
          d="M 1080 950 C 1310 875 1430 735 1680 675 L 1680 1000 Z"
          fill="url(#bottomRibbon)"
          opacity="0.85"
        />

        <path
          d="M 1080 950 C 1310 875 1430 735 1680 675"
          fill="none"
          stroke="url(#leftEdge)"
          strokeWidth="9"
        />
      </svg>
    </div>
  );
}
