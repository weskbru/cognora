import {
  type ChangeEvent,
  type ComponentType,
  type InputHTMLAttributes,
  type PropsWithChildren,
  type ReactElement,
  useState,
} from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { useRewardsContext } from '@/context/RewardsContext';
import { Upload, FileText, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import DinoLoadingGame from '@/components/shared/DinoLoadingGame';

interface Subject {
  id: string;
  name: string;
}

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId?: string;
  onCreateSubject?: () => void;
}

interface RewardsContextValue {
  addXPForDocument: () => void;
}

interface SubjectEntityApi {
  list: (sort?: string) => Promise<Subject[]>;
}

const TypedDialogContent = DialogContent as ComponentType<PropsWithChildren<{ className?: string }>>;
const TypedDialogHeader = DialogHeader as ComponentType<PropsWithChildren<{ className?: string }>>;
const TypedDialogTitle = DialogTitle as ComponentType<PropsWithChildren>;
const TypedInput = Input as ComponentType<InputHTMLAttributes<HTMLInputElement>>;
const subjectApi = base44.entities.Subject as unknown as SubjectEntityApi;

export default function UploadDialog({
  open,
  onOpenChange,
  subjectId: preSelectedSubjectId,
  onCreateSubject,
}: UploadDialogProps): ReactElement {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState(preSelectedSubjectId || '');
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { addXPForDocument } = useRewardsContext() as RewardsContextValue;
  const navigate = useNavigate();

  const { data: subjects = [], isLoading: loadingSubjects } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: () => subjectApi.list('-created_date'),
  });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!name) setName(selectedFile.name.replace('.pdf', ''));
    }
  };

  const handleUpload = async (): Promise<void> => {
    if (!file || !subjectId || !name.trim()) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await base44.entities.Document.create({
        name: name.trim(),
        file_url,
        subject_id: subjectId,
        status: 'pending',
      });

      queryClient.invalidateQueries({ queryKey: ['documents'] });
      addXPForDocument();
      toast({ title: 'Documento enviado!', description: 'O PDF foi adicionado com sucesso.' });
      setFile(null);
      setName('');
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Erro no upload',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const createSubject = (): void => {
    onOpenChange(false);
    if (onCreateSubject) {
      onCreateSubject();
    } else {
      navigate('/subjects/new');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <TypedDialogContent className="w-[calc(100%-2rem)] max-w-md overflow-hidden">
        <TypedDialogHeader>
          <TypedDialogTitle>Enviar PDF</TypedDialogTitle>
        </TypedDialogHeader>
        {uploading ? (
          <div className="flex flex-col items-center gap-4 py-3 text-center">
            <DinoLoadingGame compact />
            <div>
              <p className="text-sm text-foreground">Enviando PDF...</p>
              <p className="mt-1 text-xs text-muted-foreground">Aproveite a espera para marcar alguns pontos.</p>
            </div>
          </div>
        ) : loadingSubjects && !preSelectedSubjectId ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando matérias...
          </div>
        ) : subjects.length === 0 && !preSelectedSubjectId ? (
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Crie uma matéria antes de enviar um PDF. Assim o documento fica organizado no lugar certo.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={createSubject}>Criar matéria</Button>
            </div>
          </div>
        ) : (
        <div className="min-w-0 space-y-4 mt-2">
          <div className="min-w-0">
            <label className="text-sm font-medium mb-2 block">Arquivo PDF</label>
            {file ? (
              <div className="flex w-full min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-lg bg-secondary p-3">
                <FileText className="h-5 w-5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setFile(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Clique para selecionar um PDF</span>
                <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
              </label>
            )}
          </div>

          <div className="min-w-0">
            <label className="text-sm font-medium mb-2 block">Nome do documento</label>
            <TypedInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do documento"
              className="max-w-full truncate"
            />
          </div>

          {!preSelectedSubjectId && (
            <div className="min-w-0">
              <label className="text-sm font-medium mb-2 block">Matéria</label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a matéria" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s: Subject) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              onClick={handleUpload}
              disabled={!file || !subjectId || !name.trim() || uploading}
            >
              Enviar
            </Button>
          </div>
        </div>
        )}
      </TypedDialogContent>
    </Dialog>
  );
}
