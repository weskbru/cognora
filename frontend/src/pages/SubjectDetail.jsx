import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Upload, Plus, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import UploadDialog from '@/components/documents/UploadDialog';

const statusMap = {
  pending: { label: 'Pendente', class: 'bg-amber-100 text-amber-700' },
  processing: { label: 'Processando', class: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Concluído', class: 'bg-emerald-100 text-emerald-700' },
  error: { label: 'Erro', class: 'bg-red-100 text-red-700' },
};

export default function SubjectDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const subjectId = window.location.pathname.split('/subjects/')[1];
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: subject, isLoading: loadingSubject } = useQuery({
    queryKey: ['subject', subjectId],
    queryFn: async () => {
      const subjects = await base44.entities.Subject.filter({ id: subjectId });
      return subjects[0];
    },
    enabled: !!subjectId,
  });

  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['documents', 'subject', subjectId],
    queryFn: () => base44.entities.Document.filter({ subject_id: subjectId }, '-created_date'),
    enabled: !!subjectId,
  });

  if (loadingSubject) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40" /></div>;
  }

  if (!subject) {
    return <div className="text-center py-16 text-muted-foreground">Matéria não encontrada</div>;
  }

  return (
    <div>
      <Link to="/subjects" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar para matérias
      </Link>

      <PageHeader title={subject.name} description={subject.description}>
        <Button className="gap-2" onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4" /> Enviar PDF
        </Button>
      </PageHeader>

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum documento nesta matéria"
          description="Envie um PDF para gerar resumos e questões automaticamente"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map(doc => {
            const st = statusMap[doc.status] || statusMap.pending;
            return (
              <Link key={doc.id} to={`/documents/${doc.id}`}>
                <Card className="p-5 hover:shadow-md transition-shadow h-full">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{doc.name}</p>
                      <Badge variant="secondary" className={`${st.class} mt-2`}>{st.label}</Badge>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        subjectId={subjectId}
      />
    </div>
  );
}