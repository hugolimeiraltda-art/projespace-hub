import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Users, Building2, Camera, DoorOpen, Loader2, CalendarClock, AlertTriangle } from 'lucide-react';
import { format, addMonths, isBefore, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Customer {
  id: string;
  contrato: string;
  alarme_codigo: string | null;
  razao_social: string;
  mensalidade: number | null;
  taxa_ativacao: number | null;
  leitores: string | null;
  quantidade_leitores: number | null;
  filial: string | null;
  unidades: number | null;
  tipo: string | null;
  data_ativacao: string | null;
  data_termino: string | null;
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
  faciais_hik: number;
  faciais_avicam: number;
  faciais_outros: number;
  created_at: string;
}

const EMPTY_FORM = {
  contrato: '',
  alarme_codigo: '',
  razao_social: '',
  mensalidade: '',
  taxa_ativacao: '',
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
  faciais_hik: '0',
  faciais_avicam: '0',
  faciais_outros: '0',
};

export default function CarteiraClientes() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expiringDialogOpen, setExpiringDialogOpen] = useState(false);
  const [expiringDialogData, setExpiringDialogData] = useState<{ title: string; customers: Customer[] }>({ title: '', customers: [] });

  const canCreate = user?.role === 'admin' || user?.role === 'implantacao';

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
    setForm(EMPTY_FORM);
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
        taxa_ativacao: form.taxa_ativacao ? parseFloat(form.taxa_ativacao.replace(',', '.')) : null,
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
        faciais_hik: parseInt(form.faciais_hik) || 0,
        faciais_avicam: parseInt(form.faciais_avicam) || 0,
        faciais_outros: parseInt(form.faciais_outros) || 0,
      };

      const { error } = await supabase
        .from('customer_portfolio')
        .insert(payload);

      if (error) throw error;
      toast({ title: 'Cliente cadastrado!', description: 'O novo cliente foi adicionado à carteira.' });

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

  const handleRowClick = (customerId: string) => {
    navigate(`/carteira-clientes/${customerId}`);
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
    faciais_hik: acc.faciais_hik + (c.faciais_hik || 0),
    faciais_avicam: acc.faciais_avicam + (c.faciais_avicam || 0),
    faciais_outros: acc.faciais_outros + (c.faciais_outros || 0),
  }), { unidades: 0, cameras: 0, portas: 0, mensalidade: 0, faciais_hik: 0, faciais_avicam: 0, faciais_outros: 0 });

  const totalFaciais = totals.faciais_hik + totals.faciais_avicam + totals.faciais_outros;

  // Calculate contracts expiring
  const now = new Date();
  const in3Months = addMonths(now, 3);
  const in6Months = addMonths(now, 6);
  const in1Year = addMonths(now, 12);

  const getContractEndDate = (customer: Customer): Date | null => {
    // Use data_termino if available, otherwise calculate from data_ativacao + 36 months
    if (customer.data_termino) {
      return parseISO(customer.data_termino);
    }
    if (customer.data_ativacao) {
      return addMonths(parseISO(customer.data_ativacao), 36);
    }
    return null;
  };

  const contractsExpiring3Months = customers.filter(c => {
    const endDate = getContractEndDate(c);
    return endDate && isAfter(endDate, now) && isBefore(endDate, in3Months);
  });

  const contractsExpiring6Months = customers.filter(c => {
    const endDate = getContractEndDate(c);
    return endDate && isAfter(endDate, in3Months) && isBefore(endDate, in6Months);
  });

  const contractsExpiring1Year = customers.filter(c => {
    const endDate = getContractEndDate(c);
    return endDate && isAfter(endDate, in6Months) && isBefore(endDate, in1Year);
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const calculateTermino = (customer: Customer) => {
    if (customer.data_termino) {
      return formatDate(customer.data_termino);
    }
    if (!customer.data_ativacao) return '-';
    try {
      const dataInicio = new Date(customer.data_ativacao);
      const dataTermino = addMonths(dataInicio, 36);
      return format(dataTermino, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Carteira de Clientes</h1>
            <p className="text-muted-foreground">Gerencie a carteira de clientes ativos</p>
          </div>
          {canCreate && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenNew}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Novo Cliente</DialogTitle>
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
                      <Label htmlFor="taxa_ativacao">Taxa de Ativação (R$)</Label>
                      <Input
                        id="taxa_ativacao"
                        value={form.taxa_ativacao}
                        onChange={(e) => setForm({ ...form, taxa_ativacao: e.target.value })}
                        placeholder="0.00"
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
                      <Label htmlFor="data_ativacao">Data Ativação (Início)</Label>
                      <Input
                        id="data_ativacao"
                        type="date"
                        value={form.data_ativacao}
                        onChange={(e) => setForm({ ...form, data_ativacao: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
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
                          <SelectItem value="VIRTUAL + APOIO">Virtual + Apoio</SelectItem>
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
                    <div>
                      <Label htmlFor="leitores">Leitores</Label>
                      <Input
                        id="leitores"
                        value={form.leitores}
                        onChange={(e) => setForm({ ...form, leitores: e.target.value })}
                        placeholder="Avicam"
                      />
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
                        <Label htmlFor="zonas_perimetro">Zonas</Label>
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
                    
                    {/* Faciais por marca */}
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Faciais por Marca</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="faciais_hik">Hik (Hikvision)</Label>
                          <Input
                            id="faciais_hik"
                            type="number"
                            value={form.faciais_hik}
                            onChange={(e) => setForm({ ...form, faciais_hik: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="faciais_avicam">Avicam</Label>
                          <Input
                            id="faciais_avicam"
                            type="number"
                            value={form.faciais_avicam}
                            onChange={(e) => setForm({ ...form, faciais_avicam: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="faciais_outros">Outros</Label>
                          <Input
                            id="faciais_outros"
                            type="number"
                            value={form.faciais_outros}
                            onChange={(e) => setForm({ ...form, faciais_outros: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Cadastrar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
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
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Total Portas / Faciais</p>
                  <p className="text-2xl font-bold">{totals.portas.toLocaleString('pt-BR')} / {totalFaciais.toLocaleString('pt-BR')}</p>
                  {totalFaciais > 0 && (
                    <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                      {totals.faciais_hik > 0 && (
                        <p><span className="font-medium text-foreground">{totals.faciais_hik}</span> Hik</p>
                      )}
                      {totals.faciais_avicam > 0 && (
                        <p><span className="font-medium text-foreground">{totals.faciais_avicam}</span> Avicam</p>
                      )}
                      {totals.faciais_outros > 0 && (
                        <p><span className="font-medium text-foreground">{totals.faciais_outros}</span> Outros</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contracts Expiring Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card 
            className="border-l-4 border-l-red-500 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              setExpiringDialogData({ title: 'Contratos vencendo em 3 meses', customers: contractsExpiring3Months });
              setExpiringDialogOpen(true);
            }}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vencendo em 3 meses</p>
                  <p className="text-2xl font-bold text-red-600">{contractsExpiring3Months.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card 
            className="border-l-4 border-l-amber-500 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              setExpiringDialogData({ title: 'Contratos vencendo em 6 meses', customers: contractsExpiring6Months });
              setExpiringDialogOpen(true);
            }}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <CalendarClock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vencendo em 6 meses</p>
                  <p className="text-2xl font-bold text-amber-600">{contractsExpiring6Months.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card 
            className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              setExpiringDialogData({ title: 'Contratos vencendo em 1 ano', customers: contractsExpiring1Year });
              setExpiringDialogOpen(true);
            }}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CalendarClock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vencendo em 1 ano</p>
                  <p className="text-2xl font-bold text-blue-600">{contractsExpiring1Year.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expiring Contracts Dialog */}
        <Dialog open={expiringDialogOpen} onOpenChange={setExpiringDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{expiringDialogData.title}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {expiringDialogData.customers.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhum contrato encontrado</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Razão Social</TableHead>
                      <TableHead>Término</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringDialogData.customers.map((customer) => (
                      <TableRow 
                        key={customer.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setExpiringDialogOpen(false);
                          navigate(`/carteira-clientes/${customer.id}`);
                        }}
                      >
                        <TableCell className="font-medium">{customer.contrato}</TableCell>
                        <TableCell>{customer.razao_social}</TableCell>
                        <TableCell>{calculateTermino(customer)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>

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
                      <TableHead>Início</TableHead>
                      <TableHead>Término</TableHead>
                      <TableHead className="text-right">Taxa Ativação</TableHead>
                      <TableHead className="text-right">Portões</TableHead>
                      <TableHead className="text-right">Zonas</TableHead>
                      <TableHead className="text-right">Câmeras</TableHead>
                      <TableHead className="text-right">Mensalidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <TableRow 
                          key={customer.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleRowClick(customer.id)}
                        >
                          <TableCell className="font-medium text-primary hover:underline">
                            {customer.contrato}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-primary hover:underline">
                            {customer.razao_social}
                          </TableCell>
                          <TableCell>{customer.filial || '-'}</TableCell>
                          <TableCell>{formatDate(customer.data_ativacao)}</TableCell>
                          <TableCell>{calculateTermino(customer)}</TableCell>
                          <TableCell className="text-right">
                            {customer.taxa_ativacao 
                              ? `R$ ${customer.taxa_ativacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="text-right">{customer.portoes}</TableCell>
                          <TableCell className="text-right">{customer.zonas_perimetro}</TableCell>
                          <TableCell className="text-right">{customer.cameras}</TableCell>
                          <TableCell className="text-right">
                            {customer.mensalidade 
                              ? `R$ ${customer.mensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : '-'
                            }
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
