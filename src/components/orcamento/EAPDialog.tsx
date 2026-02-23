import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Loader2, MapPin, FileText, Table2, Image as ImageIcon, ChevronDown, ChevronRight,
  DoorOpen, Car, Shield, Camera, Waves, PartyPopper,
  UtensilsCrossed, Baby, Dumbbell, Flame, Laptop, TreePine, Trophy, LayoutGrid, Building
} from 'lucide-react';
import { generatePropostaPDF } from '@/lib/propostaPdf';
import { generateEquipamentosExcel } from '@/lib/propostaExcel';
import { useToast } from '@/hooks/use-toast';
import type { PropostaData, AmbienteItem } from '@/components/orcamento/PropostaView';

interface EAPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessaoId: string;
  nomeCliente: string;
}

const getAmbienteIcon = (tipo: string) => {
  const icons: Record<string, React.ReactNode> = {
    porta_externa: <DoorOpen className="h-4 w-4" />,
    porta_interna: <DoorOpen className="h-4 w-4" />,
    portao: <Car className="h-4 w-4" />,
    perimetro: <Shield className="h-4 w-4" />,
    cftv: <Camera className="h-4 w-4" />,
    piscina: <Waves className="h-4 w-4" />,
    salao_festas: <PartyPopper className="h-4 w-4" />,
    churrasqueira: <Flame className="h-4 w-4" />,
    playground: <Baby className="h-4 w-4" />,
    academia: <Dumbbell className="h-4 w-4" />,
    coworking: <Laptop className="h-4 w-4" />,
    jardim: <TreePine className="h-4 w-4" />,
    quadra: <Trophy className="h-4 w-4" />,
    gourmet: <UtensilsCrossed className="h-4 w-4" />,
    fachada: <Building className="h-4 w-4" />,
    estacionamento: <Car className="h-4 w-4" />,
    guarita: <Shield className="h-4 w-4" />,
  };
  return icons[tipo] || <LayoutGrid className="h-4 w-4" />;
};

export function EAPDialog({ open, onOpenChange, sessaoId, nomeCliente }: EAPDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [propostaData, setPropostaData] = useState<PropostaData | null>(null);
  const [ambientes, setAmbientes] = useState<AmbienteItem[]>([]);
  const [fotos, setFotos] = useState<{ arquivo_url: string; nome_arquivo: string; descricao: string | null }[]>([]);
  const [gerando, setGerando] = useState<string | null>(null);
  const [expandedAmbientes, setExpandedAmbientes] = useState<Set<number>>(new Set());

  const toggleAmbiente = (index: number) => {
    setExpandedAmbientes(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    async function fetchData() {
      try {
        const { data: sessao } = await supabase
          .from('orcamento_sessoes')
          .select('id, nome_cliente, vendedor_nome, proposta_gerada, endereco_condominio, email_cliente, telefone_cliente')
          .eq('id', sessaoId)
          .single();

        if (!sessao?.proposta_gerada) { setLoading(false); return; }

        let parsed: any = null;
        try { parsed = JSON.parse(sessao.proposta_gerada); } catch {
          parsed = { proposta: sessao.proposta_gerada, itens: null, itensExpandidos: [] };
        }

        const { data: midias } = await supabase
          .from('orcamento_midias')
          .select('arquivo_url, nome_arquivo, descricao, tipo')
          .eq('sessao_id', sessaoId)
          .order('created_at', { ascending: true });

        // Generate signed URLs for private bucket
        const midiasWithUrls = await Promise.all(
          (midias || []).map(async (m) => {
            const { data: signedData } = await supabase.storage
              .from('orcamento-midias')
              .createSignedUrl(m.arquivo_url, 3600);
            return { ...m, arquivo_url: signedData?.signedUrl || m.arquivo_url };
          })
        );

        const fotosData = midiasWithUrls.filter(m => m.tipo === 'foto');
        setFotos(fotosData);

        // Build filename-to-signedURL map for resolving ambiente fotos
        const fotoSignedMap: Record<string, string> = {};
        for (const m of midiasWithUrls) {
          if (m.tipo === 'foto') {
            fotoSignedMap[m.nome_arquivo] = m.arquivo_url;
          }
        }

        // Resolve filenames in ambientes to signed URLs
        const parsedItens = parsed.itens;
        if (parsedItens?.ambientes) {
          for (const amb of parsedItens.ambientes) {
            if (amb.fotos && Array.isArray(amb.fotos)) {
              amb.fotos = amb.fotos.map((f: string) => {
                if (!f.startsWith('http')) return fotoSignedMap[f] || null;
                return f;
              }).filter(Boolean);
            }
          }
        }

        const data: PropostaData = {
          proposta: parsed.proposta || '',
          itens: parsedItens || null,
          itensExpandidos: parsed.itensExpandidos || [],
          fotos: fotosData.map(m => ({ url: m.arquivo_url, nome: m.nome_arquivo })),
          sessao: {
            nome_cliente: sessao.nome_cliente,
            endereco: sessao.endereco_condominio || '',
            vendedor: sessao.vendedor_nome || '',
            email: sessao.email_cliente || '',
            telefone: sessao.telefone_cliente || '',
          },
        };

        setPropostaData(data);

        // Build ambientes (same logic as ProjetoIASection)
        const itensForAmb = parsed.itens;
        const ambs: AmbienteItem[] = (() => {
          if (itensForAmb?.ambientes && itensForAmb.ambientes.length > 0) return itensForAmb.ambientes;

          const allItems = [
            ...(itensForAmb?.kits || []),
            ...(itensForAmb?.avulsos || []),
            ...(itensForAmb?.servicos || []),
            ...(itensForAmb?.aproveitados || []),
          ];

          let parsedLines: { qtd: string; nome: string }[] = [];
          if (allItems.length === 0 && data.proposta) {
            const lines = data.proposta.split('\n');
            for (const line of lines) {
              const match = line.match(/^\|\s*([\d.]+)\s*(?:un)?\s*\|\s*(.+?)\s*\|/);
              if (match && match[2] && !match[2].includes('---') && !match[2].toLowerCase().includes('descrição')) {
                parsedLines.push({ qtd: match[1], nome: match[2].trim() });
              }
            }
          }

          const textItems = allItems.length > 0
            ? allItems.map((i: any) => ({ label: `${i.qtd}x ${i.nome}`, nome: i.nome.toLowerCase() }))
            : parsedLines.map(p => ({ label: `${p.qtd}x ${p.nome}`, nome: p.nome.toLowerCase() }));

          const inferredAmbientes: AmbienteItem[] = [];

          const portariaItems = textItems.filter((i: any) => /portaria|facial|interfone|botoeira|leitor|ata kap/i.test(i.nome));
          if (portariaItems.length > 0) {
            inferredAmbientes.push({ nome: 'Portaria', tipo: 'porta_externa', equipamentos: portariaItems.map((i: any) => i.label), descricao_funcionamento: 'Central de portaria com controle de acesso de pedestres, interfonia e reconhecimento facial.' });
          }

          const veicularItems = textItems.filter((i: any) => /portão|portao|controle remoto|cancela|acionamento/i.test(i.nome));
          if (veicularItems.length > 0) {
            inferredAmbientes.push({ nome: 'Acesso Veicular', tipo: 'portao', equipamentos: veicularItems.map((i: any) => i.label), descricao_funcionamento: 'Acionamento de portões com controle remoto e/ou tag veicular.' });
          }

          const cftvItems = textItems.filter((i: any) => /camera|câmera|dvr|nvr|stand alone|hd.*tera|bullet|dome/i.test(i.nome) && !/elevador/i.test(i.nome));
          if (cftvItems.length > 0) {
            inferredAmbientes.push({ nome: 'CFTV', tipo: 'cftv', equipamentos: cftvItems.map((i: any) => i.label), descricao_funcionamento: 'Sistema de monitoramento por câmeras com gravação contínua.' });
          }

          const alarmeItems = textItems.filter((i: any) => /alarme|cerca|iva|sensor|infra|sirene|choque|zona/i.test(i.nome));
          if (alarmeItems.length > 0) {
            inferredAmbientes.push({ nome: 'Perímetro / Alarme', tipo: 'perimetro', equipamentos: alarmeItems.map((i: any) => i.label), descricao_funcionamento: 'Proteção perimetral com sensores e central de alarme.' });
          }

          const elevadorItems = textItems.filter((i: any) => /elevador/i.test(i.nome));
          if (elevadorItems.length > 0) {
            inferredAmbientes.push({ nome: 'Elevadores', tipo: 'cftv', equipamentos: elevadorItems.map((i: any) => i.label), descricao_funcionamento: 'Câmeras de monitoramento nos elevadores.' });
          }

          const infraItems = textItems.filter((i: any) => /cabo|infra|nobreak|switch|rack/i.test(i.nome));
          if (infraItems.length > 0) {
            inferredAmbientes.push({ nome: 'Infraestrutura', tipo: 'porta_interna', equipamentos: infraItems.map((i: any) => i.label), descricao_funcionamento: 'Cabeamento, infraestrutura elétrica e equipamentos de suporte.' });
          }

          return inferredAmbientes.filter(a => a.equipamentos.length > 0);
        })();

        setAmbientes(ambs);
      } catch (err) {
        console.error('Error fetching EAP data:', err);
      }
      setLoading(false);
    }

    fetchData();
  }, [open, sessaoId]);

  const handleDownloadPDF = async () => {
    if (!propostaData) return;
    setGerando('pdf');
    try {
      await generatePropostaPDF(propostaData);
      toast({ title: 'PDF gerado!' });
    } catch { toast({ title: 'Erro ao gerar PDF', variant: 'destructive' }); }
    setGerando(null);
  };

  const handleDownloadExcel = () => {
    if (!propostaData) return;
    setGerando('excel');
    try {
      generateEquipamentosExcel(propostaData);
      toast({ title: 'Planilha gerada!' });
    } catch { toast({ title: 'Erro ao gerar planilha', variant: 'destructive' }); }
    setGerando(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            EAP — {nomeCliente}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground mt-2">Carregando...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Download buttons */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={gerando === 'pdf'}>
                {gerando === 'pdf' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                Baixar PDF da Proposta
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadExcel} disabled={gerando === 'excel'}>
                {gerando === 'excel' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Table2 className="h-4 w-4 mr-2" />}
                Baixar Excel de Equipamentos
              </Button>
            </div>

            {/* Totals */}
            {propostaData?.itens && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground uppercase">Mensalidade</p>
                  <p className="text-lg font-bold text-foreground">
                    R$ {(propostaData.itens.mensalidade_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground uppercase">Taxa de Instalação</p>
                  <p className="text-lg font-bold text-foreground">
                    R$ {(propostaData.itens.taxa_conexao_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            )}

            {/* EAP Ambientes */}
            {ambientes.length > 0 ? (
              <>
                <Separator />
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Detalhamento por Ambiente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ambientes.map((amb, i) => {
                    const isExpanded = expandedAmbientes.has(i);
                    const hasFotos = amb.fotos && amb.fotos.length > 0;
                    return (
                      <div
                        key={i}
                        className="border rounded-lg bg-card hover:shadow-sm transition-shadow cursor-pointer"
                        onClick={() => toggleAmbiente(i)}
                      >
                        <div className="p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-primary">{getAmbienteIcon(amb.tipo)}</span>
                            <span className="font-medium text-sm text-foreground flex-1">{amb.nome}</span>
                            {(hasFotos || amb.equipamentos.length > 0) && (
                              isExpanded
                                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {amb.equipamentos.map((eq, j) => (
                              <Badge key={j} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {eq}
                              </Badge>
                            ))}
                          </div>
                          {!isExpanded && (
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                              {amb.descricao_funcionamento}
                            </p>
                          )}
                        </div>
                        {isExpanded && (
                          <div className="px-3 pb-3 space-y-2 border-t pt-2">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {amb.descricao_funcionamento}
                            </p>
                            {hasFotos && (
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {amb.fotos!.map((fotoUrl, fi) => (
                                  <a key={fi} href={fotoUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                                    <img
                                      src={fotoUrl}
                                      alt={`${amb.nome} - foto ${fi + 1}`}
                                      className="w-full h-24 object-cover rounded border hover:opacity-80 transition-opacity"
                                      loading="lazy"
                                    />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum ambiente identificado nesta proposta.
              </p>
            )}

            {/* Photos */}
            {fotos.length > 0 && (
              <>
                <Separator />
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  Fotos da Visita Técnica
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {fotos.map((foto, i) => (
                    <div key={i} className="group relative border rounded-lg overflow-hidden bg-muted/30">
                      <a href={foto.arquivo_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={foto.arquivo_url}
                          alt={foto.descricao || foto.nome_arquivo}
                          className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                      </a>
                      <div className="p-1.5">
                        <p className="text-[10px] text-muted-foreground truncate" title={foto.descricao || foto.nome_arquivo}>
                          {foto.descricao || foto.nome_arquivo}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
