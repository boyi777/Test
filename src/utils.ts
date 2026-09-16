import type { CombinedRecord, ExpenseType, Payer } from "@/types";

export function formatCurrency(amount: number): string {
  return `NT$${amount.toLocaleString("zh-TW")}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${month}/${day}`;
}

export function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function expenseTypeLabel(type: ExpenseType): string {
  switch (type) {
    case "shared":
      return "共同費用";
    case "boi_personal":
      return "Boi 個人費用";
    case "tutu_personal":
      return "土土個人費用";
  }
}

/**
 * Calculate the debt impact of a single record.
 * Returns a string like "土土應付 Boi $100" or "Boi 應付土土 $50".
 */
export function debtImpact(record: CombinedRecord): string {
  if (record.record_type === "expense") {
    const amount = record.amount!;
    const payer = record.payer!;
    const type = record.expense_type!;

    if (type === "shared") {
      const half = Math.round(amount / 2);
      if (payer === "Boi") {
        return `土土應付 Boi ${formatCurrency(half)}`;
      } else {
        return `Boi 應付土土 ${formatCurrency(half)}`;
      }
    } else if (type === "boi_personal") {
      if (payer === "Boi") {
        return `無欠款變動`;
      } else {
        return `Boi 應付土土 ${formatCurrency(amount)}`;
      }
    } else {
      if (payer === "土土") {
        return `無欠款變動`;
      } else {
        return `土土應付 Boi ${formatCurrency(amount)}`;
      }
    }
  } else {
    const amount = record.amount!;
    const payer = record.payer!;
    const receiver = record.receiver!;
    return `${payer} 還款 ${receiver} ${formatCurrency(amount)}`;
  }
}

export function payerLabel(payer: Payer): string {
  return payer;
}
