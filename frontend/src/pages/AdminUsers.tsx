import { useMemo, useState, type ChangeEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Search, ShieldCheck, Trash2, XCircle } from 'lucide-react';

import { adminApi, type AdminPlan, type AdminUser } from '@/api/admin';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

type PlanFilter = AdminPlan | 'all';
type GrantPlan = Exclude<AdminPlan, 'free'>;

const PLAN_LABELS: Record<AdminPlan, string> = {
  free: 'Basico',
  pro: 'Pro',
  unlimited: 'Ilimitado',
};

const PLAN_CLASSES: Record<AdminPlan, string> = {
  free: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  pro: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  unlimited: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function isActivePlan(user: AdminUser): boolean {
  return user.progress.plan !== 'free' && user.progress.subscription_status === 'active';
}

export default function AdminUsers() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState<PlanFilter>('all');
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [grantPlan, setGrantPlan] = useState<GrantPlan>('pro');
  const [grantDays, setGrantDays] = useState(30);
  const [note, setNote] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [actionLoading, setActionLoading] = useState<'grant' | 'revoke' | 'reset-password' | 'delete-user' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canUseAdmin = user?.role === 'admin';
  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: ['admin-users', query, plan],
    queryFn: () => adminApi.users({ q: query, plan, limit: 100 }),
    enabled: canUseAdmin,
  });

  const activeCount = useMemo(() => data.filter(isActivePlan).length, [data]);

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

  const runGrant = async () => {
    if (!selected) return;
    setActionLoading('grant');
    setMessage(null);
    try {
      await adminApi.grantPlan(selected.id, {
        plan: grantPlan,
        days: grantDays,
        note: note || undefined,
      });
      setMessage({ type: 'success', text: 'Plano liberado com auditoria registrada.' });
      setSelected(null);
      setNote('');
      await refetch();
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Nao foi possivel liberar o plano.';
      setMessage({ type: 'error', text });
    } finally {
      setActionLoading(null);
    }
  };

  const runRevoke = async () => {
    if (!selected) return;
    setActionLoading('revoke');
    setMessage(null);
    try {
      await adminApi.revokePlan(selected.id, { note: note || undefined });
      setMessage({ type: 'success', text: 'Plano removido com auditoria registrada.' });
      setSelected(null);
      setNote('');
      await refetch();
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Nao foi possivel remover o plano.';
      setMessage({ type: 'error', text });
    } finally {
      setActionLoading(null);
    }
  };

  const runResetPassword = async () => {
    if (!selected) return;
    setActionLoading('reset-password');
    setMessage(null);
    try {
      await adminApi.resetUserPassword(selected.id, {
        new_password: temporaryPassword,
        note: note || undefined,
      });
      setMessage({ type: 'success', text: 'Senha temporaria definida com auditoria registrada.' });
      setTemporaryPassword('');
      await refetch();
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Nao foi possivel redefinir a senha.';
      setMessage({ type: 'error', text });
    } finally {
      setActionLoading(null);
    }
  };

  const runDeleteUser = async () => {
    if (!selected) return;
    setActionLoading('delete-user');
    setMessage(null);
    try {
      await adminApi.deleteUser(selected.id, {
        confirm_email: deleteConfirm,
        note: note || undefined,
      });
      setMessage({ type: 'success', text: 'Usuario excluido com auditoria registrada.' });
      setSelected(null);
      setNote('');
      setTemporaryPassword('');
      setDeleteConfirm('');
      await refetch();
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Nao foi possivel excluir o usuario.';
      setMessage({ type: 'error', text });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data.length} resultado{data.length === 1 ? '' : 's'} na busca atual, {activeCount} com plano ativo.
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
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            placeholder="Buscar por e-mail ou username"
            className="pl-9"
          />
        </div>
        <Select value={plan} onValueChange={(value) => setPlan(value as PlanFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="Plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="free">Basico</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="unlimited">Ilimitado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Card className="p-4 rounded-lg border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span className="font-semibold">Falha ao carregar usuarios.</span>
          </div>
        </Card>
      )}

      <Card className="rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>XP</TableHead>
              <TableHead className="text-right">Acao</TableHead>
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
                  Nenhum usuario encontrado.
                </TableCell>
              </TableRow>
            )}
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="font-medium text-foreground">{item.email}</div>
                  {item.username && <div className="text-xs text-muted-foreground">{item.username}</div>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{item.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={PLAN_CLASSES[item.progress.plan]}>
                    {PLAN_LABELS[item.progress.plan]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {isActivePlan(item)
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      : <XCircle className="h-4 w-4 text-muted-foreground" />
                    }
                    <span className="text-sm">{item.progress.subscription_status}</span>
                  </div>
                </TableCell>
                <TableCell>{formatDateTime(item.progress.plan_expires_at)}</TableCell>
                <TableCell>{item.progress.xp}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelected(item);
                      setGrantPlan(item.progress.plan === 'unlimited' ? 'unlimited' : 'pro');
                      setNote('');
                      setTemporaryPassword('');
                      setDeleteConfirm('');
                    }}
                  >
                    Gerenciar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={!!selected}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setSelected(null);
            setNote('');
            setTemporaryPassword('');
            setDeleteConfirm('');
          }
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Gerenciar acesso</DialogTitle>
                <DialogDescription>{selected.email}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground">Plano atual</p>
                  <p className="font-semibold">{PLAN_LABELS[selected.progress.plan]}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-semibold">{selected.progress.subscription_status}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground">Vencimento</p>
                  <p className="font-semibold">{formatDateTime(selected.progress.plan_expires_at)}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Plano para liberar</Label>
                  <Select value={grantPlan} onValueChange={(value) => setGrantPlan(value as GrantPlan)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="unlimited">Ilimitado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grant-days">Dias de acesso</Label>
                  <Input
                    id="grant-days"
                    type="number"
                    min={1}
                    max={365}
                    value={grantDays}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setGrantDays(Number(event.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-note">Nota administrativa</Label>
                <Textarea
                  id="admin-note"
                  value={note}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNote(event.target.value)}
                  placeholder="Ex.: Pix confirmado no extrato em 03/06/2026"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border bg-secondary/40 p-3 text-sm text-muted-foreground">
                Toda liberacao ou remocao fica registrada na auditoria com admin, usuario e parametros usados.
              </div>
              <Button
                className="w-full gap-2"
                disabled={actionLoading !== null || grantDays < 1}
                onClick={runGrant}
              >
                {actionLoading === 'grant' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Liberar plano
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                disabled={actionLoading !== null || selected.progress.plan === 'free'}
                onClick={runRevoke}
              >
                {actionLoading === 'revoke' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Remover plano
              </Button>

              <div className="pt-3 border-t space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="temporary-password">Senha temporaria</Label>
                  <Input
                    id="temporary-password"
                    type="text"
                    value={temporaryPassword}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setTemporaryPassword(event.target.value)}
                    placeholder="Minimo 8 caracteres"
                  />
                </div>
                <Button
                  variant="secondary"
                  className="w-full gap-2"
                  disabled={actionLoading !== null || temporaryPassword.length < 8}
                  onClick={runResetPassword}
                >
                  {actionLoading === 'reset-password' ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Redefinir senha
                </Button>
              </div>

              <div className="pt-3 border-t space-y-3">
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
                  Excluir remove login, progresso e registros pessoais ligados ao e-mail. Esta acao nao pode ser desfeita.
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delete-confirm">Digite o e-mail para confirmar</Label>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirm}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setDeleteConfirm(event.target.value)}
                    placeholder={selected.email}
                  />
                </div>
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  disabled={
                    actionLoading !== null ||
                    deleteConfirm.trim().toLowerCase() !== selected.email.toLowerCase() ||
                    selected.email === user?.email
                  }
                  onClick={runDeleteUser}
                >
                  {actionLoading === 'delete-user' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Excluir usuario
                </Button>
              </div>
            </div>
          </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
