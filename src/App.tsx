import { useEffect, useState, useCallback } from "react";
import { Plus, ArrowLeftRight, List, X, Edit3, Trash2, Check } from "lucide-react";
import type {
  BalanceResponse,
  CombinedRecord,
  ExpensePayload,
  ExpenseType,
  Payer,
  RepaymentPayload,
} from "@/types";
import {
  fetchBalance,
  fetchRecords,
  createExpense,
  updateExpense,
  deleteExpense,
  createRepayment,
  updateRepayment,
  deleteRepayment,
} from "@/api";
import {
  formatCurrency,
  formatDate,
  formatDateFull,
  todayISO,
  expenseTypeLabel,
  debtImpact,
} from "@/utils";

type View = "home" | "addExpense" | "editExpense" | "addRepayment" | "editRepayment" | "records";

interface EditingExpense {
  id: string;
  date: string;
  payer: Payer;
  item: string;
  amount: number;
  expense_type: ExpenseType;
  note: string;
}

interface EditingRepayment {
  id: string;
  date: string;
  payer: Payer;
  receiver: Payer;
  amount: number;
  note: string;
}

export default function App() {
  const [view, setView] = useState<View>("home");
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [records, setRecords] = useState<CombinedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<EditingExpense | null>(null);
  const [editingRepayment, setEditingRepayment] = useState<EditingRepayment | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [bal, recs] = await Promise.all([fetchBalance(), fetchRecords()]);
      setBalance(bal);
      setRecords(recs.records);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入資料");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function navigate(v: View) {
    setView(v);
    setError(null);
  }

  function startEditExpense(r: CombinedRecord) {
    setEditingExpense({
      id: r.id,
      date: r.date,
      payer: r.payer!,
      item: r.item!,
      amount: r.amount!,
      expense_type: r.expense_type!,
      note: r.note || "",
    });
    navigate("editExpense");
  }

  function startEditRepayment(r: CombinedRecord) {
    setEditingRepayment({
      id: r.id,
      date: r.date,
      payer: r.payer!,
      receiver: r.receiver!,
      amount: r.amount!,
      note: r.note || "",
    });
    navigate("editRepayment");
  }

  async function handleDeleteRecord(r: CombinedRecord) {
    if (!confirm("確定要刪除這筆紀錄嗎？")) return;
    try {
      if (r.record_type === "expense") {
        await deleteExpense(r.id);
      } else {
        await deleteRepayment(r.id);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "刪除失敗");
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <div className="mx-auto max-w-md min-h-screen bg-white shadow-sm flex flex-col">
        {error && (
          <div className="mx-4 mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X size={16} />
            </button>
          </div>
        )}

        {view === "home" && (
          <HomeView
            balance={balance}
            records={records}
            loading={loading}
            onNavigate={navigate}
          />
        )}

        {(view === "addExpense" || view === "editExpense") && (
          <ExpenseForm
            editing={view === "editExpense" ? editingExpense : null}
            onSubmit={async (payload) => {
              if (view === "editExpense" && editingExpense) {
                await updateExpense(editingExpense.id, payload);
              } else {
                await createExpense(payload);
              }
              await refresh();
              navigate("home");
            }}
            onCancel={() => navigate("home")}
          />
        )}

        {(view === "addRepayment" || view === "editRepayment") && (
          <RepaymentForm
            editing={view === "editRepayment" ? editingRepayment : null}
            balance={balance}
            onSubmit={async (payload) => {
              if (view === "editRepayment" && editingRepayment) {
                await updateRepayment(editingRepayment.id, payload);
              } else {
                await createRepayment(payload);
              }
              await refresh();
              navigate("home");
            }}
            onCancel={() => navigate("home")}
          />
        )}

        {view === "records" && (
          <RecordsView
            records={records}
            onBack={() => navigate("home")}
            onEditExpense={startEditExpense}
            onEditRepayment={startEditRepayment}
            onDelete={handleDeleteRecord}
          />
        )}
      </div>
    </div>
  );
}

// --- Home View ---

function HomeView({
  balance,
  records,
  loading,
  onNavigate,
}: {
  balance: BalanceResponse | null;
  records: CombinedRecord[];
  loading: boolean;
  onNavigate: (v: View) => void;
}) {
  const recentRecords = records.slice(0, 5);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-stone-800">
          Boi <span className="text-stone-400 font-light">×</span> 土土
        </h1>
        <p className="text-sm text-stone-400 mt-1">雙人記帳系統</p>
      </div>

      {/* Balance Card */}
      <div className="px-4">
        <div className="rounded-2xl bg-gradient-to-br from-stone-800 to-stone-900 p-6 shadow-lg">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-3">
            目前結算
          </p>
          {loading ? (
            <div className="h-16 animate-pulse rounded-lg bg-stone-700/50" />
          ) : balance?.display.settled ? (
            <div className="py-2">
              <p className="text-lg font-medium text-stone-300">已結清</p>
              <p className="text-sm text-stone-500 mt-1">雙方互不相欠</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-stone-400">
                {balance?.display.debtor} 應付給 {balance?.display.creditor}
              </p>
              <p className="text-4xl font-bold text-white mt-1">
                {formatCurrency(balance?.display.amount || 0)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 mt-4 flex gap-3">
        <button
          onClick={() => onNavigate("addExpense")}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-stone-800 px-4 py-3.5 text-sm font-medium text-white hover:bg-stone-900 active:scale-[0.98] transition-all"
        >
          <Plus size={18} />
          新增支出
        </button>
        <button
          onClick={() => onNavigate("addRepayment")}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-stone-200 px-4 py-3.5 text-sm font-medium text-stone-700 hover:bg-stone-50 active:scale-[0.98] transition-all"
        >
          <ArrowLeftRight size={18} />
          新增還款
        </button>
      </div>

      {/* Recent Records */}
      <div className="px-4 mt-8 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-stone-500">最近紀錄</h2>
          <button
            onClick={() => onNavigate("records")}
            className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600"
          >
            <List size={14} />
            查看全部
          </button>
        </div>

        {recentRecords.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-200 py-12 text-center">
            <p className="text-sm text-stone-400">尚無紀錄</p>
            <p className="text-xs text-stone-300 mt-1">點上方按鈕開始記帳</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentRecords.map((r) => (
              <RecordRow key={`${r.record_type}-${r.id}`} record={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Record Row ---

function RecordRow({ record }: { record: CombinedRecord }) {
  const isExpense = record.record_type === "expense";
  const icon = isExpense ? (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
      <span className="text-xs font-bold">{record.payer === "Boi" ? "B" : "土"}</span>
    </div>
  ) : (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
      <ArrowLeftRight size={16} />
    </div>
  );

  return (
    <div className="flex items-start gap-3 rounded-xl border border-stone-100 bg-white px-3 py-3">
      {icon}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-stone-800 truncate">
            {isExpense ? record.item : "還款"}
          </span>
          <span className="text-sm font-semibold text-stone-700 shrink-0">
            {formatCurrency(record.amount!)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-xs text-stone-400">
            {formatDate(record.date)} · {record.payer}
            {isExpense ? ` · ${expenseTypeLabel(record.expense_type!)}` : ` → ${record.receiver}`}
          </span>
        </div>
        <p className="text-xs text-stone-500 mt-1">{debtImpact(record)}</p>
      </div>
    </div>
  );
}

// --- Expense Form ---

function ExpenseForm({
  editing,
  onSubmit,
  onCancel,
}: {
  editing: EditingExpense | null;
  onSubmit: (payload: ExpensePayload) => Promise<void>;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(editing?.date || todayISO());
  const [payer, setPayer] = useState<Payer>(editing?.payer || "Boi");
  const [item, setItem] = useState(editing?.item || "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [expenseType, setExpenseType] = useState<ExpenseType>(
    editing?.expense_type || "shared",
  );
  const [note, setNote] = useState(editing?.note || "");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseInt(amount, 10);
    if (!item.trim()) return setFormError("請輸入項目名稱");
    if (!amt || amt <= 0) return setFormError("請輸入有效金額");
    if (!date) return setFormError("請選擇日期");

    setSaving(true);
    setFormError(null);
    try {
      await onSubmit({
        date,
        payer,
        item: item.trim(),
        amount: amt,
        expense_type: expenseType,
        note: note.trim() || undefined,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "儲存失敗");
      setSaving(false);
    }
  }

  return (
    <FormShell title={editing ? "編輯支出" : "新增支出"} onCancel={onCancel}>
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="space-y-5 px-6 flex-1">
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}

          <FormField label="付款人">
            <div className="flex gap-3">
              <RadioButton
                label="Boi"
                checked={payer === "Boi"}
                onChange={() => setPayer("Boi")}
              />
              <RadioButton
                label="土土"
                checked={payer === "土土"}
                onChange={() => setPayer("土土")}
              />
            </div>
          </FormField>

          <FormField label="項目">
            <input
              type="text"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="例如：午餐、飲料"
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:border-stone-400 focus:ring-0 focus:outline-none transition-colors"
            />
          </FormField>

          <FormField label="金額">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                NT$
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-stone-200 pl-12 pr-4 py-3 text-sm focus:border-stone-400 focus:ring-0 focus:outline-none transition-colors"
              />
            </div>
          </FormField>

          <FormField label="費用類型">
            <div className="space-y-2">
              <RadioRow
                label="共同費用"
                description="雙方各負擔一半"
                checked={expenseType === "shared"}
                onChange={() => setExpenseType("shared")}
              />
              <RadioRow
                label="Boi 個人費用"
                description="由 Boi 全額負擔"
                checked={expenseType === "boi_personal"}
                onChange={() => setExpenseType("boi_personal")}
              />
              <RadioRow
                label="土土個人費用"
                description="由土土全額負擔"
                checked={expenseType === "tutu_personal"}
                onChange={() => setExpenseType("tutu_personal")}
              />
            </div>
          </FormField>

          <FormField label="日期">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:border-stone-400 focus:ring-0 focus:outline-none transition-colors"
            />
          </FormField>

          <FormField label="備註（選填）">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="可選"
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:border-stone-400 focus:ring-0 focus:outline-none transition-colors"
            />
          </FormField>
        </div>

        <div className="sticky bottom-0 px-6 py-4 bg-white border-t border-stone-100">
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-stone-800 px-4 py-3.5 text-sm font-medium text-white hover:bg-stone-900 disabled:opacity-50 active:scale-[0.98] transition-all"
          >
            {saving ? (
              <>
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                儲存中...
              </>
            ) : (
              <>
                <Check size={18} />
                儲存
              </>
            )}
          </button>
        </div>
      </form>
    </FormShell>
  );
}

// --- Repayment Form ---

function RepaymentForm({
  editing,
  balance,
  onSubmit,
  onCancel,
}: {
  editing: EditingRepayment | null;
  balance: BalanceResponse | null;
  onSubmit: (payload: RepaymentPayload) => Promise<void>;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(editing?.date || todayISO());
  const [payer, setPayer] = useState<Payer>(editing?.payer || (balance?.display.debtor || "土土"));
  const [receiver, setReceiver] = useState<Payer>(
    editing?.receiver || (balance?.display.creditor || "Boi"),
  );
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [note, setNote] = useState(editing?.note || "");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const otherPerson: Payer = payer === "Boi" ? "土土" : "Boi";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) return setFormError("請輸入有效金額");
    if (payer === receiver) return setFormError("還款人與收款人不能相同");

    setSaving(true);
    setFormError(null);
    try {
      await onSubmit({
        date,
        payer,
        receiver,
        amount: amt,
        note: note.trim() || undefined,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "儲存失敗");
      setSaving(false);
    }
  }

  return (
    <FormShell title={editing ? "編輯還款" : "新增還款"} onCancel={onCancel}>
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="space-y-5 px-6 flex-1">
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}

          {balance && !balance.display.settled && !editing && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-sm text-amber-800">
                目前 {balance.display.debtor} 應付給 {balance.display.creditor}{" "}
                <span className="font-semibold">{formatCurrency(balance.display.amount)}</span>
              </p>
            </div>
          )}

          <FormField label="還款人">
            <div className="flex gap-3">
              <RadioButton
                label="Boi"
                checked={payer === "Boi"}
                onChange={() => {
                  setPayer("Boi");
                  setReceiver("土土");
                }}
              />
              <RadioButton
                label="土土"
                checked={payer === "土土"}
                onChange={() => {
                  setPayer("土土");
                  setReceiver("Boi");
                }}
              />
            </div>
          </FormField>

          <FormField label="收款人">
            <div className="rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
              {otherPerson}
            </div>
          </FormField>

          <FormField label="金額">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                NT$
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-stone-200 pl-12 pr-4 py-3 text-sm focus:border-stone-400 focus:ring-0 focus:outline-none transition-colors"
              />
            </div>
          </FormField>

          <FormField label="日期">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:border-stone-400 focus:ring-0 focus:outline-none transition-colors"
            />
          </FormField>

          <FormField label="備註（選填）">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="可選"
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:border-stone-400 focus:ring-0 focus:outline-none transition-colors"
            />
          </FormField>
        </div>

        <div className="sticky bottom-0 px-6 py-4 bg-white border-t border-stone-100">
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-stone-800 px-4 py-3.5 text-sm font-medium text-white hover:bg-stone-900 disabled:opacity-50 active:scale-[0.98] transition-all"
          >
            {saving ? (
              <>
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                儲存中...
              </>
            ) : (
              <>
                <Check size={18} />
                儲存
              </>
            )}
          </button>
        </div>
      </form>
    </FormShell>
  );
}

// --- Records View ---

type FilterType = "all" | "expense" | "repayment" | "Boi" | "土土";

function RecordsView({
  records,
  onBack,
  onEditExpense,
  onEditRepayment,
  onDelete,
}: {
  records: CombinedRecord[];
  onBack: () => void;
  onEditExpense: (r: CombinedRecord) => void;
  onEditRepayment: (r: CombinedRecord) => void;
  onDelete: (r: CombinedRecord) => void;
}) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortDesc, setSortDesc] = useState(true);

  const filtered = records.filter((r) => {
    if (filter === "all") return true;
    if (filter === "expense") return r.record_type === "expense";
    if (filter === "repayment") return r.record_type === "repayment";
    return r.payer === filter;
  });

  const sorted = [...filtered].sort((a, b) => {
    const cmp = a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    return sortDesc ? cmp : -cmp;
  });

  const filters: { label: string; value: FilterType }[] = [
    { label: "全部", value: "all" },
    { label: "支出", value: "expense" },
    { label: "還款", value: "repayment" },
    { label: "Boi 付款", value: "Boi" },
    { label: "土土付款", value: "土土" },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-stone-100 text-stone-500"
        >
          <X size={20} />
        </button>
        <h1 className="text-lg font-semibold text-stone-800">交易紀錄</h1>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 pb-3 overflow-x-auto">
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                filter === f.value
                  ? "bg-stone-800 text-white"
                  : "bg-stone-100 text-stone-500 hover:bg-stone-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort Toggle */}
      <div className="px-4 pb-2 flex items-center justify-between">
        <span className="text-xs text-stone-400">{sorted.length} 筆紀錄</span>
        <button
          onClick={() => setSortDesc(!sortDesc)}
          className="text-xs text-stone-400 hover:text-stone-600"
        >
          {sortDesc ? "新→舊" : "舊→新"} ↓
        </button>
      </div>

      {/* Records List */}
      <div className="flex-1 px-4 pb-4 space-y-2 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-200 py-12 text-center">
            <p className="text-sm text-stone-400">無符合的紀錄</p>
          </div>
        ) : (
          sorted.map((r) => (
            <DetailedRecordRow
              key={`${r.record_type}-${r.id}`}
              record={r}
              onEdit={() =>
                r.record_type === "expense" ? onEditExpense(r) : onEditRepayment(r)
              }
              onDelete={() => onDelete(r)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function DetailedRecordRow({
  record,
  onEdit,
  onDelete,
}: {
  record: CombinedRecord;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isExpense = record.record_type === "expense";

  return (
    <div className="rounded-xl border border-stone-100 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${
              isExpense ? "bg-stone-100 text-stone-500" : "bg-amber-50 text-amber-600"
            }`}
          >
            {isExpense ? (
              <span className="text-sm font-bold">
                {record.payer === "Boi" ? "B" : "土"}
              </span>
            ) : (
              <ArrowLeftRight size={18} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-stone-800 truncate">
                {isExpense ? record.item : "還款"}
              </span>
              <span className="text-sm font-semibold text-stone-700 shrink-0">
                {formatCurrency(record.amount!)}
              </span>
            </div>
            <div className="text-xs text-stone-400 mt-0.5">
              {formatDateFull(record.date)} · {record.payer}
              {isExpense
                ? ` · ${expenseTypeLabel(record.expense_type!)}`
                : ` → ${record.receiver}`}
            </div>
            {record.note && (
              <p className="text-xs text-stone-500 mt-1.5 bg-stone-50 rounded-md px-2 py-1">
                {record.note}
              </p>
            )}
            <p className="text-xs text-stone-500 mt-1.5 font-medium">
              {debtImpact(record)}
            </p>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3 pt-3 border-t border-stone-50">
        <button
          onClick={onEdit}
          className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700"
        >
          <Edit3 size={13} />
          編輯
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1 text-xs text-stone-400 hover:text-red-600"
        >
          <Trash2 size={13} />
          刪除
        </button>
      </div>
    </div>
  );
}

// --- Shared Form Components ---

function FormShell({
  title,
  onCancel,
  children,
}: {
  title: string;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button
          onClick={onCancel}
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-stone-100 text-stone-500"
        >
          <X size={20} />
        </button>
        <h1 className="text-lg font-semibold text-stone-800">{title}</h1>
      </div>
      {children}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 mb-2">{label}</label>
      {children}
    </div>
  );
}

function RadioButton({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
        checked
          ? "border-stone-800 bg-stone-50 text-stone-800"
          : "border-stone-200 text-stone-400 hover:border-stone-300"
      }`}
    >
      {label}
    </button>
  );
}

function RadioRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-full flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-all ${
        checked
          ? "border-stone-800 bg-stone-50"
          : "border-stone-200 hover:border-stone-300"
      }`}
    >
      <div>
        <p className={`text-sm font-medium ${checked ? "text-stone-800" : "text-stone-500"}`}>
          {label}
        </p>
        <p className="text-xs text-stone-400 mt-0.5">{description}</p>
      </div>
      <div
        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
          checked ? "border-stone-800 bg-stone-800" : "border-stone-300"
        }`}
      >
        {checked && <div className="h-2 w-2 rounded-full bg-white" />}
      </div>
    </button>
  );
}
