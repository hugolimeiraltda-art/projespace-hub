import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  FileText, Download, Table2, Loader2, Bot, Image as ImageIcon, ChevronDown, ChevronRight,
  DoorOpen, Car, Shield, Camera, Waves, PartyPopper,
  UtensilsCrossed, Baby, Dumbbell, Flame, Laptop, TreePine, Trophy, LayoutGrid, MapPin, Building
} from 'lucide-react';
import { generatePropostaPDF } from '@/lib/propostaPdf';
import { generateEquipamentosExcel } from '@/lib/propostaExcel';
import type { PropostaData, AmbienteItem } from '@/components/orcamento/PropostaView';

interface ProjetoIASectionProps {
  sessaoId: string;
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

export function ProjetoIASection({ sessaoId }: ProjetoIASectionProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [propostaData, setPropostaData] = useState<PropostaData | null>(null);
  const [allMidias, setAllMidias] = useState<{ arquivo_url: string; nome_arquivo: string; descricao: string | null; tipo: string }[]>([]);
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
    async function fetchPropostaData() {
      try {
        // Fetch session
        const { data: sessao } = await supabase
          .from('orcamento_sessoes')
          .select('id, nome_cliente, vendedor_nome, proposta_gerada, endereco_condominio, email_cliente, telefone_cliente')
          .eq('id', sessaoId)
          .single();

        if (!sessao?.proposta_gerada) {
          setLoading(false);
          return;
        }

        // Parse proposta - could be JSON or plain text
        let parsed: any = null;
        try {
          parsed = JSON.parse(sessao.proposta_gerada);
        } catch {
          // proposta_gerada is plain text markdown
          parsed = { proposta: sessao.proposta_gerada, itens: null, itensExpandidos: [] };
        }

        // Fetch all media (photos and others)
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

        const fotos = midiasWithUrls.filter(m => m.tipo === 'foto').map(m => ({ url: m.arquivo_url, nome: m.nome_arquivo }));
        const todasMidias = midiasWithUrls;

        // Build filename-to-signedURL map for resolving ambiente fotos
        const fotoSignedMap: Record<string, string> = {};
        for (const m of midiasWithUrls) {
          if (m.tipo === 'foto') {
            fotoSignedMap[m.nome_arquivo] = m.arquivo_url;
          }
        }

        // Resolve filenames in ambientes to signed URLs
        const itens = parsed.itens;
        if (itens?.ambientes) {
          for (const amb of itens.ambientes) {
            if (amb.fotos && Array.isArray(amb.fotos)) {
              amb.fotos = amb.fotos.map((f: string) => {
                // If it's a filename (not a URL), resolve it
                if (!f.startsWith('http')) {
                  return fotoSignedMap[f] || null;
                }
                return f;
              }).filter(Boolean);
            }
          }
        }

        const data: PropostaData = {
          proposta: parsed.proposta || '',
          itens: itens || null,
          itensExpandidos: parsed.itensExpandidos || [],
          fotos,
          sessao: {
            nome_cliente: sessao.nome_cliente,
            endereco: sessao.endereco_condominio || '',
            vendedor: sessao.vendedor_nome || '',
            email: sessao.email_cliente || '',
            telefone: sessao.telefone_cliente || '',
          },
        };

        setPropostaData(data);
        setAllMidias(todasMidias);
      } catch (err) {
        console.error('Error fetching AI proposal data:', err);
      }
      setLoading(false);
    }

    fetchPropostaData();
  }, [sessaoId]);

  const handleDownloadPDF = async () => {
    if (!propostaData) return;
    setGerando('pdf');
    try {
      await generatePropostaPDF(propostaData);
      toast({ title: 'PDF gerado!', description: 'O arquivo da proposta foi baixado.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    }
    setGerando(null);
  };

  const handleDownloadExcel = () => {
    if (!propostaData) return;
    setGerando('excel');
    try {
      generateEquipamentosExcel(propostaData);
      toast({ title: 'Excel gerado!', description: 'A planilha de equipamentos foi baixada.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao gerar Excel', variant: 'destructive' });
    }
    setGerando(null);
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Carregando dados da proposta IA...</p>
        </CardContent>
      </Card>
    );
  }

  if (!propostaData) return null;

  const itens = propostaData.itens;
  
  // Build ambientes from structured data or infer from proposal text
  const ambientes: AmbienteItem[] = (() => {
    if (itens?.ambientes && itens.ambientes.length > 0) return itens.ambientes;
    
    // Parse equipment lines from markdown table if no structured items
    const allItems = [
      ...(itens?.kits || []),
      ...(itens?.avulsos || []),
      ...(itens?.servicos || []),
      ...(itens?.aproveitados || []),
    ];
    
    // If no structured items, parse from markdown text
    let parsedLines: { qtd: string; nome: string }[] = [];
    if (allItems.length === 0 && propostaData.proposta) {
      const lines = propostaData.proposta.split('\n');
      for (const line of lines) {
        const match = line.match(/^\|\s*([\d.]+)\s*(?:un)?\s*\|\s*(.+?)\s*\|/);
        if (match && match[2] && !match[2].includes('---') && !match[2].toLowerCase().includes('descrição')) {
          parsedLines.push({ qtd: match[1], nome: match[2].trim() });
        }
      }
    }

    const textItems = allItems.length > 0 
      ? allItems.map(i => ({ label: `${i.qtd}x ${i.nome}`, nome: i.nome.toLowerCase() }))
      : parsedLines.map(p => ({ label: `${p.qtd}x ${p.nome}`, nome: p.nome.toLowerCase() }));

    const propostaText = (propostaData.proposta || '').toLowerCase();
    const inferredAmbientes: AmbienteItem[] = [];

    // Portaria
    const portariaItems = textItems.filter(i => /portaria|facial|interfone|botoeira|leitor|ata kap/i.test(i.nome));
    if (portariaItems.length > 0 || propostaText.includes('portaria')) {
      inferredAmbientes.push({
        nome: 'Portaria',
        tipo: 'porta_externa',
        equipamentos: portariaItems.map(i => i.label),
        descricao_funcionamento: 'Central de portaria com controle de acesso de pedestres, interfonia e reconhecimento facial.',
      });
    }

    // Acesso Veicular
    const veicularItems = textItems.filter(i => /portão|portao|controle remoto|cancela|acionamento/i.test(i.nome));
    if (veicularItems.length > 0) {
      inferredAmbientes.push({
        nome: 'Acesso Veicular',
        tipo: 'portao',
        equipamentos: veicularItems.map(i => i.label),
        descricao_funcionamento: 'Acionamento de portões com controle remoto e/ou tag veicular.',
      });
    }

    // CFTV
    const cftvItems = textItems.filter(i => /camera|câmera|dvr|nvr|stand alone|hd.*tera|bullet|dome/i.test(i.nome) && !/elevador/i.test(i.nome));
    if (cftvItems.length > 0) {
      inferredAmbientes.push({
        nome: 'CFTV',
        tipo: 'cftv',
        equipamentos: cftvItems.map(i => i.label),
        descricao_funcionamento: 'Sistema de monitoramento por câmeras com gravação contínua.',
      });
    }

    // Alarme / Perímetro
    const alarmeItems = textItems.filter(i => /alarme|cerca|iva|sensor|infra|sirene|choque|zona/i.test(i.nome));
    if (alarmeItems.length > 0) {
      inferredAmbientes.push({
        nome: 'Perímetro / Alarme',
        tipo: 'perimetro',
        equipamentos: alarmeItems.map(i => i.label),
        descricao_funcionamento: 'Proteção perimetral com sensores e central de alarme.',
      });
    }

    // Elevador
    const elevadorItems = textItems.filter(i => /elevador/i.test(i.nome));
    if (elevadorItems.length > 0) {
      inferredAmbientes.push({
        nome: 'Elevadores',
        tipo: 'cftv',
        equipamentos: elevadorItems.map(i => i.label),
        descricao_funcionamento: 'Câmeras de monitoramento nos elevadores.',
      });
    }

    // Infraestrutura
    const infraItems = textItems.filter(i => /cabo|infra|nobreak|switch|rack/i.test(i.nome));
    if (infraItems.length > 0) {
      inferredAmbientes.push({
        nome: 'Infraestrutura',
        tipo: 'porta_interna',
        equipamentos: infraItems.map(i => i.label),
        descricao_funcionamento: 'Cabeamento, infraestrutura elétrica e equipamentos de suporte.',
      });
    }

    return inferredAmbientes.filter(a => a.equipamentos.length > 0);
  })();

  return (
    <Card className="shadow-card border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Projeto da IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
        {itens && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground uppercase">Mensalidade</p>
              <p className="text-lg font-bold text-foreground">
                R$ {(itens.mensalidade_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground uppercase">Taxa de Instalação</p>
              <p className="text-lg font-bold text-foreground">
                R$ {(itens.taxa_conexao_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}

        {/* Items summary */}
        {itens && (
          <div className="text-sm text-muted-foreground">
            {itens.kits?.length > 0 && <span>{itens.kits.length} kit(s) • </span>}
            {itens.avulsos?.length > 0 && <span>{itens.avulsos.length} avulso(s) • </span>}
            {itens.servicos?.length > 0 && <span>{itens.servicos.length} serviço(s) • </span>}
            {itens.aproveitados?.length > 0 && <span>{itens.aproveitados.length} aproveitado(s)</span>}
          </div>
        )}

        {/* EAP - Ambientes */}
        {ambientes.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                EAP — Detalhamento por Ambiente
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
            </div>
          </>
        )}

        {/* Photos from visit */}
        {allMidias.filter(m => m.tipo === 'foto').length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                Fotos da Visita Técnica
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {allMidias.filter(m => m.tipo === 'foto').map((foto, i) => (
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
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
