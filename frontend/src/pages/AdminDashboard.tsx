import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertCircle, Banknote, Clock, Loader2, Receipt, ShieldCheck, Users } from 'lucide-react';

import { adminApi, type AdminAuditLog, type AdminPaymentRequest } from '@/api/admin';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function statusLabel(status: AdminPaymentRequest['status']): string {
  const labels = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado', expired: 'Expirado' };
  return labels[status];
}

function AuditText({ log }: { log: AdminAuditLog }) {
  return (
    <div>
      <p className="font-medium text-foreground">{log.action}</p>
      <p className="text-xs text-muted-foreground">
        {log.admin_email} {log.target_user_email ? `-> ${log.target_user_email}` : ''}
      </p>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const canUseAdmin = user?.role === 'admin';
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => adminApi.overview(),
    enabled: canUseAdmin,
  });

  if (!canUseAdmin) {
    return (
      <Card className="p-6 rounded-lg">
        <h1 className="text-xl font-semibold text-foreground">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground mt-2">Esta area e exclusiva para administradores.</p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-6 rounded-lg border-red-200">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span className="font-semibold">Falha ao carregar painel admin.</span>
        </div>
      </Card>
    );
  }

  const cards = [
    { label: 'Usuarios totais', value: data.total_users, icon: Users },
    { label: 'Planos ativos', value: data.active_pro_users, icon: ShieldCheck },
    { label: 'Pix pendentes', value: data.pending_pix, icon: Receipt },
    { label: 'Aprovados no mes', value: data.approved_this_month, icon: Activity },
    { label: 'Receita manual', value: formatCurrency(data.revenue_cents_this_month), icon: Banknote },
    { label: 'Vencendo em 7 dias', value: data.expiring_soon, icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Visao operacional de usuarios, Pix e auditoria.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/users">Usuarios</Link>
          </Button>
          <Button asChild>
            <Link to="/admin/payments">Pagamentos Pix</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4 rounded-lg">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-lg">
          <div className="p-4 border-b">
            <h2 className="text-base font-semibold text-foreground">Pagamentos recentes</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recent_payment_requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">Sem pagamentos recentes.</TableCell>
                </TableRow>
              )}
              {data.recent_payment_requests.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.user_email}</TableCell>
                  <TableCell className="font-mono text-xs">{payment.pix_reference}</TableCell>
                  <TableCell><Badge variant="outline">{statusLabel(payment.status)}</Badge></TableCell>
                  <TableCell className="text-right">{formatCurrency(payment.amount_cents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="rounded-lg">
          <div className="p-4 border-b">
            <h2 className="text-base font-semibold text-foreground">Auditoria recente</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Quando</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recent_audit_logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="h-20 text-center text-muted-foreground">Sem eventos recentes.</TableCell>
                </TableRow>
              )}
              {data.recent_audit_logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell><AuditText log={log} /></TableCell>
                  <TableCell>{formatDateTime(log.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
