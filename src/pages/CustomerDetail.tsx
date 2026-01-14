import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Save, Loader2, Upload, Trash2, FileText, Image, Video, File, Calendar } from 'lucide-react';
import { format, addMonths } from 'date-fns';
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

interface CustomerDocument {
  id: string;
  nome_arquivo: string;
  arquivo_url: string;
  tipo_arquivo: string | null;
  tamanho: number | null;
  created_at: string;
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
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
  });

  const canEdit = user?.role === 'admin' || user?.role === 'implantacao';

  useEffect(() => {
    if (id) {
      fetchCustomer();
      fetchDocuments();
    }
  }, [id]);

  const fetchCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_portfolio')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCustomer(data);
      setForm({
        contrato: data.contrato,
        alarme_codigo: data.alarme_codigo || '',
        razao_social: data.razao_social,
        mensalidade: data.mensalidade?.toString() || '',
        taxa_ativacao: data.taxa_ativacao?.toString() || '',
        leitores: data.leitores || '',
        quantidade_leitores: data.quantidade_leitores?.toString() || '',
        filial: data.filial || '',
        unidades: data.unidades?.toString() || '',
        tipo: data.tipo || '',
        data_ativacao: data.data_ativacao || '',
        noc: data.noc || '',
        sistema: data.sistema || '',
        transbordo: data.transbordo,
        gateway: data.gateway,
        portoes: data.portoes?.toString() || '0',
        portas: data.portas?.toString() || '0',
        dvr_nvr: data.dvr_nvr?.toString() || '0',
        cameras: data.cameras?.toString() || '0',
        zonas_perimetro: data.zonas_perimetro?.toString() || '0',
        cancelas: data.cancelas?.toString() || '0',
        totem_simples: data.totem_simples?.toString() || '0',
        totem_duplo: data.totem_duplo?.toString() || '0',
        catracas: data.catracas?.toString() || '0',
      });
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast({
        title: 'Erro ao carregar cliente',
        description: 'Não foi possível carregar os dados do cliente.',
        variant: 'destructive',
      });
      navigate('/carteira-clientes');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_documents')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleSave = async () => {
    if (!canEdit) return;

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
      };

      const { error } = await supabase
        .from('customer_portfolio')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Cliente atualizado!', description: 'Os dados foram salvos com sucesso.' });
      fetchCustomer();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar as alterações.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit || !event.target.files?.length) return;

    const files = Array.from(event.target.files);
    setUploading(true);

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('customer-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Store the file path, not the public URL (bucket is private)
        const { error: insertError } = await supabase
          .from('customer_documents')
          .insert({
            customer_id: id,
            nome_arquivo: file.name,
            arquivo_url: filePath, // Store path instead of full URL
            tipo_arquivo: file.type,
            tamanho: file.size,
          });

        if (insertError) throw insertError;
      }

      toast({ title: 'Upload concluído!', description: `${files.length} arquivo(s) enviado(s) com sucesso.` });
      fetchDocuments();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Erro no upload',
        description: error.message || 'Não foi possível enviar o arquivo.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    try {
      // Check if it's already a full URL (old records)
      if (filePath.startsWith('http')) {
        // Extract the path from old URLs
        const pathMatch = filePath.match(/customer-documents\/(.+)/);
        if (pathMatch) {
          const { data, error } = await supabase.storage
            .from('customer-documents')
            .createSignedUrl(pathMatch[1], 3600); // 1 hour expiry
          if (error) throw error;
          return data.signedUrl;
        }
        return filePath;
      }
      
      const { data, error } = await supabase.storage
        .from('customer-documents')
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }
  };

  const handleOpenDocument = async (doc: CustomerDocument) => {
    const url = await getSignedUrl(doc.arquivo_url);
    if (url) {
      window.open(url, '_blank');
    } else {
      toast({
        title: 'Erro ao abrir arquivo',
        description: 'Não foi possível gerar o link de acesso.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDocument = async (doc: CustomerDocument) => {
    if (!canEdit) return;
    if (!confirm(`Excluir o arquivo "${doc.nome_arquivo}"?`)) return;

    try {
      // Get the file path - either direct path or extracted from URL
      let filePath = doc.arquivo_url;
      if (filePath.startsWith('http')) {
        const pathMatch = filePath.match(/customer-documents\/(.+)/);
        if (pathMatch) {
          filePath = pathMatch[1];
        }
      }
      
      await supabase.storage.from('customer-documents').remove([filePath]);

      const { error } = await supabase
        .from('customer_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;
      toast({ title: 'Arquivo excluído!' });
      fetchDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Erro ao excluir',
        description: error.message || 'Não foi possível excluir o arquivo.',
        variant: 'destructive',
      });
    }
  };

  const getFileIcon = (tipo: string | null) => {
    if (!tipo) return <File className="w-4 h-4" />;
    if (tipo.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (tipo.startsWith('video/')) return <Video className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const calculateTermino = (inicio: string | null) => {
    if (!inicio) return '-';
    try {
      const dataInicio = new Date(inicio);
      const dataTermino = addMonths(dataInicio, 36);
      return format(dataTermino, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!customer) {
    return (
      <Layout>
        <div className="p-6">
          <p className="text-muted-foreground">Cliente não encontrado.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/carteira-clientes')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{customer.razao_social}</h1>
              <p className="text-muted-foreground">Contrato: {customer.contrato}</p>
            </div>
          </div>
          {canEdit && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Alterações
            </Button>
          )}
        </div>

        {!canEdit && (
          <div className="mb-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
            Você tem permissão apenas para visualização. Somente Administradores e Implantação podem editar.
          </div>
        )}

        {/* Dados do Cliente */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {/* Identificação */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Contrato</Label>
                  <Input value={form.contrato} onChange={(e) => setForm({ ...form, contrato: e.target.value })} disabled={!canEdit} />
                </div>
                <div>
                  <Label>Código Alarme</Label>
                  <Input value={form.alarme_codigo} onChange={(e) => setForm({ ...form, alarme_codigo: e.target.value })} disabled={!canEdit} />
                </div>
                <div>
                  <Label>Filial</Label>
                  <Input value={form.filial} onChange={(e) => setForm({ ...form, filial: e.target.value })} disabled={!canEdit} />
                </div>
                <div>
                  <Label>Sistema</Label>
                  <Select value={form.sistema} onValueChange={(v) => setForm({ ...form, sistema: v })} disabled={!canEdit}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GEAR">GEAR</SelectItem>
                      <SelectItem value="SIAM">SIAM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Razão Social</Label>
                <Input value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} disabled={!canEdit} />
              </div>

              {/* Financeiro e Tipo */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Mensalidade (R$)</Label>
                  <Input value={form.mensalidade} onChange={(e) => setForm({ ...form, mensalidade: e.target.value })} disabled={!canEdit} />
                </div>
                <div>
                  <Label>Taxa de Ativação (R$)</Label>
                  <Input value={form.taxa_ativacao} onChange={(e) => setForm({ ...form, taxa_ativacao: e.target.value })} disabled={!canEdit} />
                </div>
                <div>
                  <Label>Unidades</Label>
                  <Input type="number" value={form.unidades} onChange={(e) => setForm({ ...form, unidades: e.target.value })} disabled={!canEdit} />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })} disabled={!canEdit}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIRTUAL">Virtual</SelectItem>
                      <SelectItem value="PRESENCIAL">Presencial</SelectItem>
                      <SelectItem value="CA MONITORADO">CA Monitorado</SelectItem>
                      <SelectItem value="VIRTUAL + APOIO">Virtual + Apoio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Início (Ativação)</Label>
                  <Input type="date" value={form.data_ativacao} onChange={(e) => setForm({ ...form, data_ativacao: e.target.value })} disabled={!canEdit} />
                </div>
                <div>
                  <Label className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Término (36 meses)</Label>
                  <div className="flex items-center h-10 px-3 rounded-md border bg-muted text-muted-foreground">
                    {calculateTermino(form.data_ativacao)}
                  </div>
                </div>
                <div>
                  <Label>NOC</Label>
                  <Select value={form.noc || ''} onValueChange={(v) => setForm({ ...form, noc: v })} disabled={!canEdit}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SIM">SIM</SelectItem>
                      <SelectItem value="NÃO">NÃO</SelectItem>
                      <SelectItem value="RETROFIT">RETROFIT</SelectItem>
                      <SelectItem value="FAZER">FAZER</SelectItem>
                      <SelectItem value="OBRA NOVA">OBRA NOVA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Leitores */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Leitores</Label>
                  <Input value={form.leitores} onChange={(e) => setForm({ ...form, leitores: e.target.value })} disabled={!canEdit} />
                </div>
                <div>
                  <Label>Qtd Leitores</Label>
                  <Input type="number" value={form.quantidade_leitores} onChange={(e) => setForm({ ...form, quantidade_leitores: e.target.value })} disabled={!canEdit} />
                </div>
                <div className="flex items-end gap-6">
                  <div className="flex items-center gap-2">
                    <Switch id="transbordo" checked={form.transbordo} onCheckedChange={(v) => setForm({ ...form, transbordo: v })} disabled={!canEdit} />
                    <Label htmlFor="transbordo">Transbordo</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="gateway" checked={form.gateway} onCheckedChange={(v) => setForm({ ...form, gateway: v })} disabled={!canEdit} />
                    <Label htmlFor="gateway">Gateway</Label>
                  </div>
                </div>
              </div>

              {/* Equipamentos */}
              <div className="border-t pt-4 mt-2">
                <h3 className="font-semibold mb-3">Equipamentos</h3>
                <div className="grid grid-cols-5 gap-4">
                  <div>
                    <Label>Portões</Label>
                    <Input type="number" value={form.portoes} onChange={(e) => setForm({ ...form, portoes: e.target.value })} disabled={!canEdit} />
                  </div>
                  <div>
                    <Label>Portas</Label>
                    <Input type="number" value={form.portas} onChange={(e) => setForm({ ...form, portas: e.target.value })} disabled={!canEdit} />
                  </div>
                  <div>
                    <Label>DVR/NVR</Label>
                    <Input type="number" value={form.dvr_nvr} onChange={(e) => setForm({ ...form, dvr_nvr: e.target.value })} disabled={!canEdit} />
                  </div>
                  <div>
                    <Label>Câmeras</Label>
                    <Input type="number" value={form.cameras} onChange={(e) => setForm({ ...form, cameras: e.target.value })} disabled={!canEdit} />
                  </div>
                  <div>
                    <Label>Zonas Perímetro</Label>
                    <Input type="number" value={form.zonas_perimetro} onChange={(e) => setForm({ ...form, zonas_perimetro: e.target.value })} disabled={!canEdit} />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div>
                    <Label>Cancelas</Label>
                    <Input type="number" value={form.cancelas} onChange={(e) => setForm({ ...form, cancelas: e.target.value })} disabled={!canEdit} />
                  </div>
                  <div>
                    <Label>Totem Simples</Label>
                    <Input type="number" value={form.totem_simples} onChange={(e) => setForm({ ...form, totem_simples: e.target.value })} disabled={!canEdit} />
                  </div>
                  <div>
                    <Label>Totem Duplo</Label>
                    <Input type="number" value={form.totem_duplo} onChange={(e) => setForm({ ...form, totem_duplo: e.target.value })} disabled={!canEdit} />
                  </div>
                  <div>
                    <Label>Catracas</Label>
                    <Input type="number" value={form.catracas} onChange={(e) => setForm({ ...form, catracas: e.target.value })} disabled={!canEdit} />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documentação */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Documentação</CardTitle>
            {canEdit && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt"
                />
                <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Enviar Arquivo
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum documento anexado.</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <button
                      onClick={() => handleOpenDocument(doc)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left hover:underline"
                    >
                      {getFileIcon(doc.tipo_arquivo)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.nome_arquivo}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(doc.tamanho)} • {format(new Date(doc.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                    </button>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive shrink-0"
                        onClick={() => handleDeleteDocument(doc)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
