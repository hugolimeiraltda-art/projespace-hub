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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Search, Upload, FileText, Trash2, User, Building2, Edit, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';

interface Prestador {
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
  produtos_homologados: string[] | null;
  ativo: boolean;
  created_at: string;
}

interface PrestadorDoc {
  id: string;
  prestador_id: string;
  nome_arquivo: string;
  arquivo_url: string;
  tipo_documento: string | null;
  tamanho: number | null;
  created_at: string;
}

const EMPRESAS = ['Graber', 'Emive'];
const PRACAS = ['SPO', 'VIX', 'RJO', 'BHZ'];
const PRODUTOS_HOMOLOGADOS = [
  'Portaria Digital',
  'Portaria Presencial',
  'Portaria Expressa',
  'Totens - Emive Vision',
  'Infraestrutura Grande Porte Subterrânea e Aérea',
  'Infraestrutura Médio Porte',
  'Fibra Óptica',
  'Rádios',
  'Painéis Fotovoltaicos',
  'Laços Indutivos',
];


const emptyForm = {
  tipo_pessoa: 'PJ',
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
};

export default function ImplantacaoBancoPrestadores() {
  const { user } = useAuth();
  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedPrestador, setSelectedPrestador] = useState<Prestador | null>(null);
  const [docs, setDocs] = useState<PrestadorDoc[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchPrestadores(); }, []);

  const fetchPrestadores = async () => {
    const { data } = await supabase.from('prestadores').select('*').order('nome');
    if (data) setPrestadores(data as any);
    setLoading(false);
  };

  const fetchDocs = async (prestadorId: string) => {
    const { data } = await supabase.from('prestador_documentos').select('*').eq('prestador_id', prestadorId).order('created_at', { ascending: false });
    if (data) setDocs(data as any);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: Prestador) => {
    setEditingId(p.id);
    setForm({
      tipo_pessoa: p.tipo_pessoa,
      nome: p.nome,
      cpf_cnpj: p.cpf_cnpj || '',
      rg: p.rg || '',
      data_nascimento: p.data_nascimento || '',
      email: p.email || '',
      telefone: p.telefone || '',
      telefone2: p.telefone2 || '',
      endereco: p.endereco || '',
      cidade: p.cidade || '',
      estado: p.estado || '',
      cep: p.cep || '',
      razao_social: p.razao_social || '',
      nome_fantasia: p.nome_fantasia || '',
      inscricao_estadual: p.inscricao_estadual || '',
      inscricao_municipal: p.inscricao_municipal || '',
      banco: p.banco || '',
      agencia: p.agencia || '',
      conta: p.conta || '',
      tipo_conta: p.tipo_conta || '',
      pix: p.pix || '',
      especialidade: p.especialidade || '',
      observacoes: p.observacoes || '',
    });
    setDialogOpen(true);
  };

  const openDetail = (p: Prestador) => {
    setSelectedPrestador(p);
    fetchDocs(p.id);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório.'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        cpf_cnpj: form.cpf_cnpj || null,
        rg: form.rg || null,
        data_nascimento: form.data_nascimento || null,
        email: form.email || null,
        telefone: form.telefone || null,
        telefone2: form.telefone2 || null,
        endereco: form.endereco || null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        cep: form.cep || null,
        razao_social: form.razao_social || null,
        nome_fantasia: form.nome_fantasia || null,
        inscricao_estadual: form.inscricao_estadual || null,
        inscricao_municipal: form.inscricao_municipal || null,
        banco: form.banco || null,
        agencia: form.agencia || null,
        conta: form.conta || null,
        tipo_conta: form.tipo_conta || null,
        pix: form.pix || null,
        especialidade: form.especialidade || null,
        observacoes: form.observacoes || null,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase.from('prestadores').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Prestador atualizado.');
      } else {
        const { error } = await supabase.from('prestadores').insert({
          ...payload,
          created_by: user?.id,
          created_by_name: user?.nome,
        });
        if (error) throw error;
        toast.success('Prestador cadastrado.');
      }
      setDialogOpen(false);
      fetchPrestadores();
    } catch {
      toast.error('Erro ao salvar prestador.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedPrestador || !e.target.files?.length) return;
    setUploading(true);
    try {
      const file = e.target.files[0];
      const path = `${selectedPrestador.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('prestador-documentos').upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('prestador-documentos').getPublicUrl(path);
      const { error } = await supabase.from('prestador_documentos').insert({
        prestador_id: selectedPrestador.id,
        nome_arquivo: file.name,
        arquivo_url: urlData.publicUrl,
        tipo_documento: file.name.split('.').pop()?.toUpperCase() || null,
        tamanho: file.size,
        created_by: user?.id,
      });
      if (error) throw error;
      toast.success('Documento anexado.');
      fetchDocs(selectedPrestador.id);
    } catch {
      toast.error('Erro ao enviar documento.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteDoc = async (doc: PrestadorDoc) => {
    if (!confirm('Remover documento?')) return;
    await supabase.from('prestador_documentos').delete().eq('id', doc.id);
    toast.success('Documento removido.');
    if (selectedPrestador) fetchDocs(selectedPrestador.id);
  };

  const filtered = prestadores.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    (p.cpf_cnpj && p.cpf_cnpj.includes(search)) ||
    (p.especialidade && p.especialidade.toLowerCase().includes(search.toLowerCase()))
  );

  const updateField = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <User className="w-7 h-7 text-primary" />
              Banco de Prestadores
            </h1>
            <p className="text-muted-foreground text-sm">Cadastro de instaladores e prestadores de serviço</p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Prestador
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, CPF/CNPJ ou especialidade..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum prestador encontrado</TableCell></TableRow>
                ) : filtered.map(p => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(p)}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {p.tipo_pessoa === 'PJ' ? <><Building2 className="w-3 h-3 mr-1 inline" />PJ</> : <><User className="w-3 h-3 mr-1 inline" />PF</>}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.cpf_cnpj || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.telefone || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.especialidade || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={p.ativo ? 'default' : 'secondary'} className="text-[10px]">
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(p); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Prestador' : 'Novo Prestador'}</DialogTitle>
            </DialogHeader>

            <Tabs defaultValue={form.tipo_pessoa} onValueChange={v => updateField('tipo_pessoa', v)}>
              <TabsList className="mb-4">
                <TabsTrigger value="PJ" className="gap-2"><Building2 className="w-4 h-4" /> Pessoa Jurídica</TabsTrigger>
                <TabsTrigger value="PF" className="gap-2"><User className="w-4 h-4" /> Pessoa Física</TabsTrigger>
              </TabsList>

              {/* Common fields */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dados Pessoais</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Nome Completo *</Label>
                    <Input value={form.nome} onChange={e => updateField('nome', e.target.value)} />
                  </div>
                  <div>
                    <Label>{form.tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'}</Label>
                    <Input value={form.cpf_cnpj} onChange={e => updateField('cpf_cnpj', e.target.value)} />
                  </div>
                  {form.tipo_pessoa === 'PF' && (
                    <>
                      <div>
                        <Label>RG</Label>
                        <Input value={form.rg} onChange={e => updateField('rg', e.target.value)} />
                      </div>
                      <div>
                        <Label>Data de Nascimento</Label>
                        <Input type="date" value={form.data_nascimento} onChange={e => updateField('data_nascimento', e.target.value)} />
                      </div>
                    </>
                  )}
                  {form.tipo_pessoa === 'PJ' && (
                    <>
                      <div>
                        <Label>Razão Social</Label>
                        <Input value={form.razao_social} onChange={e => updateField('razao_social', e.target.value)} />
                      </div>
                      <div>
                        <Label>Nome Fantasia</Label>
                        <Input value={form.nome_fantasia} onChange={e => updateField('nome_fantasia', e.target.value)} />
                      </div>
                      <div>
                        <Label>Inscrição Estadual</Label>
                        <Input value={form.inscricao_estadual} onChange={e => updateField('inscricao_estadual', e.target.value)} />
                      </div>
                      <div>
                        <Label>Inscrição Municipal</Label>
                        <Input value={form.inscricao_municipal} onChange={e => updateField('inscricao_municipal', e.target.value)} />
                      </div>
                    </>
                  )}
                </div>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Contato</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>E-mail</Label>
                    <Input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input value={form.telefone} onChange={e => updateField('telefone', e.target.value)} />
                  </div>
                  <div>
                    <Label>Telefone 2</Label>
                    <Input value={form.telefone2} onChange={e => updateField('telefone2', e.target.value)} />
                  </div>
                </div>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Endereço</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Label>Endereço</Label>
                    <Input value={form.endereco} onChange={e => updateField('endereco', e.target.value)} />
                  </div>
                  <div>
                    <Label>CEP</Label>
                    <Input value={form.cep} onChange={e => updateField('cep', e.target.value)} />
                  </div>
                  <div>
                    <Label>Cidade</Label>
                    <Input value={form.cidade} onChange={e => updateField('cidade', e.target.value)} />
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Select value={form.estado} onValueChange={v => updateField('estado', v)}>
                      <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                      <SelectContent>
                        {ESTADOS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Dados Bancários</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label>Banco</Label>
                    <Input value={form.banco} onChange={e => updateField('banco', e.target.value)} />
                  </div>
                  <div>
                    <Label>Agência</Label>
                    <Input value={form.agencia} onChange={e => updateField('agencia', e.target.value)} />
                  </div>
                  <div>
                    <Label>Conta</Label>
                    <Input value={form.conta} onChange={e => updateField('conta', e.target.value)} />
                  </div>
                  <div>
                    <Label>Tipo de Conta</Label>
                    <Select value={form.tipo_conta} onValueChange={v => updateField('tipo_conta', v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corrente">Corrente</SelectItem>
                        <SelectItem value="poupanca">Poupança</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Chave PIX</Label>
                    <Input value={form.pix} onChange={e => updateField('pix', e.target.value)} />
                  </div>
                </div>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Informações Profissionais</p>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label>Especialidade</Label>
                    <Input placeholder="Ex: Instalação CFTV, Cabeamento, Serralheria..." value={form.especialidade} onChange={e => updateField('especialidade', e.target.value)} />
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Textarea value={form.observacoes} onChange={e => updateField('observacoes', e.target.value)} rows={3} />
                  </div>
                </div>
              </div>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={!!selectedPrestador} onOpenChange={(open) => !open && setSelectedPrestador(null)}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            {selectedPrestador && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {selectedPrestador.tipo_pessoa === 'PJ' ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    {selectedPrestador.nome}
                    <Badge variant={selectedPrestador.ativo ? 'default' : 'secondary'} className="ml-2">{selectedPrestador.ativo ? 'Ativo' : 'Inativo'}</Badge>
                  </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="dados">
                  <TabsList>
                    <TabsTrigger value="dados">Dados Cadastrais</TabsTrigger>
                    <TabsTrigger value="documentos">Documentos ({docs.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="dados" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                      <div><span className="text-muted-foreground text-xs block">Tipo</span>{selectedPrestador.tipo_pessoa === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}</div>
                      <div><span className="text-muted-foreground text-xs block">{selectedPrestador.tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'}</span>{selectedPrestador.cpf_cnpj || '—'}</div>
                      {selectedPrestador.tipo_pessoa === 'PF' && <div><span className="text-muted-foreground text-xs block">RG</span>{selectedPrestador.rg || '—'}</div>}
                      {selectedPrestador.tipo_pessoa === 'PJ' && <div><span className="text-muted-foreground text-xs block">Razão Social</span>{selectedPrestador.razao_social || '—'}</div>}
                      <div><span className="text-muted-foreground text-xs block">E-mail</span>{selectedPrestador.email || '—'}</div>
                      <div><span className="text-muted-foreground text-xs block">Telefone</span>{selectedPrestador.telefone || '—'}</div>
                      <div><span className="text-muted-foreground text-xs block">Especialidade</span>{selectedPrestador.especialidade || '—'}</div>
                      <div className="col-span-2"><span className="text-muted-foreground text-xs block">Endereço</span>{[selectedPrestador.endereco, selectedPrestador.cidade, selectedPrestador.estado].filter(Boolean).join(', ') || '—'}</div>
                      <div><span className="text-muted-foreground text-xs block">PIX</span>{selectedPrestador.pix || '—'}</div>
                      <div><span className="text-muted-foreground text-xs block">Banco</span>{[selectedPrestador.banco, selectedPrestador.agencia, selectedPrestador.conta].filter(Boolean).join(' / ') || '—'}</div>
                    </div>
                    {selectedPrestador.observacoes && (
                      <div>
                        <span className="text-muted-foreground text-xs block mb-1">Observações</span>
                        <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedPrestador.observacoes}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => { setSelectedPrestador(null); openEdit(selectedPrestador); }}>
                        <Edit className="w-4 h-4 mr-2" /> Editar
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="documentos" className="space-y-4 mt-4">
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer">
                        <input type="file" className="hidden" onChange={handleUploadDoc} disabled={uploading} />
                        <Button variant="outline" size="sm" className="gap-2" asChild disabled={uploading}>
                          <span><Upload className="w-4 h-4" /> {uploading ? 'Enviando...' : 'Anexar Documento'}</span>
                        </Button>
                      </label>
                      <span className="text-xs text-muted-foreground">Contratos, documentos pessoais, certidões, etc.</span>
                    </div>

                    {docs.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Nenhum documento anexado</p>
                    ) : (
                      <div className="space-y-2">
                        {docs.map(doc => (
                          <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-primary" />
                              <div>
                                <p className="text-sm font-medium">{doc.nome_arquivo}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {doc.tipo_documento} • {doc.tamanho ? `${(doc.tamanho / 1024).toFixed(0)} KB` : ''} • {format(new Date(doc.created_at), 'dd/MM/yyyy')}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" asChild>
                                <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"><Eye className="w-4 h-4" /></a>
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteDoc(doc)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
