import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { Search, Building2, MoreHorizontal, RefreshCw, UserCheck, MessageSquareWarning, ThumbsUp, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, parseISO, addMonths } from 'date-fns';

interface Customer {
  id: string;
  contrato: string;
  razao_social: string;
  filial: string | null;
  praca: string | null;
  unidades: number | null;
  mensalidade: number | null;
  data_ativacao: string | null;
  data_termino: string | null;
  endereco: string | null;
}

export default function SucessoClienteAtivos() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('customer_portfolio')
        .select('id, contrato, razao_social, filial, praca, unidades, mensalidade, data_ativacao, data_termino, endereco')
        .order('razao_social');

      setCustomers((data || []) as Customer[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = customers.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.razao_social.toLowerCase().includes(s) ||
      c.contrato.toLowerCase().includes(s) ||
      (c.filial || '').toLowerCase().includes(s) ||
      (c.praca || '').toLowerCase().includes(s)
    );
  });

  const totalMensalidade = filtered.reduce((sum, c) => sum + (c.mensalidade || 0), 0);
  const totalUnidades = filtered.reduce((sum, c) => sum + (c.unidades || 0), 0);

  const getContractStatus = (c: Customer) => {
    const termino = c.data_termino
      ? parseISO(c.data_termino)
      : c.data_ativacao
        ? addMonths(parseISO(c.data_ativacao), 36)
        : null;
    if (!termino) return null;
    const dias = differenceInDays(termino, new Date());
    if (dias < 0) return { label: 'Vencido', variant: 'destructive' as const };
    if (dias <= 90) return { label: `${dias}d`, variant: 'destructive' as const };
    if (dias <= 180) return { label: `${dias}d`, variant: 'secondary' as const };
    return null;
  };

  // Count contracts near expiry
  const expiringCount = customers.filter(c => {
    const status = getContractStatus(c);
    return status !== null;
  }).length;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes Ativos</h1>
          <p className="text-muted-foreground">Gestão completa da carteira de clientes ativos</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{customers.length}</div>
              <p className="text-sm text-muted-foreground">Total de Clientes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{totalUnidades}</div>
              <p className="text-sm text-muted-foreground">Total de Unidades</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                R$ {totalMensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-sm text-muted-foreground">Receita Mensal</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-destructive">{expiringCount}</div>
              <p className="text-sm text-muted-foreground">Contratos a Vencer</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Carteira de Clientes
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente, contrato..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Carregando...</p>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum cliente encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Razão Social</TableHead>
                      <TableHead>Filial</TableHead>
                      <TableHead className="text-center">Unid.</TableHead>
                      <TableHead>Mensalidade</TableHead>
                      <TableHead>Ativação</TableHead>
                      <TableHead>Contrato</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(c => {
                      const status = getContractStatus(c);
                      return (
                        <TableRow key={c.id} className="group">
                          <TableCell className="font-medium">{c.contrato}</TableCell>
                          <TableCell>
                            <button
                              className="text-left hover:text-primary hover:underline transition-colors font-medium"
                              onClick={() => navigate(`/sucesso-cliente/cliente/${c.id}`)}
                            >
                              {c.razao_social}
                            </button>
                          </TableCell>
                          <TableCell>
                            {c.filial ? <Badge variant="outline">{c.filial}</Badge> : '-'}
                          </TableCell>
                          <TableCell className="text-center">{c.unidades || '-'}</TableCell>
                          <TableCell>
                            {c.mensalidade
                              ? `R$ ${Number(c.mensalidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {c.data_ativacao
                              ? new Date(c.data_ativacao + 'T00:00:00').toLocaleDateString('pt-BR')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {status ? (
                              <Badge variant={status.variant}>{status.label}</Badge>
                            ) : (
                              <Badge variant="secondary">Vigente</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem onClick={() => navigate(`/sucesso-cliente/cliente/${c.id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Detalhes
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate(`/sucesso-cliente/cliente/${c.id}#renovacao`)}>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Renovar Contrato
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/sucesso-cliente/cliente/${c.id}#administradores`)}>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Mandatos de Síndicos
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate(`/sucesso-cliente/cliente/${c.id}?action=reclamacao`)}>
                                  <MessageSquareWarning className="h-4 w-4 mr-2" />
                                  Abrir Chamado / Reclamação
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/sucesso-cliente/cliente/${c.id}?action=depoimento`)}>
                                  <ThumbsUp className="h-4 w-4 mr-2" />
                                  Registrar Depoimento / Elogio
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Footer totals */}
            {!loading && filtered.length > 0 && (
              <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
                <span>{filtered.length} cliente(s) encontrado(s)</span>
                <div className="flex gap-6">
                  <span>Total Mensalidades: <strong className="text-foreground">R$ {totalMensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                  <span>Ticket Médio: <strong className="text-foreground">R$ {(filtered.length > 0 ? totalMensalidade / filtered.length : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
