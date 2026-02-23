import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  FileText, Download, Mail, Share2, ArrowLeft, Table2, Loader2, MessageSquare, ChevronDown, ChevronUp
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import emiveLogo from '@/assets/emive-logo.png';
import { generatePropostaPDF } from '@/lib/propostaPdf';
import { generateEquipamentosExcel } from '@/lib/propostaExcel';

export type PropostaItem = {
  nome: string;
  codigo?: string;
  id_kit?: number;
  id_produto?: number;
  qtd: number;
  valor_locacao: number;
  valor_instalacao: number;
  desconto?: number;
};

export type PropostaData = {
  proposta: string;
  itens: {
    kits: PropostaItem[];
    avulsos: PropostaItem[];
    aproveitados: PropostaItem[];
    servicos: PropostaItem[];
    mensalidade_total: number;
    taxa_conexao_total: number;
  } | null;
  itensExpandidos: any[];
  fotos: { url: string; nome: string }[];
  sessao: {
    nome_cliente: string;
    endereco?: string;
    vendedor?: string;
    email?: string;
    telefone?: string;
  };
};

interface PropostaViewProps {
  data: PropostaData;
  onVoltar: () => void;
}

export default function PropostaView({ data, onVoltar }: PropostaViewProps) {
  const { toast } = useToast();
  const [gerando, setGerando] = useState<string | null>(null);
  const [showRawProposta, setShowRawProposta] = useState(false);

  const handleDownloadPDF = async () => {
    setGerando('pdf');
    try {
      await generatePropostaPDF(data);
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    }
    setGerando(null);
  };

  const handleDownloadExcel = () => {
    setGerando('excel');
    try {
      generateEquipamentosExcel(data);
      toast({ title: 'Planilha gerada com sucesso!' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao gerar planilha', variant: 'destructive' });
    }
    setGerando(null);
  };

  const handleShareWhatsApp = () => {
    const text = `Proposta Comercial - Emive\nCliente: ${data.sessao.nome_cliente}\n${data.sessao.endereco || ''}\nConsultor: ${data.sessao.vendedor || ''}\n\nProposta gerada em ${new Date().toLocaleDateString('pt-BR')}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleShareEmail = () => {
    const subject = `Proposta Comercial - ${data.sessao.nome_cliente} - Emive`;
    const body = `Prezado(a),\n\nSegue proposta comercial para o condomínio ${data.sessao.nome_cliente}.\n\nConsultor: ${data.sessao.vendedor || ''}\nData: ${new Date().toLocaleDateString('pt-BR')}\n\nAtenciosamente,\nEmive - Outsourcing PCI`;
    const mailto = `mailto:${data.sessao.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto);
  };

  const handleShareExternal = async () => {
    const shareData = {
      title: `Proposta Emive - ${data.sessao.nome_cliente}`,
      text: `Proposta comercial para ${data.sessao.nome_cliente}`,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      await navigator.clipboard.writeText(`Proposta Comercial Emive - ${data.sessao.nome_cliente}`);
      toast({ title: 'Link copiado!' });
    }
  };

  const itens = data.itens;
  const allItems = itens ? [
    ...(itens.kits || []),
    ...(itens.avulsos || []),
    ...(itens.aproveitados || []),
    ...(itens.servicos || []),
  ] : [];
  const totalMensalidade = allItems.reduce((sum, i) => sum + (i.valor_locacao || 0) * i.qtd, 0);
  const totalInstalacao = allItems.reduce((sum, i) => sum + (i.valor_instalacao || 0) * i.qtd, 0);

  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onVoltar}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={emiveLogo} alt="Emive" className="h-8" />
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-foreground">Proposta Comercial</h1>
            <p className="text-xs text-muted-foreground">{data.sessao.nome_cliente}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" onClick={handleDownloadExcel} disabled={!!gerando}>
            {gerando === 'excel' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Table2 className="mr-1 h-4 w-4" />}
            <span className="hidden sm:inline">Planilha</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={!!gerando}>
            {gerando === 'pdf' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
            <span className="hidden sm:inline">PDF</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleShareEmail}>
            <Mail className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleShareWhatsApp}>
            <MessageSquare className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleShareExternal}>
            <Share2 className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Compartilhar</span>
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        {/* Structured Items Tables */}
        {itens && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Detalhamento de Equipamentos</h2>

            {/* Reusable table renderer */}
            {[
              { label: 'Kits', badge: <Badge variant="default" className="bg-primary">Kits</Badge>, items: itens.kits, valorLabel: 'Locação (un)' },
              { label: 'Avulsos', badge: <Badge variant="secondary">Itens Avulsos</Badge>, items: itens.avulsos, valorLabel: 'Locação (un)' },
              { label: 'Aproveitados', badge: <Badge className="bg-accent text-accent-foreground">Aproveitados (50%)</Badge>, items: itens.aproveitados, valorLabel: 'Locação c/ desc.', cardClass: 'border-accent/30' },
              { label: 'Servicos', badge: <Badge variant="outline">Serviços</Badge>, items: itens.servicos, valorLabel: 'Locação (un)' },
            ].filter(g => g.items && g.items.length > 0).map((group) => (
              <Card key={group.label} className={group.cardClass}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {group.badge}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm table-fixed">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-2 w-12">Qtd</th>
                          <th className="text-left py-2 pr-2">Descrição</th>
                          <th className="text-left py-2 pr-2 w-20">Código</th>
                          <th className="text-right py-2 pl-2 w-28 whitespace-nowrap">{group.valorLabel}</th>
                          <th className="text-right py-2 pl-2 w-28">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items!.map((item, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-2 pr-2">{item.qtd}</td>
                            <td className="py-2 pr-2 font-medium truncate" title={item.nome}>{item.nome}</td>
                            <td className="py-2 pr-2 text-muted-foreground">{item.codigo || '-'}</td>
                            <td className="py-2 pl-2 text-right whitespace-nowrap">{formatBRL(item.valor_locacao || 0)}</td>
                            <td className="py-2 pl-2 text-right font-medium whitespace-nowrap">{formatBRL((item.valor_locacao || 0) * item.qtd)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Totals */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Mensalidade</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatBRL(itens.mensalidade_total || totalMensalidade)}<span className="text-sm font-normal text-muted-foreground">/mês</span>
                    </p>
                  </div>
                  <Separator orientation="vertical" className="hidden sm:block" />
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa de Instalação</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatBRL(itens.taxa_conexao_total || totalInstalacao)}
                    </p>
                    <p className="text-xs text-muted-foreground">Parcela em até 10x de {formatBRL((itens.taxa_conexao_total || totalInstalacao) / 10)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Separator />

        {/* Collapsible Markdown Proposal */}
        <div>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between py-3 text-muted-foreground hover:text-foreground"
            onClick={() => setShowRawProposta(!showRawProposta)}
          >
            <span className="text-sm font-medium">Texto completo da proposta gerada pela IA</span>
            {showRawProposta ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {showRawProposta && (
            <Card className="mt-2">
              <CardContent className="p-6 md:p-8 prose prose-sm max-w-none dark:prose-invert
                [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm
                [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
                [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2
                [&_tr:nth-child(even)]:bg-muted/30
                [&_h1]:text-xl [&_h1]:font-bold [&_h1]:border-b [&_h1]:border-border [&_h1]:pb-2 [&_h1]:mb-4
                [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3
                [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2
                [&_strong]:text-foreground
                [&_hr]:my-4 [&_hr]:border-border
              ">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.proposta}</ReactMarkdown>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Photos */}
        {data.fotos && data.fotos.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Fotos da Visita Técnica</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.fotos.map((foto, i) => (
                <Card key={i} className="overflow-hidden">
                  <img
                    src={foto.url}
                    alt={foto.nome}
                    className="w-full h-40 object-cover"
                    loading="lazy"
                  />
                  <CardContent className="p-2">
                    <p className="text-xs text-muted-foreground truncate">{foto.nome}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
