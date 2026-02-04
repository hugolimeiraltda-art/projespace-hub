import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Edit2, Save, X, MapPin, Phone, Calendar, Wifi, Settings } from 'lucide-react';
import { format, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Customer {
  id: string;
  contrato: string;
  razao_social: string;
  alarme_codigo: string | null;
  filial: string | null;
  unidades: number | null;
  tipo: string | null;
  data_ativacao: string | null;
  data_termino: string | null;
  endereco: string | null;
  contato_nome: string | null;
  contato_telefone: string | null;
  sistema: string | null;
  noc: string | null;
  app: string | null;
  praca: string | null;
  mensalidade: number | null;
  taxa_ativacao: number | null;
  leitores: string | null;
  quantidade_leitores: number | null;
  transbordo: boolean | null;
  gateway: boolean | null;
  portoes: number | null;
  portas: number | null;
  dvr_nvr: number | null;
  cameras: number | null;
  zonas_perimetro: number | null;
  cancelas: number | null;
  totem_simples: number | null;
  totem_duplo: number | null;
  catracas: number | null;
  faciais_hik: number | null;
  faciais_avicam: number | null;
  faciais_outros: number | null;
}

interface CustomerInfoSectionProps {
  customer: Customer;
  onUpdate: () => void;
}

export function CustomerInfoSection({ customer, onUpdate }: CustomerInfoSectionProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contrato: customer.contrato || '',
    razao_social: customer.razao_social || '',
    alarme_codigo: customer.alarme_codigo || '',
    filial: customer.filial || '',
    unidades: customer.unidades?.toString() || '',
    tipo: customer.tipo || '',
    data_ativacao: customer.data_ativacao || '',
    data_termino: customer.data_termino || '',
    endereco: customer.endereco || '',
    contato_nome: customer.contato_nome || '',
    contato_telefone: customer.contato_telefone || '',
    sistema: customer.sistema || '',
    noc: customer.noc || '',
    app: customer.app || '',
    praca: customer.praca || '',
    mensalidade: customer.mensalidade?.toString() || '',
    taxa_ativacao: customer.taxa_ativacao?.toString() || '',
    leitores: customer.leitores || '',
    quantidade_leitores: customer.quantidade_leitores?.toString() || '',
    transbordo: customer.transbordo || false,
    gateway: customer.gateway || false,
    portoes: customer.portoes?.toString() || '0',
    portas: customer.portas?.toString() || '0',
    dvr_nvr: customer.dvr_nvr?.toString() || '0',
    cameras: customer.cameras?.toString() || '0',
    zonas_perimetro: customer.zonas_perimetro?.toString() || '0',
    cancelas: customer.cancelas?.toString() || '0',
    totem_simples: customer.totem_simples?.toString() || '0',
    totem_duplo: customer.totem_duplo?.toString() || '0',
    catracas: customer.catracas?.toString() || '0',
    faciais_hik: customer.faciais_hik?.toString() || '0',
    faciais_avicam: customer.faciais_avicam?.toString() || '0',
    faciais_outros: customer.faciais_outros?.toString() || '0',
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const calculateTermino = () => {
    if (customer.data_termino) return formatDate(customer.data_termino);
    if (!customer.data_ativacao) return '-';
    try {
      const dataInicio = parseISO(customer.data_ativacao);
      const dataTermino = addMonths(dataInicio, 36);
      return format(dataTermino, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('customer_portfolio')
        .update({
          contrato: form.contrato,
          razao_social: form.razao_social,
          alarme_codigo: form.alarme_codigo || null,
          filial: form.filial || null,
          unidades: form.unidades ? parseInt(form.unidades) : null,
          tipo: form.tipo || null,
          data_ativacao: form.data_ativacao || null,
          data_termino: form.data_termino || null,
          endereco: form.endereco || null,
          contato_nome: form.contato_nome || null,
          contato_telefone: form.contato_telefone || null,
          sistema: form.sistema || null,
          noc: form.noc || null,
          app: form.app || null,
          praca: form.praca || null,
          mensalidade: form.mensalidade ? parseFloat(form.mensalidade) : null,
          taxa_ativacao: form.taxa_ativacao ? parseFloat(form.taxa_ativacao) : null,
          leitores: form.leitores || null,
          quantidade_leitores: form.quantidade_leitores ? parseInt(form.quantidade_leitores) : null,
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
        })
        .eq('id', customer.id);

      if (error) throw error;
      toast({ title: 'Cliente atualizado', description: 'Os dados foram salvos com sucesso.' });
      setEditing(false);
      onUpdate();
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      contrato: customer.contrato || '',
      razao_social: customer.razao_social || '',
      alarme_codigo: customer.alarme_codigo || '',
      filial: customer.filial || '',
      unidades: customer.unidades?.toString() || '',
      tipo: customer.tipo || '',
      data_ativacao: customer.data_ativacao || '',
      data_termino: customer.data_termino || '',
      endereco: customer.endereco || '',
      contato_nome: customer.contato_nome || '',
      contato_telefone: customer.contato_telefone || '',
      sistema: customer.sistema || '',
      noc: customer.noc || '',
      app: customer.app || '',
      praca: customer.praca || '',
      mensalidade: customer.mensalidade?.toString() || '',
      taxa_ativacao: customer.taxa_ativacao?.toString() || '',
      leitores: customer.leitores || '',
      quantidade_leitores: customer.quantidade_leitores?.toString() || '',
      transbordo: customer.transbordo || false,
      gateway: customer.gateway || false,
      portoes: customer.portoes?.toString() || '0',
      portas: customer.portas?.toString() || '0',
      dvr_nvr: customer.dvr_nvr?.toString() || '0',
      cameras: customer.cameras?.toString() || '0',
      zonas_perimetro: customer.zonas_perimetro?.toString() || '0',
      cancelas: customer.cancelas?.toString() || '0',
      totem_simples: customer.totem_simples?.toString() || '0',
      totem_duplo: customer.totem_duplo?.toString() || '0',
      catracas: customer.catracas?.toString() || '0',
      faciais_hik: customer.faciais_hik?.toString() || '0',
      faciais_avicam: customer.faciais_avicam?.toString() || '0',
      faciais_outros: customer.faciais_outros?.toString() || '0',
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Editar Informações do Cliente
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1" /> {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Identificação */}
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-3">Identificação</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>Contrato</Label>
                <Input value={form.contrato} onChange={(e) => setForm({ ...form, contrato: e.target.value })} />
              </div>
              <div>
                <Label>Razão Social</Label>
                <Input value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} />
              </div>
              <div>
                <Label>Código Alarme</Label>
                <Input value={form.alarme_codigo} onChange={(e) => setForm({ ...form, alarme_codigo: e.target.value })} />
              </div>
              <div>
                <Label>Filial</Label>
                <Input value={form.filial} onChange={(e) => setForm({ ...form, filial: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Localização e Contato */}
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-3">Localização e Contato</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="col-span-2">
                <Label>Endereço</Label>
                <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
              </div>
              <div>
                <Label>Praça</Label>
                <Input value={form.praca} onChange={(e) => setForm({ ...form, praca: e.target.value })} />
              </div>
              <div>
                <Label>Contato Nome</Label>
                <Input value={form.contato_nome} onChange={(e) => setForm({ ...form, contato_nome: e.target.value })} />
              </div>
              <div>
                <Label>Contato Telefone</Label>
                <Input value={form.contato_telefone} onChange={(e) => setForm({ ...form, contato_telefone: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Contrato e Valores */}
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-3">Contrato e Valores</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <Label>Unidades</Label>
                <Input type="number" value={form.unidades} onChange={(e) => setForm({ ...form, unidades: e.target.value })} />
              </div>
              <div>
                <Label>Data Ativação</Label>
                <Input type="date" value={form.data_ativacao} onChange={(e) => setForm({ ...form, data_ativacao: e.target.value })} />
              </div>
              <div>
                <Label>Data Término</Label>
                <Input type="date" value={form.data_termino} onChange={(e) => setForm({ ...form, data_termino: e.target.value })} />
              </div>
              <div>
                <Label>Mensalidade (R$)</Label>
                <Input value={form.mensalidade} onChange={(e) => setForm({ ...form, mensalidade: e.target.value })} />
              </div>
              <div>
                <Label>Taxa Ativação (R$)</Label>
                <Input value={form.taxa_ativacao} onChange={(e) => setForm({ ...form, taxa_ativacao: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Sistema */}
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-3">Sistema e Configurações</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIRTUAL">Virtual</SelectItem>
                    <SelectItem value="PRESENCIAL">Presencial</SelectItem>
                    <SelectItem value="CA MONITORADO">CA Monitorado</SelectItem>
                    <SelectItem value="VIRTUAL + APOIO">Virtual + Apoio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sistema</Label>
                <Select value={form.sistema} onValueChange={(v) => setForm({ ...form, sistema: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GEAR">GEAR</SelectItem>
                    <SelectItem value="SIAM">SIAM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>NOC</Label>
                <Input value={form.noc} onChange={(e) => setForm({ ...form, noc: e.target.value })} />
              </div>
              <div>
                <Label>App</Label>
                <Input value={form.app} onChange={(e) => setForm({ ...form, app: e.target.value })} />
              </div>
              <div>
                <Label>Leitores</Label>
                <Input value={form.leitores} onChange={(e) => setForm({ ...form, leitores: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-8 mt-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.transbordo} onCheckedChange={(v) => setForm({ ...form, transbordo: v })} />
                <Label>Transbordo</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.gateway} onCheckedChange={(v) => setForm({ ...form, gateway: v })} />
                <Label>Gateway</Label>
              </div>
            </div>
          </div>

          {/* Equipamentos */}
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-3">Equipamentos</h4>
            <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
              <div>
                <Label className="text-xs">Portões</Label>
                <Input type="number" value={form.portoes} onChange={(e) => setForm({ ...form, portoes: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Portas</Label>
                <Input type="number" value={form.portas} onChange={(e) => setForm({ ...form, portas: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">DVR/NVR</Label>
                <Input type="number" value={form.dvr_nvr} onChange={(e) => setForm({ ...form, dvr_nvr: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Câmeras</Label>
                <Input type="number" value={form.cameras} onChange={(e) => setForm({ ...form, cameras: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Zonas Perímetro</Label>
                <Input type="number" value={form.zonas_perimetro} onChange={(e) => setForm({ ...form, zonas_perimetro: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Cancelas</Label>
                <Input type="number" value={form.cancelas} onChange={(e) => setForm({ ...form, cancelas: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Catracas</Label>
                <Input type="number" value={form.catracas} onChange={(e) => setForm({ ...form, catracas: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
              <div>
                <Label className="text-xs">Totem Simples</Label>
                <Input type="number" value={form.totem_simples} onChange={(e) => setForm({ ...form, totem_simples: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Totem Duplo</Label>
                <Input type="number" value={form.totem_duplo} onChange={(e) => setForm({ ...form, totem_duplo: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Faciais Hik</Label>
                <Input type="number" value={form.faciais_hik} onChange={(e) => setForm({ ...form, faciais_hik: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Faciais Avicam</Label>
                <Input type="number" value={form.faciais_avicam} onChange={(e) => setForm({ ...form, faciais_avicam: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Faciais Outros</Label>
                <Input type="number" value={form.faciais_outros} onChange={(e) => setForm({ ...form, faciais_outros: e.target.value })} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Informações do Cliente
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Edit2 className="w-4 h-4 mr-1" /> Editar
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Identificação */}
        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Identificação
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoItem label="Contrato" value={customer.contrato} />
            <InfoItem label="Código Alarme" value={customer.alarme_codigo} />
            <InfoItem label="Filial" value={customer.filial} />
            <InfoItem label="Unidades" value={customer.unidades} />
          </div>
        </div>

        {/* Localização e Contato */}
        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Localização e Contato
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoItem label="Endereço" value={customer.endereco} className="col-span-2" />
            <InfoItem label="Praça" value={customer.praca} />
            <InfoItem label="Contato" value={customer.contato_nome} />
            <InfoItem label="Telefone" value={customer.contato_telefone} />
          </div>
        </div>

        {/* Contrato e Valores */}
        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Contrato e Valores
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <InfoItem label="Data Ativação" value={formatDate(customer.data_ativacao)} />
            <InfoItem label="Término Contrato" value={calculateTermino()} />
            <InfoItem label="Mensalidade" value={customer.mensalidade ? `R$ ${customer.mensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null} />
            <InfoItem label="Taxa Ativação" value={customer.taxa_ativacao ? `R$ ${customer.taxa_ativacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null} />
            <InfoItem label="Tipo" value={customer.tipo} />
          </div>
        </div>

        {/* Sistema */}
        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4" /> Sistema
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <InfoItem label="Sistema" value={customer.sistema} />
            <InfoItem label="NOC" value={customer.noc} />
            <InfoItem label="App" value={customer.app} />
            <InfoItem label="Leitores" value={customer.leitores} />
            <InfoItem label="Qtd Leitores" value={customer.quantidade_leitores} />
          </div>
          <div className="flex gap-6 mt-3">
            <div className="flex items-center gap-2">
              <Wifi className={`w-4 h-4 ${customer.transbordo ? 'text-green-500' : 'text-muted-foreground'}`} />
              <span className="text-sm">Transbordo: {customer.transbordo ? 'Sim' : 'Não'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Wifi className={`w-4 h-4 ${customer.gateway ? 'text-green-500' : 'text-muted-foreground'}`} />
              <span className="text-sm">Gateway: {customer.gateway ? 'Sim' : 'Não'}</span>
            </div>
          </div>
        </div>

        {/* Equipamentos */}
        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-3">Equipamentos</h4>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
            <EquipItem label="Portões" value={customer.portoes} />
            <EquipItem label="Portas" value={customer.portas} />
            <EquipItem label="DVR/NVR" value={customer.dvr_nvr} />
            <EquipItem label="Câmeras" value={customer.cameras} />
            <EquipItem label="Zonas" value={customer.zonas_perimetro} />
            <EquipItem label="Cancelas" value={customer.cancelas} />
            <EquipItem label="Catracas" value={customer.catracas} />
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mt-3">
            <EquipItem label="Totem Simples" value={customer.totem_simples} />
            <EquipItem label="Totem Duplo" value={customer.totem_duplo} />
            <EquipItem label="Faciais Hik" value={customer.faciais_hik} />
            <EquipItem label="Faciais Avicam" value={customer.faciais_avicam} />
            <EquipItem label="Faciais Outros" value={customer.faciais_outros} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoItem({ label, value, className }: { label: string; value: string | number | null | undefined; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-sm">{value || '-'}</p>
    </div>
  );
}

function EquipItem({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="text-center p-2 bg-muted/50 rounded">
      <p className="text-lg font-bold">{value || 0}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
