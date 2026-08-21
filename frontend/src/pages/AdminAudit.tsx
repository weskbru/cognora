import { useState, type ChangeEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2, Search } from 'lucide-react';

import { adminApi, type AdminAuditLog } from '@/api/admin';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '@/components/ui/badge';
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

type ActionFilter =
  | 'all'
  | 'manual_plan_granted'
  | 'manual_plan_revoked'
  | 'pix_payment_approved'
  | 'pix_payment_rejected'
  | 'user_password_reset_by_admin'
  | 'user_deleted_by_admin';

const ACTION_LABELS: Record<string, string> = {
  manual_plan_granted: 'Plano liberado',
  manual_plan_revoked: 'Plano removido',
  pix_payment_approved: 'Pix aprovado',
  pix_payment_rejected: 'Pix rejeitado',
  user_password_reset_by_admin: 'Senha redefinida',
  user_deleted_by_admin: 'Usuario excluido',
};

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}

function metadataText(log: AdminAuditLog): string {
  const metadata = log.metadata || {};
  const text = JSON.stringify(metadata);
  return text.length > 160 ? `${text.slice(0, 160)}...` : text;
}

export default function AdminAudit() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [action, setAction] = useState<ActionFilter>('all');

  const canUseAdmin = user?.role === 'admin';
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['admin-audit-logs', query, action],
    queryFn: () => adminApi.auditLogs({ q: query, action, limit: 100 }),
    enabled: canUseAdmin,
  });

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Auditoria</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Eventos administrativos de Pix e liberacao manual de acesso.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            placeholder="Buscar por admin, usuario ou alvo"
            className="pl-9"
          />
        </div>
        <Select value={action} onValueChange={(value) => setAction(value as ActionFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="Evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="manual_plan_granted">Plano liberado</SelectItem>
            <SelectItem value="manual_plan_revoked">Plano removido</SelectItem>
            <SelectItem value="pix_payment_approved">Pix aprovado</SelectItem>
            <SelectItem value="pix_payment_rejected">Pix rejeitado</SelectItem>
            <SelectItem value="user_password_reset_by_admin">Senha redefinida</SelectItem>
            <SelectItem value="user_deleted_by_admin">Usuario excluido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Card className="p-4 rounded-lg border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span className="font-semibold">Falha ao carregar auditoria.</span>
          </div>
        </Card>
      )}

      <Card className="rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Usuario alvo</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhum evento encontrado.
                </TableCell>
              </TableRow>
            )}
            {data.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">{formatDateTime(log.created_at)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{actionLabel(log.action)}</Badge>
                </TableCell>
                <TableCell>{log.admin_email}</TableCell>
                <TableCell>{log.target_user_email || '-'}</TableCell>
                <TableCell className="max-w-[360px] font-mono text-xs text-muted-foreground">
                  {metadataText(log)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
