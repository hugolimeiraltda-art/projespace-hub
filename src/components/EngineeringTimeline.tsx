import { EngineeringStatus, ENGINEERING_STATUS_LABELS, ENGINEERING_STATUS_DAYS } from '@/types/project';
import { Check, Clock, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EngineeringTimelineProps {
  currentStatus?: EngineeringStatus;
  receivedAt?: string;
  productionAt?: string;
  completedAt?: string;
}

const STEPS: { status: EngineeringStatus; label: string; days: number }[] = [
  { status: 'EM_RECEBIMENTO', label: 'Em Recebimento', days: 1 },
  { status: 'EM_PRODUCAO', label: 'Em Produção', days: 5 },
  { status: 'CONCLUIDO', label: 'Concluído', days: 0 },
];

export function EngineeringTimeline({ 
  currentStatus, 
  receivedAt, 
  productionAt, 
  completedAt 
}: EngineeringTimelineProps) {
  const getStepStatus = (stepStatus: EngineeringStatus) => {
    if (!currentStatus) return 'pending';
    
    const statusOrder = ['EM_RECEBIMENTO', 'EM_PRODUCAO', 'CONCLUIDO'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf(stepStatus);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const getStepDate = (stepStatus: EngineeringStatus) => {
    if (stepStatus === 'EM_RECEBIMENTO' && receivedAt) {
      return new Date(receivedAt).toLocaleDateString('pt-BR');
    }
    if (stepStatus === 'EM_PRODUCAO' && productionAt) {
      return new Date(productionAt).toLocaleDateString('pt-BR');
    }
    if (stepStatus === 'CONCLUIDO' && completedAt) {
      return new Date(completedAt).toLocaleDateString('pt-BR');
    }
    return null;
  };

  if (!currentStatus) {
    return (
      <div className="text-muted-foreground text-sm text-center py-4">
        Projeto ainda não enviado para engenharia
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {STEPS.map((step, index) => {
        const status = getStepStatus(step.status);
        const date = getStepDate(step.status);
        const isLast = index === STEPS.length - 1;

        return (
          <div key={step.status} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                  status === 'completed' && "bg-status-approved border-status-approved",
                  status === 'current' && "bg-primary border-primary",
                  status === 'pending' && "bg-secondary border-border"
                )}
              >
                {status === 'completed' ? (
                  <Check className="w-4 h-4 text-white" />
                ) : status === 'current' ? (
                  <Clock className="w-4 h-4 text-primary-foreground" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              {!isLast && (
                <div 
                  className={cn(
                    "w-0.5 h-8 transition-colors",
                    status === 'completed' ? "bg-status-approved" : "bg-border"
                  )} 
                />
              )}
            </div>
            <div className="pt-1 pb-2">
              <p 
                className={cn(
                  "font-medium text-sm",
                  status === 'completed' && "text-status-approved",
                  status === 'current' && "text-primary",
                  status === 'pending' && "text-muted-foreground"
                )}
              >
                {step.label}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {step.days > 0 && (
                  <span>Prazo: {step.days} {step.days === 1 ? 'dia' : 'dias'}</span>
                )}
                {date && (
                  <>
                    <span>•</span>
                    <span>{date}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
