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

const REGION_COLORS: Record<string, { fill: string; text: string; badge: string }> = {
  SPO: { fill: 'hsl(var(--primary))', text: 'hsl(var(--primary-foreground))', badge: 'bg-primary text-primary-foreground' },
  BHZ: { fill: 'hsl(var(--chart-2))', text: '#fff', badge: 'bg-[hsl(var(--chart-2))] text-white' },
  RJ:  { fill: 'hsl(var(--chart-3))', text: '#fff', badge: 'bg-[hsl(var(--chart-3))] text-white' },
  VIX: { fill: 'hsl(var(--chart-4))', text: '#fff', badge: 'bg-[hsl(var(--chart-4))] text-white' },
};

export function MapaRegional({ data }: Props) {
  const total = useMemo(() => data.reduce((s, d) => s + d.contratos, 0), [data]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
      {/* SVG Map */}
      <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
        <svg viewBox="0 0 400 320" className="w-full h-full">
          {/* MG */}
          <path
            d="M100,30 L260,20 L310,80 L290,160 L220,180 L140,190 L80,150 L70,80 Z"
            fill={REGION_COLORS.BHZ.fill}
            opacity="0.18"
            stroke={REGION_COLORS.BHZ.fill}
            strokeWidth="2"
          />
          <text x="170" y="110" fontSize="14" fill="hsl(var(--muted-foreground))" textAnchor="middle" fontWeight="600" opacity="0.4">MINAS GERAIS</text>

          {/* SP */}
          <path
            d="M30,170 L140,190 L170,220 L180,280 L120,305 L25,290 L15,225 Z"
            fill={REGION_COLORS.SPO.fill}
            opacity="0.18"
            stroke={REGION_COLORS.SPO.fill}
            strokeWidth="2"
          />
          <text x="95" y="250" fontSize="14" fill="hsl(var(--muted-foreground))" textAnchor="middle" fontWeight="600" opacity="0.4">SÃO PAULO</text>

          {/* RJ */}
          <path
            d="M170,220 L220,180 L290,160 L310,195 L270,240 L200,250 L170,220 Z"
            fill={REGION_COLORS.RJ.fill}
            opacity="0.18"
            stroke={REGION_COLORS.RJ.fill}
            strokeWidth="2"
          />
          <text x="235" y="215" fontSize="14" fill="hsl(var(--muted-foreground))" textAnchor="middle" fontWeight="600" opacity="0.4">RIO DE JANEIRO</text>

          {/* ES */}
          <path
            d="M290,160 L310,80 L365,65 L380,120 L350,170 L310,195 L290,160 Z"
            fill={REGION_COLORS.VIX.fill}
            opacity="0.18"
            stroke={REGION_COLORS.VIX.fill}
            strokeWidth="2"
          />
          <text x="335" y="130" fontSize="14" fill="hsl(var(--muted-foreground))" textAnchor="middle" fontWeight="600" opacity="0.4">ESPÍRITO SANTO</text>

          {/* City dots */}
          {/* BHZ */}
          <circle cx="195" cy="85" r="6" fill={REGION_COLORS.BHZ.fill} />
          <circle cx="195" cy="85" r="10" fill={REGION_COLORS.BHZ.fill} opacity="0.2">
            {(data.find(d => d.sigla === 'BHZ')?.contratos || 0) > 0 && (
              <animate attributeName="r" values="10;16;10" dur="2s" repeatCount="indefinite" />
            )}
          </circle>

          {/* SPO */}
          <circle cx="110" cy="230" r="6" fill={REGION_COLORS.SPO.fill} />
          <circle cx="110" cy="230" r="10" fill={REGION_COLORS.SPO.fill} opacity="0.2">
            {(data.find(d => d.sigla === 'SPO')?.contratos || 0) > 0 && (
              <animate attributeName="r" values="10;16;10" dur="2s" repeatCount="indefinite" />
            )}
          </circle>

          {/* RJ */}
          <circle cx="245" cy="205" r="6" fill={REGION_COLORS.RJ.fill} />
          <circle cx="245" cy="205" r="10" fill={REGION_COLORS.RJ.fill} opacity="0.2">
            {(data.find(d => d.sigla === 'RJ')?.contratos || 0) > 0 && (
              <animate attributeName="r" values="10;16;10" dur="2s" repeatCount="indefinite" />
            )}
          </circle>

          {/* VIX */}
          <circle cx="340" cy="115" r="6" fill={REGION_COLORS.VIX.fill} />
          <circle cx="340" cy="115" r="10" fill={REGION_COLORS.VIX.fill} opacity="0.2">
            {(data.find(d => d.sigla === 'VIX')?.contratos || 0) > 0 && (
              <animate attributeName="r" values="10;16;10" dur="2s" repeatCount="indefinite" />
            )}
          </circle>
        </svg>
      </div>

      {/* Side legend / stats */}
      <div className="space-y-3">
        <div className="text-center p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Ativações</p>
          <p className="text-2xl font-bold text-foreground">{total}</p>
        </div>

        {data.map(d => {
          const colors = REGION_COLORS[d.sigla];
          const pct = total > 0 ? Math.round((d.contratos / total) * 100) : 0;

          return (
            <div key={d.sigla} className="rounded-lg border border-border p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colors?.fill }} />
                <span className="text-sm font-semibold text-foreground">{d.sigla}</span>
                <span className="text-xs text-muted-foreground">— {d.nome}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{d.contratos} contrato{d.contratos !== 1 ? 's' : ''}</span>
                <span className="text-xs font-medium text-foreground">{pct}%</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: colors?.fill }}
                />
              </div>
              <p className="text-xs font-semibold text-foreground">
                R$ {d.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
