import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import { ImplantacaoEtapasData } from '@/components/ImplantacaoTimeline';
import {
  PlayCircle, MoreVertical, Trash2, Eye, FileText, AlertTriangle,
  Clock, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ImplantacaoStatus = 'A_EXECUTAR' | 'EM_EXECUCAO' | 'CONCLUIDO_IMPLANTACAO';

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
}

interface Props {
  projects: ProjectData[];
  etapasMap: Record<string, ImplantacaoEtapasData>;
  pendenciasMap: Record<string, number>;
  isAdmin: boolean;
  onContinue: (id: string) => void;
  onStart: (project: ProjectData) => void;
  onViewForm: (id: string) => void;
  onViewDetails: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}

const STEP_KEYS: (keyof ImplantacaoEtapasData)[] = [
  'contrato_assinado_at', 'ligacao_boas_vindas_at', 'agendamento_visita_startup_at',
  'laudo_visita_startup_at', 'check_programacao_at', 'confirmacao_ativacao_financeira_at',
  'operacao_assistida_inicio',
];

export function StartupProjectsTable({
  projects, etapasMap, pendenciasMap, isAdmin,
  onContinue, onStart, onViewForm, onViewDetails, onDelete,
}: Props) {
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">#</TableHead>
            <TableHead>Condomínio</TableHead>
            <TableHead className="hidden md:table-cell">Cidade</TableHead>
            <TableHead className="hidden lg:table-cell">Vendedor</TableHead>
            <TableHead className="hidden md:table-cell">Tipo</TableHead>
            <TableHead className="w-[180px]">Progresso</TableHead>
            <TableHead className="hidden xl:table-cell">Previsão</TableHead>
            <TableHead className="text-right w-[140px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            const etapas = etapasMap[project.id] || null;
            const pendencias = pendenciasMap[project.id] || 0;
            const completedCount = etapas ? STEP_KEYS.filter(k => etapas[k]).length : 0;
            const progressPct = Math.round((completedCount / STEP_KEYS.length) * 100);
            const status = project.implantacao_status || 'A_EXECUTAR';
            const isAExecutar = status === 'A_EXECUTAR';

            return (
              <TableRow key={project.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "inline-flex w-2 h-2 rounded-full shrink-0",
                        status === 'A_EXECUTAR' && 'bg-amber-500',
                        status === 'EM_EXECUCAO' && 'bg-blue-500',
                        status === 'CONCLUIDO_IMPLANTACAO' && 'bg-green-500',
                      )}
                    />
                    {project.numero_projeto}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate max-w-[260px]">
                      {project.cliente_condominio_nome}
                    </span>
                    {pendencias > 0 && (
                      <Badge className="bg-destructive/10 text-destructive border-destructive/30 border text-[10px] h-5 px-1.5">
                        <AlertTriangle className="w-3 h-3 mr-0.5" />
                        {pendencias}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {project.cliente_cidade}, {project.cliente_estado}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {project.vendedor_nome}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                    {project.tipo_obra === 'acrescimo' ? 'Acréscimo' : 'Novo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[80px]">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-primary tabular-nums w-10 text-right">
                      {completedCount}/7
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                  {project.prazo_entrega_projeto
                    ? format(parseISO(project.prazo_entrega_projeto), "dd/MM/yyyy", { locale: ptBR })
                    : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {isAExecutar ? (
                      <Button size="sm" onClick={() => onStart(project)} className="h-8">
                        <PlayCircle className="w-3.5 h-3.5 mr-1" />
                        Iniciar
                      </Button>
                    ) : status === 'EM_EXECUCAO' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onContinue(project.id)}
                        className="h-8 border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <PlayCircle className="w-3.5 h-3.5 mr-1" />
                        Continuar
                      </Button>
                    ) : null}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewForm(project.id)}>
                          <FileText className="w-4 h-4 mr-2" />
                          Formulário
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onViewDetails(project.id)}>
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
                                    onClick={() => onDelete(project.id, project.cliente_condominio_nome)}
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
