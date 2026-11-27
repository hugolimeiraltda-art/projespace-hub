import { useMemo, useState } from 'react';
import { Search, HeadphonesIcon, Video, ShieldCheck, ScanEye } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Input } from '@/components/ui/input';

const SERVICOS = [
  { nome: 'Serviço de portaria remota', icon: HeadphonesIcon },
  { nome: 'Serviço de ronda virtual', icon: Video },
  { nome: 'Serviço de ronda presencial', icon: ShieldCheck },
  { nome: 'Serviço de analíticos de vídeos', icon: ScanEye },
];

export default function OrcamentoServicos() {
  const [busca, setBusca] = useState('');
  const servicos = useMemo(() => {
    const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return SERVICOS.filter(servico => normalizar(servico.nome).includes(normalizar(busca.trim())));
  }, [busca]);

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Serviços</h1>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Buscar serviço" placeholder="Buscar serviço..." value={busca} onChange={event => setBusca(event.target.value)} className="pl-9" />
        </div>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50"><th className="px-4 py-3 text-left font-medium">Serviço</th></tr></thead>
            <tbody>
              {servicos.map(({ nome, icon: Icon }) => (
                <tr key={nome} className="border-b last:border-0">
                  <td className="px-4 py-4"><div className="flex items-center gap-3"><Icon className="h-5 w-5 shrink-0 text-muted-foreground" /><span className="text-foreground">{nome}</span></div></td>
                </tr>
              ))}
              {servicos.length === 0 && <tr><td className="px-4 py-10 text-center text-muted-foreground">Nenhum serviço encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}