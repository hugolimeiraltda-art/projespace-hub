import { useMemo } from 'react';

interface RegionalData {
  sigla: string;
  nome: string;
  contratos: number;
  receita: number;
}

interface Props {
  data: RegionalData[];
}

// Approximate positions for each regional on a simplified SE Brazil map
const REGIONS: Record<string, { x: number; y: number; label: string }> = {
  SPO: { x: 28, y: 58, label: 'São Paulo' },
  RJ:  { x: 58, y: 52, label: 'Rio de Janeiro' },
  BHZ: { x: 48, y: 30, label: 'Belo Horizonte' },
  VIX: { x: 72, y: 32, label: 'Vitória' },
};

export function MapaRegional({ data }: Props) {
  const maxContratos = useMemo(() => Math.max(...data.map(d => d.contratos), 1), [data]);

  return (
    <div className="relative w-full" style={{ aspectRatio: '16/10' }}>
      {/* Background map outline - simplified SE Brazil */}
      <svg viewBox="0 0 100 80" className="w-full h-full" fill="none">
        {/* MG outline */}
        <path
          d="M25,10 L60,8 L75,20 L70,40 L55,45 L35,48 L20,38 L18,20 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="0.5"
          opacity="0.6"
        />
        {/* SP outline */}
        <path
          d="M10,42 L35,48 L42,55 L45,68 L30,75 L8,70 L5,55 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="0.5"
          opacity="0.6"
        />
        {/* RJ outline */}
        <path
          d="M42,55 L55,45 L70,40 L75,48 L65,60 L50,62 L42,55 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="0.5"
          opacity="0.6"
        />
        {/* ES outline */}
        <path
          d="M70,40 L75,20 L88,18 L92,30 L85,42 L75,48 L70,40 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="0.5"
          opacity="0.6"
        />

        {/* State labels */}
        <text x="28" y="32" fontSize="3.5" fill="hsl(var(--muted-foreground))" textAnchor="middle" opacity="0.5" fontWeight="500">MG</text>
        <text x="22" y="60" fontSize="3.5" fill="hsl(var(--muted-foreground))" textAnchor="middle" opacity="0.5" fontWeight="500">SP</text>
        <text x="56" y="55" fontSize="3.5" fill="hsl(var(--muted-foreground))" textAnchor="middle" opacity="0.5" fontWeight="500">RJ</text>
        <text x="82" y="32" fontSize="3.5" fill="hsl(var(--muted-foreground))" textAnchor="middle" opacity="0.5" fontWeight="500">ES</text>

        {/* Regional bubbles */}
        {data.map(d => {
          const region = REGIONS[d.sigla];
          if (!region) return null;
          const radius = 3 + (d.contratos / maxContratos) * 6;
          const hasData = d.contratos > 0;

          return (
            <g key={d.sigla}>
              {/* Pulse animation for active regions */}
              {hasData && (
                <circle
                  cx={region.x}
                  cy={region.y}
                  r={radius + 2}
                  fill="hsl(var(--primary))"
                  opacity="0.15"
                >
                  <animate attributeName="r" values={`${radius + 1};${radius + 4};${radius + 1}`} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.2;0.05;0.2" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              {/* Main bubble */}
              <circle
                cx={region.x}
                cy={region.y}
                r={radius}
                fill={hasData ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                opacity={hasData ? 0.85 : 0.3}
                stroke="hsl(var(--background))"
                strokeWidth="0.8"
              />
              {/* Count inside bubble */}
              <text
                x={region.x}
                y={region.y + 1.2}
                fontSize="3"
                fill="hsl(var(--primary-foreground))"
                textAnchor="middle"
                fontWeight="bold"
              >
                {d.contratos}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Data cards overlaid */}
      <div className="absolute inset-0 pointer-events-none">
        {data.map(d => {
          const region = REGIONS[d.sigla];
          if (!region) return null;
          const hasData = d.contratos > 0;

          // Position tooltip cards near each bubble
          const tooltipX = region.x > 50 ? region.x - 2 : region.x + 2;
          const tooltipY = region.y > 40 ? region.y - 14 : region.y + 8;

          return (
            <div
              key={d.sigla}
              className="absolute pointer-events-auto"
              style={{
                left: `${tooltipX}%`,
                top: `${tooltipY}%`,
                transform: region.x > 50 ? 'translateX(-100%)' : 'translateX(0)',
              }}
            >
              <div className={`rounded-md border px-2 py-1.5 shadow-sm text-left min-w-[110px] ${hasData ? 'bg-card border-border' : 'bg-muted/60 border-border/50'}`}>
                <p className="text-[10px] font-bold text-foreground">{d.sigla} — {region.label}</p>
                <p className="text-[10px] text-muted-foreground">{d.contratos} contrato{d.contratos !== 1 ? 's' : ''}</p>
                <p className={`text-[11px] font-semibold ${hasData ? 'text-foreground' : 'text-muted-foreground'}`}>
                  R$ {d.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
