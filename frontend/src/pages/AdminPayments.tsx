import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Loader2, Search, X } from 'lucide-react';

import { subscriptionsApi, type PaymentStatus, type PixPaymentRequest } from '@/api/subscriptions';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Textarea } from '@/components/ui/textarea';

type StatusFilter = PaymentStatus | 'all';

const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  expired: 'Expirado',
};

const STATUS_CLASSES: Record<PaymentStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  expired: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function planLabel(plan: PixPaymentRequest['plan']): string {
  return plan === 'unlimited' ? 'Ilimitado' : 'Pro';
}

export default function AdminPayments() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [selected, setSelected] = useState<PixPaymentRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [paidAt, setPaidAt] = useState('');
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canUseAdmin = user?.role === 'admin';
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-payment-requests', query, status],
    queryFn: () => subscriptionsApi.listAdminPaymentRequests({ q: query, status, limit: 100 }),
    enabled: canUseAdmin,
  });

  const selectedStatus = selected?.status || 'pending';
  const pendingCount = useMemo(() => data.filter((item) => item.status === 'pending').length, [data]);

  if (!canUseAdmin) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="p-6 rounded-lg">
          <h1 className="text-xl font-semibold text-foreground">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Esta área é exclusiva para administradores.
          </p>
        </Card>
      </div>
    );
  }

  const runDecision = async (decision: 'approve' | 'reject') => {
    if (!selected) return;
    setActionLoading(decision);
    setMessage(null);
    try {
      const payload = {
        admin_note: adminNote || undefined,
        paid_at: decision === 'approve' && paidAt ? new Date(paidAt).toISOString() : undefined,
      };
      if (decision === 'approve') {
        await subscriptionsApi.approvePaymentRequest(selected.id, payload);
      } else {
        await subscriptionsApi.rejectPaymentRequest(selected.id, payload);
      }
      setMessage({ type: 'success', text: decision === 'approve' ? 'Plano ativado.' : 'Pedido rejeitado.' });
      setSelected(null);
      setAdminNote('');
      setPaidAt('');
      await refetch();
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Não foi possível concluir a ação.';
      setMessage({ type: 'error', text });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Pagamentos Pix</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pendingCount} pedido{pendingCount === 1 ? '' : 's'} pendente{pendingCount === 1 ? '' : 's'} na busca atual.
          </p>
        </div>
        {message && (
          <Badge variant="outline" className={message.type === 'success' ? 'text-emerald-700' : 'text-red-700'}>
            {message.text}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por e-mail, nome ou referência"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="rejected">Rejeitados</SelectItem>
            <SelectItem value="expired">Expirados</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Referência</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && data.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Nenhum pedido encontrado.
                </TableCell>
              </TableRow>
            )}
            {data.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  <div className="font-medium text-foreground">{payment.user_email}</div>
                  {payment.user_name && (
                    <div className="text-xs text-muted-foreground">{payment.user_name}</div>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{payment.pix_reference}</TableCell>
                <TableCell>{planLabel(payment.plan)}</TableCell>
                <TableCell>{formatCurrency(payment.amount_cents)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={STATUS_CLASSES[payment.status]}>
                    {STATUS_LABELS[payment.status]}
                  </Badge>
                </TableCell>
                <TableCell>{formatDateTime(payment.created_at)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelected(payment);
                      setAdminNote(payment.admin_note || '');
                      setPaidAt('');
                    }}
                  >
                    Revisar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {selected && (
        <Card className="p-5 rounded-lg border-primary/30">
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Revisar pedido</h2>
                <p className="text-sm text-muted-foreground">{selected.user_email}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground">Referência</p>
                  <p className="font-mono font-semibold break-all">{selected.pix_reference}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground">Plano</p>
                  <p className="font-semibold">{planLabel(selected.plan)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground">Valor</p>
                  <p className="font-semibold">{formatCurrency(selected.amount_cents)}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="paid-at">Data do pagamento</Label>
                  <Input
                    id="paid-at"
                    type="datetime-local"
                    value={paidAt}
                    onChange={(event) => setPaidAt(event.target.value)}
                    disabled={selectedStatus !== 'pending'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status atual</Label>
                  <div className="h-9 flex items-center">
                    <Badge variant="outline" className={STATUS_CLASSES[selected.status]}>
                      {STATUS_LABELS[selected.status]}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-note">Nota administrativa</Label>
                <Textarea
                  id="admin-note"
                  value={adminNote}
                  onChange={(event) => setAdminNote(event.target.value)}
                  disabled={selectedStatus !== 'pending'}
                  placeholder="Ex.: confirmado no extrato do banco"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border bg-secondary/40 p-3 text-sm text-muted-foreground">
                Confira no banco se a referência, o valor e o pagador batem antes de aprovar.
              </div>
              <Button
                className="w-full gap-2"
                disabled={selectedStatus !== 'pending' || actionLoading !== null}
                onClick={() => runDecision('approve')}
              >
                {actionLoading === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Aprovar e ativar 30 dias
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                disabled={selectedStatus !== 'pending' || actionLoading !== null}
                onClick={() => runDecision('reject')}
              >
                {actionLoading === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Rejeitar pedido
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
