import { ArrowDownLeft, ArrowUpRight, ReceiptText } from "lucide-react";
import { TransactionForm } from "@/components/futgestor/transaction-form";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { TransactionWithOrigin } from "@/types/finance";

export function TransactionsList({ transactions, defaultDate }: { transactions: TransactionWithOrigin[]; defaultDate: string }) {
  return <section className="mt-12"><div className="flex items-end justify-between gap-4"><div><h2 className="text-xl font-bold">Movimentações</h2><p className="mt-1 text-sm text-[var(--muted)]">Receitas e despesas do período.</p></div><TransactionForm defaultDate={defaultDate}/></div>
    {transactions.length === 0 ? <div className="card mt-5 grid place-items-center px-5 py-12 text-center"><ReceiptText className="text-[var(--muted)]"/><p className="mt-4 text-[var(--muted)]">Nenhuma movimentação neste mês.</p></div> : <div className="card mt-5 divide-y divide-[var(--border)]">{transactions.map((transaction) => { const income = transaction.type === "income"; const Icon = income ? ArrowUpRight : ArrowDownLeft; return <article key={transaction.id} className="flex items-center gap-4 p-4 sm:p-5"><span className={`grid size-11 shrink-0 place-items-center rounded-xl ${income ? "bg-[var(--brand)]/10 text-[var(--brand)]" : "bg-[var(--danger)]/10 text-[var(--danger)]"}`}><Icon size={20}/></span><div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{transaction.description || transaction.category}</h3><p className="mt-1.5 text-xs text-[var(--muted)]">{income ? "Receita" : "Despesa"} · {transaction.origin} · {formatDate(transaction.transaction_date)}</p></div><strong className={income ? "text-[var(--brand)]" : "text-[var(--danger)]"}>{income ? "+" : "−"} {formatCurrency(transaction.amount)}</strong></article>; })}</div>}
  </section>;
}
