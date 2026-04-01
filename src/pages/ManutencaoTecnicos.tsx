import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Search, Upload, FileText, Trash2, User, Building2, Edit, Eye, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface Tecnico {
  id: string;
  tipo_pessoa: string;
  nome: string;
  cpf_cnpj: string | null;
  rg: string | null;
  data_nascimento: string | null;
  email: string | null;
  telefone: string | null;
  telefone2: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  tipo_conta: string | null;
  pix: string | null;
  especialidade: string | null;
  observacoes: string | null;
  empresa: string[] | null;
  praca: string[] | null;
  tipo_vinculo: string;
  cargo: string | null;
  data_admissao: string | null;
  ctps: string | null;
  pis: string | null;
  ativo: boolean;
  created_at: string;
}

interface TecnicoDoc {
  id: string;
  tecnico_id: string;
  nome_arquivo: string;
  arquivo_url: string;
  tipo_documento: string | null;
  tamanho: number | null;
  created_at: string;
}

const EMPRESAS = ['Graber', 'Emive'];
const PRACAS = ['SPO', 'VIX', 'RJO', 'BHZ'];
const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const TIPOS_DOCUMENTO = [
  { value: 'cnpj', label: 'Certificado CNPJ' },
  { value: 'foto', label: 'Foto' },
  { value: 'identidade', label: 'Identidade (RG/CNH)' },
  { value: 'contrato', label: 'Contrato / Termo de Confidencialidade' },
  { value: 'comprovante_endereco', label: 'Comprovante de Endereço' },
  { value: 'doc_veiculo', label: 'Documentação do Veículo' },
  { value: 'nada_consta', label: 'Atestado de Nada Consta' },
  { value: 'outro', label: 'Outro' },
];

const emptyForm = {
  tipo_pessoa: 'PJ' as string,
  nome: '',
  cpf_cnpj: '',
  rg: '',
  data_nascimento: '',
  email: '',
  telefone: '',
  telefone2: '',
  endereco: '',
  cidade: '',
  estado: '',
  cep: '',
  razao_social: '',
  nome_fantasia: '',
  inscricao_estadual: '',
  inscricao_municipal: '',
  banco: '',
  agencia: '',
  conta: '',
  tipo_conta: '',
  pix: '',
  especialidade: '',
  observacoes: '',
  empresa: [] as string[],
  praca: [] as string[],
  tipo_vinculo: 'PJ' as string,
  cargo: '',
  data_admissao: '',
  ctps: '',
  pis: '',
};

const ManutencaoTecnicos = () => {
  const { user } = useAuth();
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterVinculo, setFilterVinculo] = useState<string>('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingTecnico, setViewingTecnico] = useState<Tecnico | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [docs, setDocs] = useState<TecnicoDoc[]>([]);
  const [formDocs, setFormDocs] = useState<TecnicoDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);

  const fetchTecnicos = async () => {
    const { data, error } = await supabase
      .from('manutencao_tecnicos')
      .select('*')
      .order('nome');
    if (error) { toast.error('Erro ao carregar técnicos'); return; }
    setTecnicos(data || []);
    setLoading(false);
  };

  const fetchDocs = async (tecnicoId: string) => {
    const { data } = await supabase
      .from('manutencao_tecnico_documentos')
      .select('*')
      .eq('tecnico_id', tecnicoId)
      .order('created_at', { ascending: false });
    setDocs(data || []);
  };

  useEffect(() => { fetchTecnicos(); }, []);

  const updateField = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    const payload = {
      ...form,
      created_by: user?.id,
      created_by_name: user?.email,
    };
    let error;
    if (editingId) {
      const { created_by, created_by_name, ...updatePayload } = payload;
      ({ error } = await supabase.from('manutencao_tecnicos').update(updatePayload).eq('id', editingId));
    } else {
      const { data: insertData, error: insertError } = await supabase.from('manutencao_tecnicos').insert(payload).select().single();
      error = insertError;
      if (!insertError && insertData) {
        toast.success('Técnico cadastrado! Agora você pode anexar documentos.');
        setEditingId(insertData.id);
        fetchFormDocs(insertData.id);
        fetchTecnicos();
        return;
      }
    }
    if (error) { toast.error('Erro ao salvar técnico'); return; }
    toast.success('Técnico atualizado!');
    setDialogOpen(false);
    setForm(emptyForm);
    setEditingId(null);
    setFormDocs([]);
    fetchTecnicos();
  };

  const handleEdit = (t: Tecnico) => {
    setEditingId(t.id);
    setForm({
      tipo_pessoa: t.tipo_pessoa,
      nome: t.nome,
      cpf_cnpj: t.cpf_cnpj || '',
      rg: t.rg || '',
      data_nascimento: t.data_nascimento || '',
      email: t.email || '',
      telefone: t.telefone || '',
      telefone2: t.telefone2 || '',
      endereco: t.endereco || '',
      cidade: t.cidade || '',
      estado: t.estado || '',
      cep: t.cep || '',
      razao_social: t.razao_social || '',
      nome_fantasia: t.nome_fantasia || '',
      inscricao_estadual: t.inscricao_estadual || '',
      inscricao_municipal: t.inscricao_municipal || '',
      banco: t.banco || '',
      agencia: t.agencia || '',
      conta: t.conta || '',
      tipo_conta: t.tipo_conta || '',
      pix: t.pix || '',
      especialidade: t.especialidade || '',
      observacoes: t.observacoes || '',
      empresa: t.empresa || [],
      praca: t.praca || [],
      tipo_vinculo: t.tipo_vinculo,
      cargo: t.cargo || '',
      data_admissao: t.data_admissao || '',
      ctps: t.ctps || '',
      pis: t.pis || '',
    });
    fetchFormDocs(t.id);
    setDialogOpen(true);
  };

  const handleView = (t: Tecnico) => {
    setViewingTecnico(t);
    fetchDocs(t.id);
    setViewDialogOpen(true);
  };

  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>, tecnicoId: string, categoria?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    if (categoria) setUploadingCategory(categoria);
    const filePath = `${tecnicoId}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from('prestador-documentos').upload(filePath, file);
    if (upErr) { toast.error('Erro ao enviar arquivo'); setUploading(false); setUploadingCategory(null); return; }
    const { data: urlData } = supabase.storage.from('prestador-documentos').getPublicUrl(filePath);
    await supabase.from('manutencao_tecnico_documentos').insert({
      tecnico_id: tecnicoId,
      nome_arquivo: file.name,
      arquivo_url: urlData.publicUrl,
      tipo_documento: categoria || file.type,
      tamanho: file.size,
    });
    toast.success('Documento enviado!');
    fetchDocs(tecnicoId);
    if (editingId === tecnicoId) fetchFormDocs(tecnicoId);
    setUploading(false);
    setUploadingCategory(null);
    e.target.value = '';
  };

  const fetchFormDocs = async (tecnicoId: string) => {
    const { data } = await supabase
      .from('manutencao_tecnico_documentos')
      .select('*')
      .eq('tecnico_id', tecnicoId)
      .order('created_at', { ascending: false });
    setFormDocs(data || []);
  };

  const handleDeleteDoc = async (docId: string, tecnicoId: string) => {
    await supabase.from('manutencao_tecnico_documentos').delete().eq('id', docId);
    toast.success('Documento removido');
    fetchDocs(tecnicoId);
    fetchFormDocs(tecnicoId);
  };

  const handleToggleAtivo = async (t: Tecnico) => {
    await supabase.from('manutencao_tecnicos').update({ ativo: !t.ativo }).eq('id', t.id);
    fetchTecnicos();
  };

  const filtered = tecnicos.filter(t => {
    const matchSearch = t.nome.toLowerCase().includes(search.toLowerCase()) ||
      (t.cpf_cnpj || '').includes(search) ||
      (t.razao_social || '').toLowerCase().includes(search.toLowerCase());
    const matchVinculo = filterVinculo === 'todos' || t.tipo_vinculo === filterVinculo;
    return matchSearch && matchVinculo;
  });

  const renderPJFields = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Razão Social</Label><Input value={form.razao_social} onChange={e => updateField('razao_social', e.target.value)} /></div>
        <div><Label>Nome Fantasia</Label><Input value={form.nome_fantasia} onChange={e => updateField('nome_fantasia', e.target.value)} /></div>
        <div><Label>CNPJ</Label><Input value={form.cpf_cnpj} onChange={e => updateField('cpf_cnpj', e.target.value)} /></div>
        <div><Label>Inscrição Estadual</Label><Input value={form.inscricao_estadual} onChange={e => updateField('inscricao_estadual', e.target.value)} /></div>
        <div><Label>Inscrição Municipal</Label><Input value={form.inscricao_municipal} onChange={e => updateField('inscricao_municipal', e.target.value)} /></div>
        <div><Label>Nome do Responsável</Label><Input value={form.nome} onChange={e => updateField('nome', e.target.value)} /></div>
      </div>
    </>
  );

  const renderPFFields = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Nome Completo</Label><Input value={form.nome} onChange={e => updateField('nome', e.target.value)} /></div>
        <div><Label>CPF</Label><Input value={form.cpf_cnpj} onChange={e => updateField('cpf_cnpj', e.target.value)} /></div>
        <div><Label>RG</Label><Input value={form.rg} onChange={e => updateField('rg', e.target.value)} /></div>
        <div><Label>Data de Nascimento</Label><Input type="date" value={form.data_nascimento} onChange={e => updateField('data_nascimento', e.target.value)} /></div>
      </div>
    </>
  );

  const renderCLTFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 mt-4">
      <h3 className="col-span-full font-semibold text-foreground">Dados CLT</h3>
      <div><Label>Cargo</Label><Input value={form.cargo} onChange={e => updateField('cargo', e.target.value)} /></div>
      <div><Label>Data de Admissão</Label><Input type="date" value={form.data_admissao} onChange={e => updateField('data_admissao', e.target.value)} /></div>
      <div><Label>CTPS</Label><Input value={form.ctps} onChange={e => updateField('ctps', e.target.value)} /></div>
      <div><Label>PIS</Label><Input value={form.pis} onChange={e => updateField('pis', e.target.value)} /></div>
    </div>
  );

  return (
    <Layout>
      <div className="w-full">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cadastro de Técnicos</h1>
            <p className="text-muted-foreground">Gestão de técnicos PJ e CLT da manutenção</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setForm(emptyForm); setEditingId(null); setFormDocs([]); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Novo Técnico</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar Técnico' : 'Novo Técnico'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de Vínculo *</Label>
                    <Select value={form.tipo_vinculo} onValueChange={v => { updateField('tipo_vinculo', v); updateField('tipo_pessoa', v === 'CLT' ? 'PF' : 'PJ'); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PJ">Pessoa Jurídica (PJ)</SelectItem>
                        <SelectItem value="CLT">CLT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo de Pessoa</Label>
                    <Select value={form.tipo_pessoa} onValueChange={v => updateField('tipo_pessoa', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                        <SelectItem value="PF">Pessoa Física</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {form.tipo_pessoa === 'PJ' ? renderPJFields() : renderPFFields()}

                {form.tipo_vinculo === 'CLT' && renderCLTFields()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                  <h3 className="col-span-full font-semibold text-foreground">Contato</h3>
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} /></div>
                  <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => updateField('telefone', e.target.value)} /></div>
                  <div><Label>Telefone 2</Label><Input value={form.telefone2} onChange={e => updateField('telefone2', e.target.value)} /></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                  <h3 className="col-span-full font-semibold text-foreground">Endereço</h3>
                  <div className="col-span-2"><Label>Endereço</Label><Input value={form.endereco} onChange={e => updateField('endereco', e.target.value)} /></div>
                  <div><Label>CEP</Label><Input value={form.cep} onChange={e => updateField('cep', e.target.value)} /></div>
                  <div><Label>Cidade</Label><Input value={form.cidade} onChange={e => updateField('cidade', e.target.value)} /></div>
                  <div>
                    <Label>Estado</Label>
                    <Select value={form.estado} onValueChange={v => updateField('estado', v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{ESTADOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                  <h3 className="col-span-full font-semibold text-foreground">Dados Bancários</h3>
                  <div><Label>Banco</Label><Input value={form.banco} onChange={e => updateField('banco', e.target.value)} /></div>
                  <div><Label>Agência</Label><Input value={form.agencia} onChange={e => updateField('agencia', e.target.value)} /></div>
                  <div><Label>Conta</Label><Input value={form.conta} onChange={e => updateField('conta', e.target.value)} /></div>
                  <div>
                    <Label>Tipo Conta</Label>
                    <Select value={form.tipo_conta} onValueChange={v => updateField('tipo_conta', v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corrente">Corrente</SelectItem>
                        <SelectItem value="poupanca">Poupança</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>PIX</Label><Input value={form.pix} onChange={e => updateField('pix', e.target.value)} /></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                  <h3 className="col-span-full font-semibold text-foreground">Empresa e Praça</h3>
                  <div>
                    <Label>Empresa</Label>
                    <div className="flex gap-4 mt-1">
                      {EMPRESAS.map(emp => (
                        <label key={emp} className="flex items-center gap-2">
                          <Checkbox checked={form.empresa.includes(emp)} onCheckedChange={(checked) => {
                            const next = checked ? [...form.empresa, emp] : form.empresa.filter(x => x !== emp);
                            updateField('empresa', next);
                          }} />
                          {emp}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Praça</Label>
                    <div className="flex gap-4 mt-1">
                      {PRACAS.map(p => (
                        <label key={p} className="flex items-center gap-2">
                          <Checkbox checked={form.praca.includes(p)} onCheckedChange={(checked) => {
                            const next = checked ? [...form.praca, p] : form.praca.filter(x => x !== p);
                            updateField('praca', next);
                          }} />
                          {p}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 border-t pt-4">
                  <div>
                    <Label>Certificações e Homologações</Label>
                    {editingId ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full mt-1 justify-start"
                        onClick={() => { setDialogOpen(false); navigate(`/manutencao/tecnicos/${editingId}/certificacoes`); }}
                      >
                        <Award className="h-4 w-4 mr-2" />
                        Ver Certificações e Homologações
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">Salve o cadastro primeiro para gerenciar certificações.</p>
                    )}
                  </div>
                  <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => updateField('observacoes', e.target.value)} /></div>
                </div>

                {/* Documentos */}
                <div className="border-t pt-4 space-y-3">
                  <h3 className="font-semibold text-foreground">Documentos</h3>
                  {!editingId ? (
                    <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 text-center">
                      Salve o cadastro primeiro para anexar documentos.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {TIPOS_DOCUMENTO.map(tipo => {
                        const docExistente = formDocs.find(d => d.tipo_documento === tipo.value);
                        return (
                          <div key={tipo.value} className="flex items-center justify-between border rounded-lg p-3 bg-muted/20">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{tipo.label}</p>
                                {docExistente ? (
                                  <a href={docExistente.arquivo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">
                                    {docExistente.nome_arquivo}
                                  </a>
                                ) : (
                                  <p className="text-xs text-muted-foreground">Não enviado</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {docExistente && (
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteDoc(docExistente.id, editingId)}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              )}
                              <label className="cursor-pointer">
                                <input type="file" className="hidden" onChange={e => handleUploadDoc(e, editingId, tipo.value)} disabled={uploading} />
                                <Button variant="outline" size="sm" asChild disabled={uploading && uploadingCategory === tipo.value}>
                                  <span><Upload className="h-3 w-3 mr-1" />{uploading && uploadingCategory === tipo.value ? '...' : docExistente ? 'Trocar' : 'Enviar'}</span>
                                </Button>
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => { setDialogOpen(false); setForm(emptyForm); setEditingId(null); }}>Cancelar</Button>
                  <Button onClick={handleSave}>{editingId ? 'Salvar Alterações' : 'Cadastrar'}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, CPF/CNPJ..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterVinculo} onValueChange={setFilterVinculo}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
              <SelectItem value="CLT">CLT</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Vínculo</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Praça</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum técnico encontrado</TableCell></TableRow>
                ) : filtered.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {t.tipo_pessoa === 'PJ' ? <Building2 className="h-4 w-4 text-muted-foreground" /> : <User className="h-4 w-4 text-muted-foreground" />}
                        <div>
                          <div>{t.tipo_pessoa === 'PJ' ? t.razao_social || t.nome : t.nome}</div>
                          {t.tipo_pessoa === 'PJ' && t.nome_fantasia && <div className="text-xs text-muted-foreground">{t.nome_fantasia}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={t.tipo_vinculo === 'CLT' ? 'default' : 'secondary'}>{t.tipo_vinculo}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{t.cpf_cnpj || '-'}</TableCell>
                    <TableCell>{(t.empresa || []).map(e => <Badge key={e} variant="outline" className="mr-1">{e}</Badge>)}</TableCell>
                    <TableCell>{(t.praca || []).map(p => <Badge key={p} variant="outline" className="mr-1">{p}</Badge>)}</TableCell>
                    <TableCell className="text-muted-foreground">{t.especialidade || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{t.telefone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={t.ativo ? 'default' : 'destructive'}>{t.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleView(t)}><Eye className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(t)}><Edit className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleToggleAtivo(t)}>
                          {t.ativo ? '🔒' : '🔓'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog de Visualização */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Técnico</DialogTitle>
            </DialogHeader>
            {viewingTecnico && (
              <Tabs defaultValue="dados">
                <TabsList>
                  <TabsTrigger value="dados">Dados Cadastrais</TabsTrigger>
                  <TabsTrigger value="documentos">Documentos ({docs.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="dados" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div><Label className="text-muted-foreground text-xs">Tipo Vínculo</Label><p className="font-medium">{viewingTecnico.tipo_vinculo}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Tipo Pessoa</Label><p className="font-medium">{viewingTecnico.tipo_pessoa}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Status</Label><Badge variant={viewingTecnico.ativo ? 'default' : 'destructive'}>{viewingTecnico.ativo ? 'Ativo' : 'Inativo'}</Badge></div>
                    {viewingTecnico.tipo_pessoa === 'PJ' && (
                      <>
                        <div><Label className="text-muted-foreground text-xs">Razão Social</Label><p className="font-medium">{viewingTecnico.razao_social || '-'}</p></div>
                        <div><Label className="text-muted-foreground text-xs">Nome Fantasia</Label><p className="font-medium">{viewingTecnico.nome_fantasia || '-'}</p></div>
                        <div><Label className="text-muted-foreground text-xs">CNPJ</Label><p className="font-medium">{viewingTecnico.cpf_cnpj || '-'}</p></div>
                      </>
                    )}
                    {viewingTecnico.tipo_pessoa === 'PF' && (
                      <>
                        <div><Label className="text-muted-foreground text-xs">Nome</Label><p className="font-medium">{viewingTecnico.nome}</p></div>
                        <div><Label className="text-muted-foreground text-xs">CPF</Label><p className="font-medium">{viewingTecnico.cpf_cnpj || '-'}</p></div>
                        <div><Label className="text-muted-foreground text-xs">RG</Label><p className="font-medium">{viewingTecnico.rg || '-'}</p></div>
                      </>
                    )}
                    <div><Label className="text-muted-foreground text-xs">Email</Label><p className="font-medium">{viewingTecnico.email || '-'}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Telefone</Label><p className="font-medium">{viewingTecnico.telefone || '-'}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Especialidade</Label><p className="font-medium">{viewingTecnico.especialidade || '-'}</p></div>
                    {viewingTecnico.tipo_vinculo === 'CLT' && (
                      <>
                        <div><Label className="text-muted-foreground text-xs">Cargo</Label><p className="font-medium">{viewingTecnico.cargo || '-'}</p></div>
                        <div><Label className="text-muted-foreground text-xs">Data Admissão</Label><p className="font-medium">{viewingTecnico.data_admissao || '-'}</p></div>
                        <div><Label className="text-muted-foreground text-xs">CTPS</Label><p className="font-medium">{viewingTecnico.ctps || '-'}</p></div>
                        <div><Label className="text-muted-foreground text-xs">PIS</Label><p className="font-medium">{viewingTecnico.pis || '-'}</p></div>
                      </>
                    )}
                  </div>
                  <div className="border-t pt-4">
                    <Label className="text-muted-foreground text-xs">Empresa</Label>
                    <div className="flex gap-2 mt-1">{(viewingTecnico.empresa || []).map(e => <Badge key={e} variant="outline">{e}</Badge>)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Praça</Label>
                    <div className="flex gap-2 mt-1">{(viewingTecnico.praca || []).map(p => <Badge key={p} variant="outline">{p}</Badge>)}</div>
                  </div>
                  {viewingTecnico.observacoes && (
                    <div><Label className="text-muted-foreground text-xs">Observações</Label><p>{viewingTecnico.observacoes}</p></div>
                  )}
                </TabsContent>
                <TabsContent value="documentos" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {TIPOS_DOCUMENTO.map(tipo => {
                      const docExistente = docs.find(d => d.tipo_documento === tipo.value);
                      return (
                        <div key={tipo.value} className="flex items-center justify-between border rounded-lg p-3 bg-muted/20">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{tipo.label}</p>
                              {docExistente ? (
                                <a href={docExistente.arquivo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">
                                  {docExistente.nome_arquivo}
                                </a>
                              ) : (
                                <p className="text-xs text-muted-foreground">Não enviado</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {docExistente && (
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteDoc(docExistente.id, viewingTecnico.id)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            )}
                            <label className="cursor-pointer">
                              <input type="file" className="hidden" onChange={e => handleUploadDoc(e, viewingTecnico.id, tipo.value)} disabled={uploading} />
                              <Button variant="outline" size="sm" asChild disabled={uploading && uploadingCategory === tipo.value}>
                                <span><Upload className="h-3 w-3 mr-1" />{uploading && uploadingCategory === tipo.value ? '...' : docExistente ? 'Trocar' : 'Enviar'}</span>
                              </Button>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ManutencaoTecnicos;
