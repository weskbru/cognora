import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Sparkles, HelpCircle, Layers, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import SummarySection from '@/components/documents/SummarySection';
import QuestionsSection from '@/components/documents/QuestionsSection';
import FlashcardsSection from '@/components/documents/FlashcardsSection';

const statusMap = {
  pending:    { label: 'Pendente',    class: 'bg-amber-100 text-amber-700' },
  processing: { label: 'Processando', class: 'bg-blue-100 text-blue-700' },
  completed:  { label: 'Concluído',   class: 'bg-emerald-100 text-emerald-700' },
  error:      { label: 'Erro',        class: 'bg-red-100 text-red-700' },
};

export default function DocumentDetail() {
  const documentId = window.location.pathname.split('/documents/')[1];
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [deleteDialog, setDeleteDialog] = useState({ open: false, loading: false });

  const { data: document, isLoading } = useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => {
      const docs = await base44.entities.Document.filter({ id: documentId });
      return docs[0];
    },
    enabled: !!documentId,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list(),
  });

  const { data: summaries = [] } = useQuery({
    queryKey: ['summaries', documentId],
    queryFn: () => base44.entities.Summary.filter({ document_id: documentId }),
    enabled: !!documentId,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions', documentId],
    queryFn: () => base44.entities.Question.filter({ document_id: documentId }),
    enabled: !!documentId,
  });

  const { data: flashcards = [] } = useQuery({
    queryKey: ['flashcards', documentId],
    queryFn: () => base44.entities.Flashcard.filter({ document_id: documentId }),
    enabled: !!documentId,
  });

  const handleDelete = () => {
    setDeleteDialog({ open: true, loading: false });
  };

  const confirmDelete = async () => {
    setDeleteDialog(prev => ({ ...prev, loading: true }));
    try {
      await base44.entities.Document.delete(documentId);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      navigate('/documents');
    } catch (error) {
      console.error('Erro ao deletar documento:', error);
      setDeleteDialog(prev => ({ ...prev, loading: false }));
    }
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-64" /></div>;
  }

  if (!document) {
    return <div className="text-center py-16 text-muted-foreground">Documento não encontrado</div>;
  }

  const subject = subjects.find(s => s.id === document.subject_id);
  const st = statusMap[document.status] || statusMap.pending;

  return (
    <div>
      <Link to="/documents" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar para documentos
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{document.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {subject && <span className="text-sm text-muted-foreground">{subject.name}</span>}
              <Badge variant="secondary" className={st.class}>{st.label}</Badge>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2 text-red-500 hover:text-red-600 hover:border-red-300" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" /> Excluir
        </Button>
      </div>

      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList>
          <TabsTrigger value="summary" className="gap-2">
            <Sparkles className="h-4 w-4" /> Resumo
          </TabsTrigger>
          <TabsTrigger value="questions" className="gap-2">
            <HelpCircle className="h-4 w-4" /> Questões ({questions.length})
          </TabsTrigger>
          <TabsTrigger value="flashcards" className="gap-2">
            <Layers className="h-4 w-4" /> Flashcards ({flashcards.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <SummarySection document={document} summaries={summaries} documentId={documentId} />
        </TabsContent>

        <TabsContent value="questions">
          <QuestionsSection document={document} questions={questions} documentId={documentId} subjectId={document.subject_id} />
        </TabsContent>

        <TabsContent value="flashcards">
          <FlashcardsSection document={document} flashcards={flashcards} documentId={documentId} />
        </TabsContent>
      </Tabs>

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !deleteDialog.loading && setDeleteDialog({ ...deleteDialog, open })}
        title="Excluir documento?"
        description="Este documento será removido permanentemente. Todos os resumos, questões e flashcards associados também serão excluídos."
        confirmLabel="Excluir documento"
        onConfirm={confirmDelete}
        isLoading={deleteDialog.loading}
      />
    </div>
  );
}
