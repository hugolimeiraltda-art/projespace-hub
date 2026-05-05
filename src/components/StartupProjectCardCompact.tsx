import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ImplantacaoTimeline, ImplantacaoEtapasData } from '@/components/ImplantacaoTimeline';
import {
  User, Eye, PlayCircle, MoreVertical, Trash2,
  AlertTriangle, ChevronDown, ChevronUp, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ImplantacaoStatus = 'A_EXECUTAR' | 'EM_EXECUCAO' | 'CONCLUIDO_IMPLANTACAO';

const STATUS_LABELS: Record<ImplantacaoStatus, string> = {
  A_EXECUTAR: 'A executar',
  EM_EXECUCAO: 'Em execução',
  CONCLUIDO_IMPLANTACAO: 'Concluído',
};

interface ProjectData {
  id: string;
  numero_projeto: number;
  cliente_condominio_nome: string;
  cliente_cidade: string;
  cliente_estado: string;
  vendedor_nome: string;
  created_at: string;
  implantacao_status: ImplantacaoStatus | null;
  implantacao_started_at: string | null;
  prazo_entrega_projeto: string | null;
  tipo_obra: 'nova' | 'acrescimo';
  tipo_implantacao?: 'PCI' | 'PPE' | null;
}

interface Props {
  project: ProjectData;
  etapas: ImplantacaoEtapasData | null;
  pendenciasCount: number;
  isAdmin: boolean;
  onContinue: () => void;
  onStart: () => void;
  onViewForm: () => void;
  onViewDetails: () => void;
  onDelete: () => void;
}

export function StartupProjectCardCompact({
  project, etapas, pendenciasCount, isAdmin,
  onContinue, onStart, onViewForm, onViewDetails, onDelete,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const status = project.implantacao_status || 'A_EXECUTAR';
  const isPPE = project.tipo_implantacao === 'PPE';

  const STEPS_DEF: { key: keyof ImplantacaoEtapasData; label: string }[] = isPPE
    ? [
        { key: 'contrato_assinado_at', label: 'Contrato' },
        { key: 'ligacao_boas_vindas_at', label: 'Boas Vindas' },
        { key: 'laudo_visita_startup_at', label: 'Instalação do Totem' },
        { key: 'check_programacao_at', label: 'Programação' },
        { key: 'confirmacao_ativacao_financeira_at', label: 'Ativação Financeira' },
      ]
    : [
        { key: 'contrato_assinado_at', label: 'Contrato' },
        { key: 'ligacao_boas_vindas_at', label: 'Onboarding' },
        { key: 'agendamento_visita_startup_at', label: 'Visita de Startup' },
        { key: 'laudo_visita_startup_at', label: 'Obra' },
        { key: 'check_programacao_at', label: 'Programação' },
        { key: 'confirmacao_ativacao_financeira_at', label: 'Ativação Financeira' },
        { key: 'operacao_assistida_inicio', label: 'Operação Assistida' },
      ];
  const STEP_KEYS = STEPS_DEF.map(s => s.key);
  const completedCount = etapas ? STEP_KEYS.filter(k => etapas[k]).length : 0;
  const progressPct = Math.round((completedCount / STEP_KEYS.length) * 100);

  // Current stage = next pending step. If all done => Concluído. If none done & status A_EXECUTAR => A executar.
  const isAllDone = etapas ? STEP_KEYS.every(k => etapas[k]) : false;
  const nextPending = etapas ? STEPS_DEF.find(s => !etapas[s.key]) : undefined;
  const currentStageLabel = isAllDone
    ? 'Concluído'
    : status === 'A_EXECUTAR' || !project.implantacao_status
      ? 'A executar'
      : nextPending?.label ?? STEPS_DEF[0].label;

  const isAExecutar = status === 'A_EXECUTAR' || !project.implantacao_status;
  const fmt = (d?: string | null) => d ? format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }) : '—';

  const statusBarClass =
    status === 'A_EXECUTAR' ? 'bg-amber-500' :
    status === 'EM_EXECUCAO' ? 'bg-blue-500' : 'bg-green-500';

  const statusBadgeClass =
    status === 'A_EXECUTAR' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' :
    status === 'EM_EXECUCAO' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30' :
    'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30';

  return (
    <Card className="hover:shadow-sm transition-shadow border-border/60 overflow-hidden relative">
      {/* Vertical status accent bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", statusBarClass)} />
      <CardContent className="p-3 sm:p-4 pl-4 sm:pl-5">
        <div className="flex items-center gap-4">
          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <Badge className={cn("border text-xs font-semibold px-2.5 py-0.5 shrink-0", statusBadgeClass)} title={`Status: ${STATUS_LABELS[status]}`}>
                {currentStageLabel}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono shrink-0">#{project.numero_projeto}</span>
              <h3 className="text-sm font-semibold text-foreground truncate">
                {project.cliente_condominio_nome}
              </h3>
              {pendenciasCount > 0 && (
                <Badge className="bg-destructive/10 text-destructive border-destructive/30 border text-[10px] h-5 px-1.5 shrink-0">
                  <AlertTriangle className="w-3 h-3 mr-0.5" />
                  {pendenciasCount}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-1">
              <span className="truncate">{project.cliente_cidade}, {project.cliente_estado}</span>
              <span className="flex items-center gap-1 truncate">
                <User className="w-3 h-3" />
                {project.vendedor_nome}
              </span>
            </div>
          </div>

          {/* Dates block */}
          <div className="hidden md:grid grid-cols-2 gap-6 text-xs shrink-0">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Início</div>
              <div className="font-medium text-foreground mt-0.5 tabular-nums">{fmt(project.implantacao_started_at)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Previsão</div>
              <div className="font-medium text-foreground mt-0.5 tabular-nums">{fmt(project.prazo_entrega_projeto)}</div>
            </div>
          </div>

          {/* Progress mini */}
          <div className="hidden lg:flex items-center gap-2 w-24 shrink-0">
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-xs font-medium text-muted-foreground tabular-nums w-9 text-right">{progressPct}%</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {isAExecutar ? (
              <Button size="sm" onClick={onStart} className="h-8">
                <PlayCircle className="w-3.5 h-3.5 mr-1" />
                Iniciar
              </Button>
            ) : status === 'EM_EXECUCAO' ? (
              <Button size="sm" variant="ghost" onClick={onContinue} className="h-8 text-primary hover:text-primary">
                Continuar
              </Button>
            ) : null}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(e => !e)}
              className="h-8 w-8 p-0 text-muted-foreground"
              title={expanded ? 'Ocultar timeline' : 'Ver timeline'}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onViewForm}>
                  <FileText className="w-4 h-4 mr-2" />
                  Formulário
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onViewDetails}>
                  <Eye className="w-4 h-4 mr-2" />
                  Ver detalhes
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir projeto
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir projeto</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir <strong>"{project.cliente_condominio_nome}"</strong>?
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={onDelete}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile metadata row */}
        <div className="md:hidden mt-2 grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-[10px] text-muted-foreground">Início</div>
            <div className="font-medium tabular-nums">{fmt(project.implantacao_started_at)}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">Previsão</div>
            <div className="font-medium tabular-nums">{fmt(project.prazo_entrega_projeto)}</div>
          </div>
        </div>

        {/* Expandable timeline */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-border animate-in fade-in slide-in-from-top-1 duration-200">
            <ImplantacaoTimeline etapas={etapas} isPPE={isPPE} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
