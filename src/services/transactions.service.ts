// src/services/transactions.service.ts
import { supabase } from '@/lib/supabase';

/* ------------------------------ Tipos ------------------------------ */

export type TxKind = 'income' | 'expense'; // o Figma só tem entrada/saída (sem transferência)
export type TxFilter = 'all' | TxKind;

export type Category = {
  id: string;
  name: string;
  transaction_type: 'income' | 'expense' | 'transfer';
  icon: string | null; // nome de ícone lucide: 'utensils', 'shopping-cart', 'car'...
  color: string | null;
};

export type Transaction = {
  id: string;
  account_id: string;
  category_id: string | null;
  type: TxKind;
  description: string;
  amount: number; // SEMPRE positivo no banco; o sinal vem do `type`
  transaction_date: string; // 'YYYY-MM-DD'
  notes: string | null;
  created_at: string; // ISO — serve pra mostrar a hora (09:12, 18:40)
  category: Pick<Category, 'id' | 'name' | 'icon' | 'color'> | null;
};

export type TransactionInput = {
  type: TxKind;
  description: string;
  amount: number;
  category_id: string | null;
  transaction_date: string; // 'YYYY-MM-DD'
  notes?: string | null;
  account_id?: string; // se não vier, usa a conta padrão
};

/* ------------------------------ Queries ------------------------------ */

const SELECT = `id, account_id, category_id, type, description, amount, transaction_date, notes, created_at, category:categories(id, name, icon, color)`;

export async function listTransactions(filter: TxFilter = 'all', search = '') {
  let q = supabase
    .from('transactions')
    .select(SELECT)
    .in('type', ['income', 'expense'])
    .neq('status', 'cancelled')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filter !== 'all') q = q.eq('type', filter);
  if (search.trim()) q = q.ilike('description', `%${search.trim()}%`);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Transaction[];
}

export async function getTransaction(id: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select(SELECT)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as unknown as Transaction;
}

// A RLS já filtra: volta as categorias padrão (user_id null) + as do próprio usuário (Dan)
export async function listCategories(kind: TxKind) {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, transaction_type, icon, color')
    .eq('transaction_type', kind)
    .order('name');
  if (error) throw error;
  return (data ?? []) as Category[];
}

/**
 * `transactions.account_id` é obrigatório no banco, mas o Figma não tem seletor de conta.
 * Solução provisória: usa a primeira conta ativa; se não existir nenhuma, cria "Carteira".
 * Quando a tela de Contas (Raí) ficar pronta, dá pra trocar por um seletor.
 */
export async function getOrCreateDefaultAccountId(): Promise<string> {
  const { data: existing, error } = await supabase
    .from('accounts')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) throw error;
  if (existing && existing.length > 0) return existing[0].id;

  const userId = await getUserId();
  const { data: created, error: insertError } = await supabase
    .from('accounts')
    .insert({ user_id: userId, name: 'Carteira', account_type: 'cash' })
    .select('id')
    .single();
  if (insertError) throw insertError;
  return created.id;
}

/* ------------------------------ Mutations ------------------------------ */

export async function createTransaction(input: TransactionInput) {
  const userId = await getUserId();
  const account_id = input.account_id ?? (await getOrCreateDefaultAccountId());

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      account_id,
      type: input.type,
      description: input.description.trim(),
      amount: input.amount,
      category_id: input.category_id,
      transaction_date: input.transaction_date,
      notes: input.notes?.trim() || null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateTransaction(id: string, patch: Partial<TransactionInput>) {
  const { error } = await supabase
    .from('transactions')
    .update({
      ...patch,
      ...(patch.description !== undefined && { description: patch.description.trim() }),
      ...(patch.notes !== undefined && { notes: patch.notes?.trim() || null }),
    })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTransaction(id: string) {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

/* ------------------------------ Helpers ------------------------------ */

async function getUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Usuário não autenticado');
  return data.user.id;
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 186.4 -> 'R$ 186,40' */
export const formatBRL = (value: number) => brl.format(value);

/** Com sinal, igual no Figma: '+R$ 3.100,00' / '-R$ 186,40' */
export const formatSigned = (value: number, kind: TxKind) =>
  `${kind === 'income' ? '+' : '-'}${brl.format(value).replace(/\s/g, ' ')}`;

/** Input do usuário ('1.234,56' ou '186,4') -> número. Retorna NaN se inválido. */
export const parseBRL = (text: string) =>
  Number(text.replace(/[^\d,]/g, '').replace(',', '.'));

/** Date -> 'YYYY-MM-DD' no fuso local (toISOString() usa UTC e pode voltar 1 dia) */
export const toDateOnly = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 'YYYY-MM-DD' -> '14/08/2026' */
export const formatDateBR = (iso: string) => iso.split('-').reverse().join('/');

/** ISO timestamp -> '18:40' */
export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
