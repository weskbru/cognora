import React, { useState } from 'react';
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

export default function UploadDialog({ open, onOpenChange, subjectId: preSelectedSubjectId, onCreateSubject }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState(preSelectedSubjectId || '');
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { addXPForDocument } = useRewardsContext();
  const navigate = useNavigate();

  const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list('-created_date'),
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!name) setName(selectedFile.name.replace('.pdf', ''));
    }
  };

  const handleUpload = async () => {
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
      toast({ title: 'Erro no upload', description: err.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const createSubject = () => {
    onOpenChange(false);
    if (onCreateSubject) {
      onCreateSubject();
    } else {
      navigate('/subjects/new');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar PDF</DialogTitle>
        </DialogHeader>
        {loadingSubjects && !preSelectedSubjectId ? (
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
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium mb-2 block">Arquivo PDF</label>
            {file ? (
              <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg min-w-0">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-sm flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{file.name}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFile(null)}>
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

          <div>
            <label className="text-sm font-medium mb-2 block">Nome do documento</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do documento"
              className="max-w-full truncate"
            />
          </div>

          {!preSelectedSubjectId && (
            <div>
              <label className="text-sm font-medium mb-2 block">Matéria</label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a matéria" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
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
              {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</> : 'Enviar'}
            </Button>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
