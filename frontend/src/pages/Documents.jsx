import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileText, Upload, Search, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import UploadDialog from '@/components/documents/UploadDialog';
import { format } from 'date-fns';

const statusMap = {
  pending:    { label: 'Pendente',    class: 'bg-amber-100 text-amber-700' },
  processing: { label: 'Processando', class: 'bg-blue-100 text-blue-700' },
  completed:  { label: 'Concluído',   class: 'bg-emerald-100 text-emerald-700' },
  error:      { label: 'Erro',        class: 'bg-red-100 text-red-700' },
};

export default function Documents() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, loading: false });
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list(),
  });

  const handleDelete = async (e, docId) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteDialog({ open: true, id: docId, loading: false });
  };

  const confirmDelete = async () => {
    setDeleteDialog(prev => ({ ...prev, loading: true }));
    try {
      await base44.entities.Document.delete(deleteDialog.id);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setDeleteDialog({ open: false, id: null, loading: false });
    } catch (error) {
      console.error('Erro ao deletar documento:', error);
      setDeleteDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const filtered = documents.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Documentos" description="Todos os seus PDFs enviados">
        <Button className="gap-2" onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4" /> Enviar PDF
        </Button>
      </PageHeader>

      {documents.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum documento"
          description="Envie seu primeiro PDF para começar"
          actionLabel="Enviar PDF"
          onAction={() => setUploadOpen(true)}
        />
      ) : filtered.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">Nenhum documento encontrado</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(doc => {
            const subject = subjects.find(s => s.id === doc.subject_id);
            const st = statusMap[doc.status] || statusMap.pending;
            return (
              <Link key={doc.id} to={`/documents/${doc.id}`}>
                <Card className="p-4 hover:shadow-md transition-shadow flex items-center gap-4">
                  <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {subject?.name || 'Sem matéria'} · {format(new Date(doc.created_date), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <Badge variant="secondary" className={st.class}>{st.label}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 shrink-0"
                    onClick={(e) => handleDelete(e, doc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !deleteDialog.loading && setDeleteDialog({ ...deleteDialog, open })}
        title="Excluir documento?"
        description="Este documento será removido permanentemente. Todos os resumos, questões e flashcards associados também serão excluídos."
        confirmLabel="Excluir documento"
        onConfirm={confirmDelete}
        isLoading={deleteDialog.loading}
      />

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} subjectId={undefined} />
    </div>
  );
}
