import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UserX, Plus, Search, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MOTIVOS = [
  'Concorrência',
  'Retrocedeu a tecnologia',
  'Insatisfação com serviço prestado',
  'Preço',
];

const FILIAIS = ['BHZ', 'VIX', 'RJ', 'SPO'];

interface ClienteInativo {
  id: string;
  contrato: string;
  razao_social: string;
  endereco: string | null;
  cidade: string | null;
  filial: string | null;
  data_entrada: string | null;
  data_cancelamento: string;
  motivo: string;
  observacoes: string | null;
  created_by_name: string | null;
  created_at: string;
}

export default function SucessoClienteInativos() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [clientes, setClientes] = useState<ClienteInativo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Form state
  const [contrato, setContrato] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [endereco, setEndereco] = useState('');
  const [cidade, setCidade] = useState('');
  const [filial, setFilial] = useState('');
  const [dataEntrada, setDataEntrada] = useState('');
  const [dataCancelamento, setDataCancelamento] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const fetchClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes_inativos' as any)
      .select('*')
      .order('data_cancelamento', { ascending: false });

    if (!error && data) {
      setClientes(data as any as ClienteInativo[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const resetForm = () => {
    setContrato('');
    setRazaoSocial('');
    setEndereco('');
    setCidade('');
    setFilial('');
    setDataEntrada('');
    setDataCancelamento('');
    setMotivo('');
    setObservacoes('');
  };

  const handleSalvar = async () => {
    if (!contrato || !razaoSocial || !dataCancelamento || !motivo) {
      toast({ title: 'Erro', description: 'Preencha os campos obrigatórios: Contrato, Razão Social, Data de Cancelamento e Motivo.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('clientes_inativos' as any)
        .insert({
          contrato,
          razao_social: razaoSocial,
          endereco: endereco || null,
          cidade: cidade || null,
          filial: filial || null,
          data_entrada: dataEntrada || null,
          data_cancelamento: dataCancelamento,
          motivo,
          observacoes: observacoes || null,
          created_by: user?.id,
          created_by_name: user?.nome,
        } as any);

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Cliente inativo cadastrado com sucesso.' });
      setDialogOpen(false);
      resetForm();
      fetchClientes();
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Não foi possível cadastrar o cliente inativo.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;

    const { error } = await supabase
      .from('clientes_inativos' as any)
      .delete()
      .eq('id', id);

    if (!error) {
      toast({ title: 'Excluído', description: 'Registro removido com sucesso.' });
      fetchClientes();
    } else {
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
    }
  };

  const getMotivoBadge = (m: string) => {
    const colors: Record<string, string> = {
      'Concorrência': 'bg-orange-500',
      'Retrocedeu a tecnologia': 'bg-blue-500',
      'Insatisfação com serviço prestado': 'bg-red-500',
      'Preço': 'bg-yellow-600',
    };
    return <Badge className={`${colors[m] || 'bg-muted'} text-white`}>{m}</Badge>;
  };

  const filtered = clientes.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.razao_social.toLowerCase().includes(s) ||
      c.contrato.toLowerCase().includes(s) ||
      (c.cidade || '').toLowerCase().includes(s) ||
      (c.filial || '').toLowerCase().includes(s)
    );
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clientes Inativos</h1>
            <p className="text-muted-foreground">Gestão de contratos cancelados e churn</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Cadastrar
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{clientes.length}</div>
              <p className="text-sm text-muted-foreground">Total Inativos</p>
            </CardContent>
          </Card>
          {MOTIVOS.map(m => {
            const count = clientes.filter(c => c.motivo === m).length;
            return (
              <Card key={m}>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{count}</div>
                  <p className="text-sm text-muted-foreground">{m}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search and table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-destructive" />
              Contratos Cancelados
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
              <p className="text-muted-foreground text-center py-8">Nenhum cliente inativo registrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Razão Social</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Filial</TableHead>
                      <TableHead>Data Entrada</TableHead>
                      <TableHead>Data Cancelamento</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.contrato}</TableCell>
                        <TableCell>{c.razao_social}</TableCell>
                        <TableCell>{c.cidade || '-'}</TableCell>
                        <TableCell>
                          {c.filial ? <Badge variant="outline">{c.filial}</Badge> : '-'}
                        </TableCell>
                        <TableCell>
                          {c.data_entrada ? format(parseISO(c.data_entrada), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          {format(parseISO(c.data_cancelamento), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>{getMotivoBadge(c.motivo)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleExcluir(c.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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

      {/* Dialog cadastro */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-destructive" />
              Cadastrar Cliente Inativo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contrato *</Label>
                <Input value={contrato} onChange={e => setContrato(e.target.value)} placeholder="Nº do contrato" />
              </div>
              <div>
                <Label>Razão Social *</Label>
                <Input value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} placeholder="Nome do condomínio" />
              </div>
            </div>
            <div>
              <Label>Endereço</Label>
              <Input value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Endereço completo" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cidade</Label>
                <Input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Cidade" />
              </div>
              <div>
                <Label>Filial</Label>
                <Select value={filial} onValueChange={setFilial}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {FILIAIS.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Entrada</Label>
                <Input type="date" value={dataEntrada} onChange={e => setDataEntrada(e.target.value)} />
              </div>
              <div>
                <Label>Data de Cancelamento *</Label>
                <Input type="date" value={dataCancelamento} onChange={e => setDataCancelamento(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Motivo do Cancelamento *</Label>
              <Select value={motivo} onValueChange={setMotivo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Detalhes adicionais..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={saving}>
              {saving ? 'Salvando...' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
