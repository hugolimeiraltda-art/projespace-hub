import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ImplantacaoTimeline, ImplantacaoEtapasData } from '@/components/ImplantacaoTimeline';
import {
  Building, User, Calendar, Eye, PlayCircle, MoreVertical, Trash2,
  AlertTriangle, ChevronDown, ChevronUp, Clock, CheckCircle2, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ImplantacaoStatus = 'A_EXECUTAR' | 'EM_EXECUCAO' | 'CONCLUIDO_IMPLANTACAO';

const STATUS_LABELS: Record<ImplantacaoStatus, string> = {
  A_EXECUTAR: 'A Executar',
  EM_EXECUCAO: 'Em Execução',
  CONCLUIDO_IMPLANTACAO: 'Concluído',
};

const STATUS_COLORS: Record<ImplantacaoStatus, string> = {
  A_EXECUTAR: 'bg-amber-100 text-amber-800 border-amber-300',
  EM_EXECUCAO: 'bg-blue-100 text-blue-800 border-blue-300',
  CONCLUIDO_IMPLANTACAO: 'bg-green-100 text-green-800 border-green-300',
};

const STATUS_ICONS: Record<ImplantacaoStatus, typeof Clock> = {
  A_EXECUTAR: Clock,
  EM_EXECUCAO: PlayCircle,
  CONCLUIDO_IMPLANTACAO: CheckCircle2,
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
  const StatusIcon = STATUS_ICONS[status];
  const isPPE = project.tipo_implantacao === 'PPE';

  // Compute progress
  const STEP_KEYS: (keyof ImplantacaoEtapasData)[] = isPPE
    ? ['contrato_assinado_at', 'ligacao_boas_vindas_at', 'laudo_visita_startup_at', 'check_programacao_at', 'confirmacao_ativacao_financeira_at']
    : ['contrato_assinado_at', 'ligacao_boas_vindas_at', 'agendamento_visita_startup_at',
       'laudo_visita_startup_at', 'check_programacao_at', 'confirmacao_ativacao_financeira_at',
       'operacao_assistida_inicio'];
  const completedCount = etapas ? STEP_KEYS.filter(k => etapas[k]).length : 0;
  const progressPct = Math.round((completedCount / STEP_KEYS.length) * 100);

  const isAExecutar = status === 'A_EXECUTAR' || !project.implantacao_status;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Top Row: Title + Status Dot + Actions */}
        <div className="flex items-start justify-between gap-4">
          {/* Left side: minimal info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status indicator dot (subtle) */}
              <span
                className={cn(
                  "inline-flex w-2 h-2 rounded-full shrink-0",
                  status === 'A_EXECUTAR' && 'bg-amber-500',
                  status === 'EM_EXECUCAO' && 'bg-blue-500',
                  status === 'CONCLUIDO_IMPLANTACAO' && 'bg-green-500',
                )}
                title={STATUS_LABELS[status]}
              />
              <span className="text-xs text-muted-foreground font-mono">#{project.numero_projeto}</span>
              <h3 className="text-base font-semibold text-foreground truncate">
                {project.cliente_condominio_nome}
              </h3>
              {project.tipo_obra === 'acrescimo' && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5">Acréscimo</Badge>
              )}
              {pendenciasCount > 0 && (
                <Badge className="bg-destructive/10 text-destructive border-destructive/30 border text-[10px] h-5 px-1.5">
                  <AlertTriangle className="w-3 h-3 mr-0.5" />
                  {pendenciasCount}
                </Badge>
              )}
            </div>

            {/* Subtle metadata row */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Building className="w-3 h-3" />
                {project.cliente_cidade}, {project.cliente_estado}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {project.vendedor_nome}
              </span>
              {project.prazo_entrega_projeto && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Previsão: {format(parseISO(project.prazo_entrega_projeto), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              )}
            </div>
          </div>

          {/* Right side: progress + primary action + menu */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Mini progress display */}
            <div className="hidden sm:flex flex-col items-end gap-1 min-w-[100px]">
              <div className="flex items-center gap-2 w-full">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-primary tabular-nums">{progressPct}%</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{completedCount}/7 etapas</span>
            </div>

            {/* Primary action */}
            {isAExecutar ? (
              <Button size="sm" onClick={onStart} className="h-8">
                <PlayCircle className="w-3.5 h-3.5 mr-1" />
                Iniciar
              </Button>
            ) : status === 'EM_EXECUCAO' ? (
              <Button size="sm" variant="outline" onClick={onContinue} className="h-8 border-blue-300 text-blue-700 hover:bg-blue-50">
                <PlayCircle className="w-3.5 h-3.5 mr-1" />
                Continuar
              </Button>
            ) : null}

            {/* Expand toggle */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(e => !e)}
              className="h-8 w-8 p-0"
              title={expanded ? 'Ocultar timeline' : 'Ver timeline'}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>

            {/* More actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
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
                  Ver Detalhes
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

        {/* Mobile-only progress (visible on small screens) */}
        <div className="sm:hidden mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-xs font-semibold text-primary tabular-nums">{progressPct}%</span>
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
