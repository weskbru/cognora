import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BookOpen, FileText, HelpCircle, Sparkles, ArrowRight, Clock } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import StatCard from '@/components/shared/StatCard';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { format } from 'date-fns';

const statusMap = {
  pending: { label: 'Pendente', class: 'bg-amber-100 text-amber-700' },
  processing: { label: 'Processando', class: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Concluído', class: 'bg-emerald-100 text-emerald-700' },
  error: { label: 'Erro', class: 'bg-red-100 text-red-700' },
};

export default function Dashboard() {
  const { user } = useAuth();

  const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ['subjects', user?.email],
    queryFn: () => base44.entities.Subject.filter({ owner_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
  });

  const { data: questions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.Question.list('-created_date'),
  });

  const { data: summaries = [], isLoading: loadingSummaries } = useQuery({
    queryKey: ['summaries'],
    queryFn: () => base44.entities.Summary.list('-created_date'),
  });

  const isLoading = loadingSubjects || loadingDocs || loadingQuestions || loadingSummaries;
  const recentDocs = documents.slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="Visão geral do seu progresso de estudos" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Matérias" value={subjects.length} color="bg-primary/10 text-primary" />
        <StatCard icon={FileText} label="Documentos" value={documents.length} color="bg-accent/10 text-accent" />
        <StatCard icon={Sparkles} label="Resumos" value={summaries.length} color="bg-emerald-100 text-emerald-600" />
        <StatCard icon={HelpCircle} label="Questões" value={questions.length} color="bg-amber-100 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Documentos Recentes</h2>
              <Link to="/documents" className="text-sm text-primary hover:underline flex items-center gap-1">
                Ver todos <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {recentDocs.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Nenhum documento ainda"
                description="Faça upload do seu primeiro PDF para começar a estudar com IA"
                actionLabel="Enviar PDF"
                actionPath="/documents"
              />
            ) : (
              <div className="space-y-3">
                {recentDocs.map(doc => {
                  const subject = subjects.find(s => s.id === doc.subject_id);
                  const st = statusMap[doc.status] || statusMap.pending;
                  return (
                    <Link key={doc.id} to={`/documents/${doc.id}`} className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary transition-colors">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{subject?.name || 'Sem matéria'}</p>
                      </div>
                      <Badge variant="secondary" className={st.class}>{st.label}</Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Matérias</h2>
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma matéria criada.</p>
            ) : (
              <div className="space-y-3">
                {subjects.slice(0, 6).map(sub => {
                  const docCount = documents.filter(d => d.subject_id === sub.id).length;
                  return (
                    <Link key={sub.id} to={`/subjects/${sub.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors">
                      <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                        <BookOpen className="h-3.5 w-3.5 text-accent" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{sub.name}</p>
                        <p className="text-xs text-muted-foreground">{docCount} documento{docCount !== 1 ? 's' : ''}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}