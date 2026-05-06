import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Table2, Sparkles } from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; content: string };

interface Item {
  qtd: string;
  unidade: string;
  nome: string;
  origem: 'kit' | 'produto' | 'cabo' | 'infra' | 'outro';
}

/**
 * Parses assistant messages in real time to extract items being added to the proposal.
 * Looks for patterns like:
 *   - "incluí 2 unidades do KIT XYZ"
 *   - "200 metros de CABO UTP CAT5e"
 *   - "1 unidade de KIT PORTÃO ..."
 *   - markdown table rows: | 2 | KIT XYZ | ... |
 */
function extractItems(messages: Msg[]): Item[] {
  const items: Item[] = [];
  const seen = new Set<string>();

  const push = (qtd: string, unidade: string, nome: string, origem: Item['origem']) => {
    const key = `${nome.toUpperCase()}|${unidade}`;
    const cleanedNome = nome.trim().replace(/\.$/, '').replace(/\*+/g, '');
    if (!cleanedNome || cleanedNome.length < 3) return;
    if (seen.has(key)) {
      // Update qty (last mention wins) — same key, replace
      const idx = items.findIndex(i => `${i.nome.toUpperCase()}|${i.unidade}` === key);
      if (idx >= 0) items[idx] = { qtd, unidade, nome: cleanedNome, origem };
      return;
    }
    seen.add(key);
    items.push({ qtd, unidade, nome: cleanedNome, origem });
  };

  for (const msg of messages) {
    if (msg.role !== 'assistant') continue;
    const text = msg.content;

    // Pattern 1: "X unidade(s) do/de KIT NOME"
    const reKit = /(\d+(?:[.,]\d+)?)\s*unidad(?:e|es)\s+(?:do|de|d[ao]s?)\s+\*{0,2}(KIT[^.,\n*]+?)\*{0,2}(?=[.,\n]|\s+(?:para|na|no|que|este|esta|com))/gi;
    let m: RegExpExecArray | null;
    while ((m = reKit.exec(text)) !== null) {
      push(m[1], 'un', m[2], 'kit');
    }

    // Pattern 2: "X metros de NOME" (cables, infra)
    const reMetros = /(\d+(?:[.,]\d+)?)\s*metros?\s+de\s+\*{0,2}([A-ZÁÉÍÓÚÂÊÔÃÕÇ][^.,\n*]+?)\*{0,2}(?=[.,\n]|\s+(?:para|na|no|que|entre))/gi;
    while ((m = reMetros.exec(text)) !== null) {
      const nome = m[2];
      const origem: Item['origem'] = /cabo|fibra|utp|ftp/i.test(nome) ? 'cabo' : 'infra';
      push(m[1], 'm', nome, origem);
    }

    // Pattern 3: markdown table rows | qtd | nome | ...
    const lines = text.split('\n');
    for (const line of lines) {
      const t = line.match(/^\s*\|\s*(\d+(?:[.,]\d+)?)\s*(un|m|metros?|unidades?)?\s*\|\s*([^|]+?)\s*\|/i);
      if (t) {
        const nome = t[3].trim();
        if (/^[-:]+$/.test(nome) || /descri[cç]/i.test(nome) || /quantidade|item/i.test(nome)) continue;
        const unidade = t[2]?.toLowerCase().startsWith('m') ? 'm' : 'un';
        const origem: Item['origem'] = /^kit/i.test(nome) ? 'kit' : /cabo|fibra|utp/i.test(nome) ? 'cabo' : /eletroduto|infra|tubo/i.test(nome) ? 'infra' : 'produto';
        push(t[1], unidade, nome, origem);
      }
    }

    // Pattern 4: "incluí/adicionei NOME" generic — only for explicitly added kits
    const reIncl = /(?:inclu[ií]|adicionei|adicionado|registrei|anotei)\s+(?:na\s+proposta\s+)?(?:o\s+|a\s+)?\*{0,2}(KIT[^.,\n*]+?)\*{0,2}(?=[.,\n])/gi;
    while ((m = reIncl.exec(text)) !== null) {
      push('1', 'un', m[1], 'kit');
    }
  }

  return items;
}

const origemColor: Record<Item['origem'], string> = {
  kit: 'bg-primary/10 text-primary border-primary/20',
  produto: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  cabo: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  infra: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  outro: 'bg-muted text-muted-foreground',
};

const origemLabel: Record<Item['origem'], string> = {
  kit: 'Kit',
  produto: 'Produto',
  cabo: 'Cabo',
  infra: 'Infra',
  outro: 'Outro',
};

interface Props {
  messages: Msg[];
  isStreaming?: boolean;
}

export default function ChatLiveSpreadsheet({ messages, isStreaming }: Props) {
  const items = useMemo(() => extractItems(messages), [messages]);

  return (
    <Card className="h-full flex flex-col shadow-card">
      <CardHeader className="shrink-0 border-b">
        <CardTitle className="text-base flex items-center gap-2">
          <Table2 className="h-4 w-4 text-primary" />
          Planilha em Tempo Real
          {isStreaming && (
            <span className="ml-auto text-xs font-normal text-primary flex items-center gap-1">
              <Sparkles className="h-3 w-3 animate-pulse" />
              IA escrevendo...
            </span>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Itens identificados na conversa: <span className="font-semibold text-foreground">{items.length}</span>
        </p>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
            <Table2 className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">Nenhum item identificado ainda.</p>
            <p className="text-xs mt-1">Conforme a conversa avança, os itens aparecem aqui automaticamente.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-16 text-right">Qtd</TableHead>
                <TableHead className="w-12">Un</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="w-20">Tipo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="text-right font-semibold tabular-nums">{item.qtd}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.unidade}</TableCell>
                  <TableCell className="text-sm">{item.nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${origemColor[item.origem]}`}>
                      {origemLabel[item.origem]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
