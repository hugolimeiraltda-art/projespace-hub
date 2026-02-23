import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DoorOpen, Car, Shield, Camera, Waves, PartyPopper,
  UtensilsCrossed, Baby, Dumbbell, Flame, Laptop, TreePine, Trophy, LayoutGrid, Building
} from 'lucide-react';
import type { AmbienteItem } from '@/components/orcamento/PropostaView';

interface AmbienteDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ambiente: AmbienteItem | null;
}

const getAmbienteIcon = (tipo: string) => {
  const icons: Record<string, React.ReactNode> = {
    porta_externa: <DoorOpen className="h-5 w-5" />,
    porta_interna: <DoorOpen className="h-5 w-5" />,
    portao: <Car className="h-5 w-5" />,
    perimetro: <Shield className="h-5 w-5" />,
    cftv: <Camera className="h-5 w-5" />,
    piscina: <Waves className="h-5 w-5" />,
    salao_festas: <PartyPopper className="h-5 w-5" />,
    churrasqueira: <Flame className="h-5 w-5" />,
    playground: <Baby className="h-5 w-5" />,
    academia: <Dumbbell className="h-5 w-5" />,
    coworking: <Laptop className="h-5 w-5" />,
    jardim: <TreePine className="h-5 w-5" />,
    quadra: <Trophy className="h-5 w-5" />,
    gourmet: <UtensilsCrossed className="h-5 w-5" />,
    fachada: <Building className="h-5 w-5" />,
    estacionamento: <Car className="h-5 w-5" />,
    guarita: <Shield className="h-5 w-5" />,
  };
  return icons[tipo] || <LayoutGrid className="h-5 w-5" />;
};

export function AmbienteDetailDialog({ open, onOpenChange, ambiente }: AmbienteDetailDialogProps) {
  if (!ambiente) return null;

  const hasFotos = ambiente.fotos && ambiente.fotos.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-primary">{getAmbienteIcon(ambiente.tipo)}</span>
            {ambiente.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photos */}
          {hasFotos && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ambiente.fotos!.map((fotoUrl, i) => (
                <a key={i} href={fotoUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={fotoUrl}
                    alt={`${ambiente.nome} - foto ${i + 1}`}
                    className="w-full h-40 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          )}

          {!hasFotos && (
            <div className="bg-muted/30 rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground">Nenhuma foto vinculada a este ambiente.</p>
            </div>
          )}

          <Separator />

          {/* Equipment list */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Equipamentos ({ambiente.equipamentos.length})
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {ambiente.equipamentos.map((eq, j) => (
                <Badge key={j} variant="secondary" className="text-xs px-2 py-0.5">
                  {eq}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Operation description */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Funcionamento</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {ambiente.descricao_funcionamento}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
