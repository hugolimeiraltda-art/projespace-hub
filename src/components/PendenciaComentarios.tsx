import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Comentario {
  id: string;
  comentario: string;
  created_by_name: string | null;
  created_at: string;
}

interface PendenciaComentariosProps {
  pendenciaId: string;
}

export function PendenciaComentarios({ pendenciaId }: PendenciaComentariosProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComentarios();
  }, [pendenciaId]);

  const fetchComentarios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('manutencao_pendencias_comentarios')
        .select('*')
        .eq('pendencia_id', pendenciaId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComentarios(data || []);
    } catch (error) {
      console.error('Error fetching comentarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!novoComentario.trim()) return;

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('manutencao_pendencias_comentarios')
        .insert({
          pendencia_id: pendenciaId,
          comentario: novoComentario.trim(),
          created_by: user?.id,
          created_by_name: user?.nome,
        });

      if (error) throw error;

      toast({
        title: 'Comentário adicionado',
        description: 'Seu comentário foi registrado com sucesso.',
      });

      setNovoComentario('');
      fetchComentarios();
    } catch (error) {
      console.error('Error adding comentario:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o comentário.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageSquare className="h-4 w-4" />
        Comentários ({comentarios.length})
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : comentarios.length > 0 ? (
        <ScrollArea className="h-40 pr-4">
          <div className="space-y-3">
            {comentarios.map((comentario) => (
              <div key={comentario.id} className="bg-muted p-3 rounded-lg">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="font-medium">{comentario.created_by_name || 'Usuário'}</span>
                  <span>
                    {format(parseISO(comentario.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm">{comentario.comentario}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-sm text-muted-foreground py-2">
          Nenhum comentário ainda.
        </div>
      )}

      <div className="flex gap-2">
        <Textarea
          value={novoComentario}
          onChange={(e) => setNovoComentario(e.target.value)}
          placeholder="Adicione um comentário..."
          className="flex-1 min-h-[60px]"
        />
        <Button
          onClick={handleSubmit}
          disabled={submitting || !novoComentario.trim()}
          size="icon"
          className="h-auto"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
