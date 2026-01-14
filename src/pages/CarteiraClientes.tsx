import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, Users, Building2, Camera, DoorOpen, Edit, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Customer {
  id: string;
  contrato: string;
  alarme_codigo: string | null;
  razao_social: string;
  mensalidade: number | null;
  leitores: string | null;
  quantidade_leitores: number | null;
  filial: string | null;
  unidades: number | null;
  tipo: string | null;
  data_ativacao: string | null;
  noc: string | null;
  sistema: string | null;
  transbordo: boolean;
  gateway: boolean;
  portoes: number;
  portas: number;
  dvr_nvr: number;
  cameras: number;
  zonas_perimetro: number;
  cancelas: number;
  totem_simples: number;
  totem_duplo: number;
  catracas: number;
  created_at: string;
}

const EMPTY_FORM = {
  contrato: '',
  alarme_codigo: '',
  razao_social: '',
  mensalidade: '',
  leitores: '',
  quantidade_leitores: '',
  filial: '',
  unidades: '',
  tipo: '',
  data_ativacao: '',
  noc: '',
  sistema: '',
  transbordo: false,
  gateway: false,
  portoes: '0',
  portas: '0',
  dvr_nvr: '0',
  cameras: '0',
  zonas_perimetro: '0',
  cancelas: '0',
  totem_simples: '0',
  totem_duplo: '0',
  catracas: '0',
};

export default function CarteiraClientes() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_portfolio')
        .select('*')
        .order('contrato', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: 'Erro ao carregar clientes',
        description: 'Não foi possível carregar a carteira de clientes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setEditingCustomer(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
      contrato: customer.contrato,
      alarme_codigo: customer.alarme_codigo || '',
      razao_social: customer.razao_social,
      mensalidade: customer.mensalidade?.toString() || '',
      leitores: customer.leitores || '',
      quantidade_leitores: customer.quantidade_leitores?.toString() || '',
      filial: customer.filial || '',
      unidades: customer.unidades?.toString() || '',
      tipo: customer.tipo || '',
      data_ativacao: customer.data_ativacao || '',
      noc: customer.noc || '',
      sistema: customer.sistema || '',
      transbordo: customer.transbordo,
      gateway: customer.gateway,
      portoes: customer.portoes.toString(),
      portas: customer.portas.toString(),
      dvr_nvr: customer.dvr_nvr.toString(),
      cameras: customer.cameras.toString(),
      zonas_perimetro: customer.zonas_perimetro.toString(),
      cancelas: customer.cancelas.toString(),
      totem_simples: customer.totem_simples.toString(),
      totem_duplo: customer.totem_duplo.toString(),
      catracas: customer.catracas.toString(),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.contrato || !form.razao_social) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o contrato e a razão social.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        contrato: form.contrato,
        alarme_codigo: form.alarme_codigo || null,
        razao_social: form.razao_social,
        mensalidade: form.mensalidade ? parseFloat(form.mensalidade.replace(',', '.')) : null,
        leitores: form.leitores || null,
        quantidade_leitores: form.quantidade_leitores ? parseInt(form.quantidade_leitores) : null,
        filial: form.filial || null,
        unidades: form.unidades ? parseInt(form.unidades) : null,
        tipo: form.tipo || null,
        data_ativacao: form.data_ativacao || null,
        noc: form.noc || null,
        sistema: form.sistema || null,
        transbordo: form.transbordo,
        gateway: form.gateway,
        portoes: parseInt(form.portoes) || 0,
        portas: parseInt(form.portas) || 0,
        dvr_nvr: parseInt(form.dvr_nvr) || 0,
        cameras: parseInt(form.cameras) || 0,
        zonas_perimetro: parseInt(form.zonas_perimetro) || 0,
        cancelas: parseInt(form.cancelas) || 0,
        totem_simples: parseInt(form.totem_simples) || 0,
        totem_duplo: parseInt(form.totem_duplo) || 0,
        catracas: parseInt(form.catracas) || 0,
      };

      if (editingCustomer) {
        const { error } = await supabase
          .from('customer_portfolio')
          .update(payload)
          .eq('id', editingCustomer.id);

        if (error) throw error;
        toast({ title: 'Cliente atualizado!', description: 'Os dados foram salvos com sucesso.' });
      } else {
        const { error } = await supabase
          .from('customer_portfolio')
          .insert(payload);

        if (error) throw error;
        toast({ title: 'Cliente cadastrado!', description: 'O novo cliente foi adicionado à carteira.' });
      }

      setDialogOpen(false);
      fetchCustomers();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar o cliente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Tem certeza que deseja excluir o cliente ${customer.razao_social}?`)) return;

    try {
      const { error } = await supabase
        .from('customer_portfolio')
        .delete()
        .eq('id', customer.id);

      if (error) throw error;
      toast({ title: 'Cliente excluído!', description: 'O cliente foi removido da carteira.' });
      fetchCustomers();
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast({
        title: 'Erro ao excluir',
        description: error.message || 'Não foi possível excluir o cliente.',
        variant: 'destructive',
      });
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.razao_social.toLowerCase().includes(search.toLowerCase()) ||
    c.contrato.toLowerCase().includes(search.toLowerCase()) ||
    c.filial?.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate totals
  const totals = customers.reduce((acc, c) => ({
    unidades: acc.unidades + (c.unidades || 0),
    cameras: acc.cameras + (c.cameras || 0),
    portas: acc.portas + (c.portas || 0),
    mensalidade: acc.mensalidade + (c.mensalidade || 0),
  }), { unidades: 0, cameras: 0, portas: 0, mensalidade: 0 });

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Carteira de Clientes</h1>
            <p className="text-muted-foreground">Gerencie a carteira de clientes ativos</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenNew}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Identificação */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="contrato">Contrato *</Label>
                    <Input
                      id="contrato"
                      value={form.contrato}
                      onChange={(e) => setForm({ ...form, contrato: e.target.value })}
                      placeholder="SP01"
                    />
                  </div>
                  <div>
                    <Label htmlFor="alarme_codigo">Código Alarme</Label>
                    <Input
                      id="alarme_codigo"
                      value={form.alarme_codigo}
                      onChange={(e) => setForm({ ...form, alarme_codigo: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="filial">Filial</Label>
                    <Input
                      id="filial"
                      value={form.filial}
                      onChange={(e) => setForm({ ...form, filial: e.target.value })}
                      placeholder="BHZ"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="razao_social">Razão Social *</Label>
                  <Input
                    id="razao_social"
                    value={form.razao_social}
                    onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="mensalidade">Mensalidade (R$)</Label>
                    <Input
                      id="mensalidade"
                      value={form.mensalidade}
                      onChange={(e) => setForm({ ...form, mensalidade: e.target.value })}
                      placeholder="5000.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="unidades">Unidades</Label>
                    <Input
                      id="unidades"
                      type="number"
                      value={form.unidades}
                      onChange={(e) => setForm({ ...form, unidades: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tipo">Tipo</Label>
                    <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VIRTUAL">Virtual</SelectItem>
                        <SelectItem value="PRESENCIAL">Presencial</SelectItem>
                        <SelectItem value="CA MONITORADO">CA Monitorado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="data_ativacao">Data Ativação</Label>
                    <Input
                      id="data_ativacao"
                      type="date"
                      value={form.data_ativacao}
                      onChange={(e) => setForm({ ...form, data_ativacao: e.target.value })}
                    />
                  </div>
                </div>

                {/* Sistemas */}
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="leitores">Leitores</Label>
                    <Input
                      id="leitores"
                      value={form.leitores}
                      onChange={(e) => setForm({ ...form, leitores: e.target.value })}
                      placeholder="Avicam"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quantidade_leitores">Qtd Leitores</Label>
                    <Input
                      id="quantidade_leitores"
                      type="number"
                      value={form.quantidade_leitores}
                      onChange={(e) => setForm({ ...form, quantidade_leitores: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="noc">NOC</Label>
                    <Select value={form.noc} onValueChange={(v) => setForm({ ...form, noc: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SIM">SIM</SelectItem>
                        <SelectItem value="NÃO">NÃO</SelectItem>
                        <SelectItem value="RETROFIT">RETROFIT</SelectItem>
                        <SelectItem value="FAZER">FAZER</SelectItem>
                        <SelectItem value="OBRA NOVA">OBRA NOVA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="sistema">Sistema</Label>
                    <Select value={form.sistema} onValueChange={(v) => setForm({ ...form, sistema: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GEAR">GEAR</SelectItem>
                        <SelectItem value="SIAM">SIAM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Switches */}
                <div className="flex gap-8">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="transbordo"
                      checked={form.transbordo}
                      onCheckedChange={(v) => setForm({ ...form, transbordo: v })}
                    />
                    <Label htmlFor="transbordo">Transbordo</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="gateway"
                      checked={form.gateway}
                      onCheckedChange={(v) => setForm({ ...form, gateway: v })}
                    />
                    <Label htmlFor="gateway">Gateway</Label>
                  </div>
                </div>

                {/* Equipamentos */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Equipamentos</h3>
                  <div className="grid grid-cols-5 gap-4">
                    <div>
                      <Label htmlFor="portoes">Portões</Label>
                      <Input
                        id="portoes"
                        type="number"
                        value={form.portoes}
                        onChange={(e) => setForm({ ...form, portoes: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="portas">Portas</Label>
                      <Input
                        id="portas"
                        type="number"
                        value={form.portas}
                        onChange={(e) => setForm({ ...form, portas: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dvr_nvr">DVR/NVR</Label>
                      <Input
                        id="dvr_nvr"
                        type="number"
                        value={form.dvr_nvr}
                        onChange={(e) => setForm({ ...form, dvr_nvr: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cameras">Câmeras</Label>
                      <Input
                        id="cameras"
                        type="number"
                        value={form.cameras}
                        onChange={(e) => setForm({ ...form, cameras: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="zonas_perimetro">Zonas Perímetro</Label>
                      <Input
                        id="zonas_perimetro"
                        type="number"
                        value={form.zonas_perimetro}
                        onChange={(e) => setForm({ ...form, zonas_perimetro: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 mt-4">
                    <div>
                      <Label htmlFor="cancelas">Cancelas</Label>
                      <Input
                        id="cancelas"
                        type="number"
                        value={form.cancelas}
                        onChange={(e) => setForm({ ...form, cancelas: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="totem_simples">Totem Simples</Label>
                      <Input
                        id="totem_simples"
                        type="number"
                        value={form.totem_simples}
                        onChange={(e) => setForm({ ...form, totem_simples: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="totem_duplo">Totem Duplo</Label>
                      <Input
                        id="totem_duplo"
                        type="number"
                        value={form.totem_duplo}
                        onChange={(e) => setForm({ ...form, totem_duplo: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="catracas">Catracas</Label>
                      <Input
                        id="catracas"
                        type="number"
                        value={form.catracas}
                        onChange={(e) => setForm({ ...form, catracas: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingCustomer ? 'Salvar Alterações' : 'Cadastrar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Clientes</p>
                  <p className="text-2xl font-bold">{customers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Unidades</p>
                  <p className="text-2xl font-bold">{totals.unidades.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Camera className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Câmeras</p>
                  <p className="text-2xl font-bold">{totals.cameras.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DoorOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Portas</p>
                  <p className="text-2xl font-bold">{totals.portas.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, contrato ou filial..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Razão Social</TableHead>
                      <TableHead>Filial</TableHead>
                      <TableHead className="text-right">Unidades</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Câmeras</TableHead>
                      <TableHead className="text-right">Portas</TableHead>
                      <TableHead>Sistema</TableHead>
                      <TableHead>NOC</TableHead>
                      <TableHead className="text-right">Mensalidade</TableHead>
                      <TableHead className="w-20">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">{customer.contrato}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{customer.razao_social}</TableCell>
                          <TableCell>{customer.filial || '-'}</TableCell>
                          <TableCell className="text-right">{customer.unidades || '-'}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              customer.tipo === 'VIRTUAL' ? 'bg-blue-100 text-blue-700' :
                              customer.tipo === 'PRESENCIAL' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {customer.tipo || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{customer.cameras}</TableCell>
                          <TableCell className="text-right">{customer.portas}</TableCell>
                          <TableCell>{customer.sistema || '-'}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              customer.noc === 'SIM' ? 'bg-green-100 text-green-700' :
                              customer.noc === 'NÃO' ? 'bg-red-100 text-red-700' :
                              customer.noc === 'RETROFIT' ? 'bg-yellow-100 text-yellow-700' :
                              customer.noc === 'FAZER' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {customer.noc || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {customer.mensalidade 
                              ? `R$ ${customer.mensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : '-'
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleOpenEdit(customer)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(customer)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
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
