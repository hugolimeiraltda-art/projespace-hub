import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Image, Video, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionFileUploadProps {
  projectId: string | null;
  secao: string;
  disabled?: boolean;
}

interface UploadedFile {
  id: string;
  arquivo_url: string;
  nome_arquivo: string;
  tipo_arquivo: string | null;
  tamanho: number | null;
  created_at: string;
}

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_TYPES = 'image/*,video/*,.pdf,.doc,.docx';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(tipo: string | null) {
  if (!tipo) return FileText;
  if (tipo.startsWith('image/')) return Image;
  if (tipo.startsWith('video/')) return Video;
  return FileText;
}

async function compressVideo(file: File, onProgress: (p: number) => void): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = () => {
      // Target: reduce resolution to max 720p and lower bitrate
      const maxHeight = 720;
      const scale = video.videoHeight > maxHeight ? maxHeight / video.videoHeight : 1;
      const width = Math.round(video.videoWidth * scale / 2) * 2;
      const height = Math.round(video.videoHeight * scale / 2) * 2;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      // Check MediaRecorder support
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
          ? 'video/webm;codecs=vp8'
          : 'video/webm';

      const stream = canvas.captureStream(24);
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 1_000_000, // 1 Mbps
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        URL.revokeObjectURL(url);
        const blob = new Blob(chunks, { type: mimeType });
        const compressedFile = new File(
          [blob],
          file.name.replace(/\.[^.]+$/, '.webm'),
          { type: mimeType }
        );
        resolve(compressedFile);
      };

      recorder.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error('Erro ao comprimir vídeo'));
      };

      recorder.start();
      video.currentTime = 0;
      video.play();

      const drawFrame = () => {
        if (video.ended || video.paused) {
          recorder.stop();
          return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        const progress = video.duration ? (video.currentTime / video.duration) * 100 : 0;
        onProgress(Math.round(progress));
        requestAnimationFrame(drawFrame);
      };

      video.onplay = () => {
        drawFrame();
      };

      video.onended = () => {
        setTimeout(() => recorder.stop(), 100);
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Erro ao carregar vídeo'));
      };
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Formato de vídeo não suportado'));
    };
  });
}

export function SectionFileUpload({ projectId, secao, disabled }: SectionFileUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Load existing files for this section
  useEffect(() => {
    if (!projectId) return;

    const loadFiles = async () => {
      const { data, error } = await supabase
        .from('sale_form_attachments')
        .select('*')
        .eq('project_id', projectId)
        .eq('secao', secao)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setFiles(data as UploadedFile[]);
      }
    };

    loadFiles();
  }, [projectId, secao]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0 || !projectId) return;

    setIsUploading(true);
    setUploadProgress(0);

    for (let i = 0; i < selectedFiles.length; i++) {
      let file = selectedFiles[i];
      const isVideo = file.type.startsWith('video/');

      // Check video size limit
      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        // Try to compress
        setIsCompressing(true);
        setCompressProgress(0);
        try {
          toast({
            title: 'Comprimindo vídeo...',
            description: `"${file.name}" excede 50MB. Comprimindo automaticamente...`,
          });
          file = await compressVideo(file, setCompressProgress);

          if (file.size > MAX_VIDEO_SIZE) {
            toast({
              title: 'Vídeo muito grande',
              description: `Mesmo após compressão, "${file.name}" excede 50MB (${formatFileSize(file.size)}). Tente um vídeo menor.`,
              variant: 'destructive',
            });
            setIsCompressing(false);
            continue;
          }

          toast({
            title: 'Vídeo comprimido!',
            description: `Tamanho reduzido para ${formatFileSize(file.size)}.`,
          });
        } catch (err) {
          toast({
            title: 'Erro na compressão',
            description: `Não foi possível comprimir "${file.name}". Tente um arquivo menor.`,
            variant: 'destructive',
          });
          setIsCompressing(false);
          continue;
        }
        setIsCompressing(false);
      }

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const storagePath = `${projectId}/venda/${secao}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-attachments')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          title: 'Erro no upload',
          description: `Não foi possível enviar "${file.name}".`,
          variant: 'destructive',
        });
        continue;
      }

      // Get signed URL
      const { data: signedUrlData } = await supabase.storage
        .from('project-attachments')
        .createSignedUrl(uploadData.path, 60 * 60 * 24 * 365);

      const fileUrl = signedUrlData?.signedUrl || '';

      // Save to DB
      const { data: insertData, error: insertError } = await supabase
        .from('sale_form_attachments')
        .insert({
          project_id: projectId,
          secao,
          arquivo_url: fileUrl,
          nome_arquivo: file.name,
          tipo_arquivo: file.type,
          tamanho: file.size,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (!insertError && insertData) {
        setFiles(prev => [...prev, insertData as UploadedFile]);
      }

      setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
    }

    setIsUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    const { error } = await supabase
      .from('sale_form_attachments')
      .delete()
      .eq('id', fileId);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível remover o arquivo.', variant: 'destructive' });
      return;
    }

    setFiles(prev => prev.filter(f => f.id !== fileId));
    toast({ title: 'Arquivo removido', description: `"${fileName}" foi removido.` });
  };

  return (
    <div className="mt-6 border-t border-border pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Anexos desta seção
        </h4>
        {!disabled && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES}
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isCompressing || !projectId}
            >
              {isUploading || isCompressing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {isCompressing ? 'Comprimindo...' : isUploading ? 'Enviando...' : 'Anexar Arquivos'}
            </Button>
          </div>
        )}
      </div>

      {!projectId && !disabled && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Salve o rascunho primeiro para poder anexar arquivos.
        </p>
      )}

      {isCompressing && (
        <div className="mb-3 space-y-1">
          <p className="text-xs text-muted-foreground">Comprimindo vídeo... {compressProgress}%</p>
          <Progress value={compressProgress} className="h-1.5" />
        </div>
      )}

      {isUploading && !isCompressing && (
        <div className="mb-3 space-y-1">
          <p className="text-xs text-muted-foreground">Enviando... {uploadProgress}%</p>
          <Progress value={uploadProgress} className="h-1.5" />
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {files.map(file => {
            const Icon = getFileIcon(file.tipo_arquivo);
            return (
              <div
                key={file.id}
                className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg border border-border group"
              >
                <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <a
                    href={file.arquivo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium truncate block hover:underline"
                  >
                    {file.nome_arquivo}
                  </a>
                  {file.tamanho && (
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.tamanho)}</p>
                  )}
                </div>
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
                    onClick={() => handleDelete(file.id, file.nome_arquivo)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-2">
        Aceita: fotos, vídeos (até 50MB), PDF e Word. Vídeos grandes serão comprimidos automaticamente.
      </p>
    </div>
  );
}
