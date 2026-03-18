import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Heart, Search, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Customer {
  id: string;
  contrato: string;
  razao_social: string;
  filial: string | null;
  praca: string | null;
  unidades: number | null;
  mensalidade: number | null;
  data_ativacao: string | null;
  status_implantacao: string | null;
  endereco: string | null;
}

export default function SucessoClienteAtivos() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('customer_portfolio')
        .select('id, contrato, razao_social, filial, praca, unidades, mensalidade, data_ativacao, status_implantacao, endereco')
        .order('razao_social');

      setCustomers((data || []) as Customer[]);
      setLoading(false);
    };
    fetch();
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

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes Ativos</h1>
          <p className="text-muted-foreground">Visão geral dos clientes ativos na carteira</p>
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
              <div className="text-2xl font-bold">
                R$ {customers.length > 0
                  ? (totalMensalidade / customers.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                  : '0,00'}
              </div>
              <p className="text-sm text-muted-foreground">Ticket Médio</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Clientes Ativos
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
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
                      <TableHead>Unidades</TableHead>
                      <TableHead>Mensalidade</TableHead>
                      <TableHead>Data Ativação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(c => (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/sucesso-cliente/${c.id}`)}
                      >
                        <TableCell className="font-medium">{c.contrato}</TableCell>
                        <TableCell>{c.razao_social}</TableCell>
                        <TableCell>
                          {c.filial ? <Badge variant="outline">{c.filial}</Badge> : '-'}
                        </TableCell>
                        <TableCell>{c.unidades || '-'}</TableCell>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
