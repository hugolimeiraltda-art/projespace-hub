import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Plus, 
  Loader2, 
  Trash2, 
  Edit2, 
  User, 
  Building2, 
  Phone, 
  Mail, 
  Calendar,
  Clock,
  Home
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type AdministradorTipo = 
  | 'sindico_profissional' 
  | 'sindico_organico' 
  | 'subsindico' 
  | 'conselheiro' 
  | 'zelador' 
  | 'administradora';

interface HorarioTrabalho {
  dia: string;
  inicio: string;
  fim: string;
}

interface Administrador {
  id: string;
  customer_id: string;
  tipo: AdministradorTipo;
  nome: string;
  email: string | null;
  telefone: string | null;
  data_aniversario: string | null;
  data_validade_mandato: string | null;
  numero_apto: string | null;
  numero_bloco: string | null;
  horario_trabalho: HorarioTrabalho[] | null;
  atende_celular: boolean;
  razao_social: string | null;
  endereco: string | null;
  nome_responsavel: string | null;
  created_at: string;
}

interface AdministradoresCondominioProps {
  customerId: string;
  canEdit: boolean;
}

const TIPO_LABELS: Record<AdministradorTipo, string> = {
  sindico_profissional: 'Síndico Profissional',
  sindico_organico: 'Síndico Orgânico',
  subsindico: 'Subsíndico',
  conselheiro: 'Conselheiro',
  zelador: 'Zelador',
  administradora: 'Administradora',
};

const DIAS_SEMANA = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
];

const DEFAULT_HORARIO: HorarioTrabalho[] = DIAS_SEMANA.map(dia => ({
  dia,
  inicio: '08:00',
  fim: '17:00',
}));

export function AdministradoresCondominio({ customerId, canEdit }: AdministradoresCondominioProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [administradores, setAdministradores] = useState<Administrador[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    tipo: '' as AdministradorTipo | '',
    nome: '',
    email: '',
    telefone: '',
    data_aniversario: '',
    data_validade_mandato: '',
    numero_apto: '',
    numero_bloco: '',
    horario_trabalho: DEFAULT_HORARIO,
    atende_celular: false,
    razao_social: '',
    endereco: '',
    nome_responsavel: '',
  });

  useEffect(() => {
    fetchAdministradores();
  }, [customerId]);

  const fetchAdministradores = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_administradores')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map the data to ensure proper typing for horario_trabalho
      const mapped = (data || []).map(item => ({
        ...item,
        horario_trabalho: item.horario_trabalho as unknown as HorarioTrabalho[] | null,
      })) as Administrador[];
      setAdministradores(mapped);
    } catch (error) {
      console.error('Error fetching administradores:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      tipo: '',
      nome: '',
      email: '',
      telefone: '',
      data_aniversario: '',
      data_validade_mandato: '',
      numero_apto: '',
      numero_bloco: '',
      horario_trabalho: DEFAULT_HORARIO,
      atende_celular: false,
      razao_social: '',
      endereco: '',
      nome_responsavel: '',
    });
    setEditingId(null);
  };

  const openNewDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (admin: Administrador) => {
    setEditingId(admin.id);
    setForm({
      tipo: admin.tipo,
      nome: admin.nome,
      email: admin.email || '',
      telefone: admin.telefone || '',
      data_aniversario: admin.data_aniversario || '',
      data_validade_mandato: admin.data_validade_mandato || '',
      numero_apto: admin.numero_apto || '',
      numero_bloco: admin.numero_bloco || '',
      horario_trabalho: admin.horario_trabalho || DEFAULT_HORARIO,
      atende_celular: admin.atende_celular,
      razao_social: admin.razao_social || '',
      endereco: admin.endereco || '',
      nome_responsavel: admin.nome_responsavel || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.tipo) {
      toast({ title: 'Selecione o tipo', variant: 'destructive' });
      return;
    }

    if (form.tipo === 'administradora') {
      if (!form.razao_social) {
        toast({ title: 'Informe a razão social', variant: 'destructive' });
        return;
      }
    } else {
      if (!form.nome) {
        toast({ title: 'Informe o nome', variant: 'destructive' });
        return;
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        customer_id: customerId,
        tipo: form.tipo,
        nome: form.tipo === 'administradora' ? form.nome_responsavel || form.razao_social : form.nome,
        email: form.email || null,
        telefone: form.telefone || null,
        data_aniversario: form.data_aniversario || null,
        data_validade_mandato: form.data_validade_mandato || null,
        numero_apto: form.numero_apto || null,
        numero_bloco: form.numero_bloco || null,
        horario_trabalho: form.tipo === 'zelador' ? JSON.parse(JSON.stringify(form.horario_trabalho)) : null,
        atende_celular: form.tipo === 'zelador' ? form.atende_celular : false,
        razao_social: form.tipo === 'administradora' ? form.razao_social : null,
        endereco: form.tipo === 'administradora' ? form.endereco : null,
        nome_responsavel: form.tipo === 'administradora' ? form.nome_responsavel : null,
        created_by: user?.id,
        created_by_name: user?.nome,
      };

      if (editingId) {
        const { error } = await supabase
          .from('customer_administradores')
          .update(payload as any)
          .eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Administrador atualizado!' });
      } else {
        const { error } = await supabase
          .from('customer_administradores')
          .insert(payload as any);
        if (error) throw error;
        toast({ title: 'Administrador cadastrado!' });
      }

      setDialogOpen(false);
      resetForm();
      fetchAdministradores();
    } catch (error: any) {
      console.error('Error saving administrador:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (admin: Administrador) => {
    if (!confirm(`Excluir ${admin.tipo === 'administradora' ? admin.razao_social : admin.nome}?`)) return;

    try {
      const { error } = await supabase
        .from('customer_administradores')
        .delete()
        .eq('id', admin.id);

      if (error) throw error;
      toast({ title: 'Registro excluído!' });
      fetchAdministradores();
    } catch (error: any) {
      console.error('Error deleting administrador:', error);
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateHorario = (index: number, field: 'inicio' | 'fim', value: string) => {
    const newHorarios = [...form.horario_trabalho];
    newHorarios[index] = { ...newHorarios[index], [field]: value };
    setForm({ ...form, horario_trabalho: newHorarios });
  };

  const isSindicoType = (tipo: string) => 
    ['sindico_profissional', 'sindico_organico', 'subsindico', 'conselheiro'].includes(tipo);

  const renderAdminCard = (admin: Administrador) => {
    const isAdministradora = admin.tipo === 'administradora';
    const isZelador = admin.tipo === 'zelador';

    return (
      <div
        key={admin.id}
        className="p-4 border rounded-lg bg-card hover:shadow-sm transition-shadow"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {isAdministradora ? (
                <Building2 className="w-5 h-5 text-primary" />
              ) : (
                <User className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted">
                  {TIPO_LABELS[admin.tipo]}
                </span>
              </div>
              <h4 className="font-semibold">
                {isAdministradora ? admin.razao_social : admin.nome}
              </h4>
              
              <div className="text-sm text-muted-foreground space-y-1">
                {isAdministradora && admin.nome_responsavel && (
                  <p className="flex items-center gap-2">
                    <User className="w-3 h-3" /> {admin.nome_responsavel}
                  </p>
                )}
                {admin.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="w-3 h-3" /> {admin.email}
                  </p>
                )}
                {admin.telefone && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-3 h-3" /> {admin.telefone}
                  </p>
                )}
                {isAdministradora && admin.endereco && (
                  <p className="flex items-center gap-2">
                    <Home className="w-3 h-3" /> {admin.endereco}
                  </p>
                )}
                {isSindicoType(admin.tipo) && (admin.numero_apto || admin.numero_bloco) && (
                  <p className="flex items-center gap-2">
                    <Home className="w-3 h-3" /> 
                    {admin.numero_bloco && `Bloco ${admin.numero_bloco}`}
                    {admin.numero_bloco && admin.numero_apto && ' - '}
                    {admin.numero_apto && `Apto ${admin.numero_apto}`}
                  </p>
                )}
                {admin.data_aniversario && (
                  <p className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> 
                    Aniversário: {format(new Date(admin.data_aniversario + 'T00:00:00'), 'dd/MM', { locale: ptBR })}
                  </p>
                )}
                {admin.data_validade_mandato && (
                  <p className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> 
                    Mandato até: {format(new Date(admin.data_validade_mandato + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                )}
                {isZelador && admin.atende_celular && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-primary" /> 
                    <span className="text-primary">Atende chamadas via celular</span>
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {canEdit && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => openEditDialog(admin)}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-destructive hover:text-destructive"
                onClick={() => handleDelete(admin)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Administração do Condomínio
          </CardTitle>
          {canEdit && (
            <Button onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar Administrador
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {administradores.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Nenhum administrador cadastrado.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {administradores.map(renderAdminCard)}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Administrador' : 'Novo Administrador'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Tipo de Administrador *</Label>
              <Select 
                value={form.tipo} 
                onValueChange={(v) => setForm({ ...form, tipo: v as AdministradorTipo })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sindico_profissional">Síndico Profissional</SelectItem>
                  <SelectItem value="sindico_organico">Síndico Orgânico</SelectItem>
                  <SelectItem value="subsindico">Subsíndico</SelectItem>
                  <SelectItem value="conselheiro">Conselheiro</SelectItem>
                  <SelectItem value="zelador">Zelador</SelectItem>
                  <SelectItem value="administradora">Administradora Profissional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.tipo && form.tipo !== 'administradora' && (
              <>
                <div>
                  <Label>Nome Completo *</Label>
                  <Input
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={form.telefone}
                      onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div>
                  <Label>Data de Aniversário</Label>
                  <Input
                    type="date"
                    value={form.data_aniversario}
                    onChange={(e) => setForm({ ...form, data_aniversario: e.target.value })}
                  />
                </div>

                {isSindicoType(form.tipo) && (
                  <>
                    <div>
                      <Label>Data de Validade do Mandato</Label>
                      <Input
                        type="date"
                        value={form.data_validade_mandato}
                        onChange={(e) => setForm({ ...form, data_validade_mandato: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Número do Apartamento</Label>
                        <Input
                          value={form.numero_apto}
                          onChange={(e) => setForm({ ...form, numero_apto: e.target.value })}
                          placeholder="Ex: 101"
                        />
                      </div>
                      <div>
                        <Label>Número do Bloco</Label>
                        <Input
                          value={form.numero_bloco}
                          onChange={(e) => setForm({ ...form, numero_bloco: e.target.value })}
                          placeholder="Ex: A"
                        />
                      </div>
                    </div>
                  </>
                )}

                {form.tipo === 'zelador' && (
                  <>
                    <div className="border-t pt-4">
                      <Label className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4" /> Horário de Trabalho
                      </Label>
                      <div className="space-y-2">
                        {form.horario_trabalho.map((h, idx) => (
                          <div key={h.dia} className="flex items-center gap-2">
                            <span className="w-28 text-sm">{h.dia.slice(0, 3)}</span>
                            <Input
                              type="time"
                              value={h.inicio}
                              onChange={(e) => updateHorario(idx, 'inicio', e.target.value)}
                              className="w-24"
                            />
                            <span className="text-muted-foreground">às</span>
                            <Input
                              type="time"
                              value={h.fim}
                              onChange={(e) => updateHorario(idx, 'fim', e.target.value)}
                              className="w-24"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <Switch
                        id="atende_celular"
                        checked={form.atende_celular}
                        onCheckedChange={(v) => setForm({ ...form, atende_celular: v })}
                      />
                      <Label htmlFor="atende_celular">
                        Cadastrado para atender chamadas via celular
                      </Label>
                    </div>
                  </>
                )}
              </>
            )}

            {form.tipo === 'administradora' && (
              <>
                <div>
                  <Label>Razão Social *</Label>
                  <Input
                    value={form.razao_social}
                    onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                    placeholder="Razão social da administradora"
                  />
                </div>

                <div>
                  <Label>Endereço</Label>
                  <Input
                    value={form.endereco}
                    onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                    placeholder="Endereço completo"
                  />
                </div>

                <div>
                  <Label>Nome do Responsável</Label>
                  <Input
                    value={form.nome_responsavel}
                    onChange={(e) => setForm({ ...form, nome_responsavel: e.target.value })}
                    placeholder="Nome do responsável"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={form.telefone}
                      onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.tipo}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
