import { useMemo, useState, type ChangeEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Activity, Loader2, Search, TriangleAlert } from 'lucide-react';

import { adminApi, type SystemEvent, type SystemEventLevel } from '@/api/admin';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type LevelFilter = 'all' | SystemEventLevel;

const LEVEL_LABELS: Record<SystemEventLevel, string> = {
  info: 'Info',
  warning: 'Aviso',
  error: 'Erro',
};

const LEVEL_CLASSES: Record<SystemEventLevel, string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  error: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
};

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function metadataText(event: SystemEvent): string {
  const text = JSON.stringify(event.metadata || {});
  return text.length > 180 ? `${text.slice(0, 180)}...` : text;
}

function eventTypeLabel(value: string): string {
  return value.replaceAll('_', ' ');
}

export default function AdminObservability() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<LevelFilter>('all');
  const [eventType, setEventType] = useState('all');

  const canUseAdmin = user?.role === 'admin';

  const summaryQuery = useQuery({
    queryKey: ['admin-system-events-summary'],
    queryFn: () => adminApi.systemEventsSummary(),
    enabled: canUseAdmin,
    refetchInterval: 60_000,
  });

  const eventsQuery = useQuery({
    queryKey: ['admin-system-events', query, level, eventType],
    queryFn: () => adminApi.systemEvents({
      q: query,
      level,
      event_type: eventType,
      limit: 100,
    }),
    enabled: canUseAdmin,
    refetchInterval: 60_000,
  });

  const eventTypeOptions = useMemo(() => {
    const summaryTypes = Object.keys(summaryQuery.data?.by_type_7d || {});
    const currentTypes = eventsQuery.data?.map((event) => event.event_type) || [];
    return Array.from(new Set([...summaryTypes, ...currentTypes])).sort();
  }, [eventsQuery.data, summaryQuery.data]);

  const topTypes = useMemo(() => {
    const entries = Object.entries(summaryQuery.data?.by_type_7d || {});
    return entries.sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [summaryQuery.data]);

  if (!canUseAdmin) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="p-6 rounded-lg">
          <h1 className="text-xl font-semibold text-foreground">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground mt-2">Esta area e exclusiva para administradores.</p>
        </Card>
      </div>
    );
  }

  const events = eventsQuery.data || [];
  const summary = summaryQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Observabilidade</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Eventos operacionais para investigar login, upload, limites e geracao por IA.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            summaryQuery.refetch();
            eventsQuery.refetch();
          }}
          disabled={summaryQuery.isFetching || eventsQuery.isFetching}
        >
          {(summaryQuery.isFetching || eventsQuery.isFetching) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Card className="rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Erros 24h</span>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{summary?.last_24h.error ?? 0}</p>
        </Card>
        <Card className="rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Avisos 24h</span>
            <TriangleAlert className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{summary?.last_24h.warning ?? 0}</p>
        </Card>
        <Card className="rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Info 24h</span>
            <Activity className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{summary?.last_24h.info ?? 0}</p>
        </Card>
        <Card className="rounded-lg p-4">
          <span className="text-sm font-medium text-muted-foreground">Eventos 7 dias</span>
          <p className="mt-2 text-2xl font-bold text-foreground">{summary?.total_7d ?? 0}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_260px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            placeholder="Buscar por mensagem, usuario, request id ou evento"
            className="pl-9"
          />
        </div>
        <Select value={level} onValueChange={(value) => setLevel(value as LevelFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="Nivel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="error">Erro</SelectItem>
            <SelectItem value="warning">Aviso</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger>
            <SelectValue placeholder="Tipo de evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos eventos</SelectItem>
            {eventTypeOptions.map((type) => (
              <SelectItem key={type} value={type}>
                {eventTypeLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {summaryQuery.error || eventsQuery.error ? (
        <Card className="p-4 rounded-lg border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span className="font-semibold">Falha ao carregar eventos operacionais.</span>
          </div>
        </Card>
      ) : null}

      {topTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {topTypes.map(([type, count]) => (
            <Badge key={type} variant="outline" className="rounded-md px-2.5 py-1">
              {eventTypeLabel(type)}: {count}
            </Badge>
          ))}
        </div>
      )}

      <Card className="rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Nivel</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Mensagem</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventsQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!eventsQuery.isLoading && events.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhum evento encontrado.
                </TableCell>
              </TableRow>
            )}
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="whitespace-nowrap">{formatDateTime(event.created_at)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={LEVEL_CLASSES[event.level]}>
                    {LEVEL_LABELS[event.level]}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className="font-mono text-xs">{event.event_type}</span>
                </TableCell>
                <TableCell>{event.user_email || '-'}</TableCell>
                <TableCell className="max-w-[320px]">{event.message}</TableCell>
                <TableCell className="max-w-[360px] font-mono text-xs text-muted-foreground">
                  {metadataText(event)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
