import { Check, Circle, FileSignature, Phone, MapPin, HardHat, Settings, DollarSign, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface ImplantacaoEtapasData {
  contrato_assinado_at: string | null;
  ligacao_boas_vindas_at: string | null;
  agendamento_visita_startup_at: string | null;
  laudo_visita_startup_at: string | null;
  check_programacao_at: string | null;
  confirmacao_ativacao_financeira_at: string | null;
  operacao_assistida_inicio: string | null;
  operacao_assistida_fim: string | null;
}

interface Step {
  key: keyof ImplantacaoEtapasData;
  label: string;
  shortLabel: string;
  icon: typeof Check;
}

const STEPS_PCI: Step[] = [
  { key: 'contrato_assinado_at', label: 'Contrato Assinado', shortLabel: 'Contrato', icon: FileSignature },
  { key: 'ligacao_boas_vindas_at', label: 'Onboarding Iniciado', shortLabel: 'Onboarding', icon: Phone },
  { key: 'agendamento_visita_startup_at', label: 'Visita de Startup', shortLabel: 'Visita', icon: MapPin },
  { key: 'laudo_visita_startup_at', label: 'Obra Iniciada', shortLabel: 'Obra', icon: HardHat },
  { key: 'check_programacao_at', label: 'Obra Programada', shortLabel: 'Programação', icon: Settings },
  { key: 'confirmacao_ativacao_financeira_at', label: 'Ativação Financeira', shortLabel: 'Financeiro', icon: DollarSign },
  { key: 'operacao_assistida_inicio', label: 'Operação Assistida', shortLabel: 'Op. Assistida', icon: Headphones },
];

const STEPS_PPE: Step[] = [
  { key: 'contrato_assinado_at', label: 'Contrato Assinado', shortLabel: 'Contrato', icon: FileSignature },
  { key: 'ligacao_boas_vindas_at', label: 'Ligação de Boas Vindas', shortLabel: 'Boas Vindas', icon: Phone },
  { key: 'laudo_visita_startup_at', label: 'Instalação do Totem', shortLabel: 'Instalação', icon: HardHat },
  { key: 'check_programacao_at', label: 'Programação', shortLabel: 'Programação', icon: Settings },
  { key: 'confirmacao_ativacao_financeira_at', label: 'Ativação Financeira', shortLabel: 'Financeiro', icon: DollarSign },
];

interface ImplantacaoTimelineProps {
  etapas: ImplantacaoEtapasData | null;
  compact?: boolean;
  isPPE?: boolean;
}

export function ImplantacaoTimeline({ etapas, compact = false, isPPE = false }: ImplantacaoTimelineProps) {
  const STEPS = isPPE ? STEPS_PPE : STEPS_PCI;
  if (!etapas) {
    return (
      <div className="text-muted-foreground text-sm text-center py-2">
        Nenhuma etapa registrada
      </div>
    );
  }

  const getStepDate = (step: Step): string | null => {
    const value = etapas[step.key];
    if (!value) return null;
    try {
      return format(parseISO(value), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return null;
    }
  };

  const completedCount = STEPS.filter(s => etapas[s.key]).length;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-full">
        {/* Progress bar summary */}
        {!compact && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">
              Progresso: {completedCount}/{STEPS.length} etapas
            </span>
            <div className="flex-1 mx-3 h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / STEPS.length) * 100}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-primary">
              {Math.round((completedCount / STEPS.length) * 100)}%
            </span>
          </div>
        )}

        {/* Horizontal timeline */}
        <div className="flex items-start w-full">
          {STEPS.map((step, index) => {
            const isCompleted = !!etapas[step.key];
            const date = getStepDate(step);
            const isLast = index === STEPS.length - 1;
            const StepIcon = step.icon;

            return (
              <div key={step.key} className="flex items-start flex-1 min-w-0">
                <div className="flex flex-col items-center w-full">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all shrink-0 cursor-default",
                          isCompleted
                            ? "bg-primary border-primary text-primary-foreground shadow-sm"
                            : "bg-card border-border text-muted-foreground"
                        )}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <StepIcon className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-center">
                      <p className="font-medium">{step.label}</p>
                      {date && <p className="text-xs text-muted-foreground">{date}</p>}
                      {!date && <p className="text-xs text-muted-foreground">Pendente</p>}
                    </TooltipContent>
                  </Tooltip>

                  {!compact && (
                    <div className="mt-1.5 text-center w-full px-0.5">
                      <p className={cn(
                        "text-[10px] leading-tight font-medium truncate",
                        isCompleted ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {step.shortLabel}
                      </p>
                      {date && (
                        <p className="text-[9px] text-muted-foreground mt-0.5">{date}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div className="flex items-center h-8 flex-shrink-0" style={{ width: '100%', maxWidth: '40px', minWidth: '8px' }}>
                    <div
                      className={cn(
                        "h-0.5 w-full transition-colors",
                        isCompleted && etapas[STEPS[index + 1].key]
                          ? "bg-primary"
                          : isCompleted
                            ? "bg-primary/40"
                            : "bg-border"
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
