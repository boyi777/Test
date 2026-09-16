export type Payer = "Boi" | "土土";
export type ExpenseType = "shared" | "boi_personal" | "tutu_personal";

export interface Expense {
  id: string;
  date: string;
  payer: Payer;
  item: string;
  amount: number;
  expense_type: ExpenseType;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Repayment {
  id: string;
  date: string;
  payer: Payer;
  receiver: Payer;
  amount: number;
  note: string | null;
  created_at: string;
}

export type RecordType = "expense" | "repayment";

export interface CombinedRecord {
  id: string;
  date: string;
  record_type: RecordType;
  // expense fields
  payer?: Payer;
  item?: string;
  amount?: number;
  expense_type?: ExpenseType;
  note?: string | null;
  // repayment fields
  receiver?: Payer;
  created_at: string;
}

export interface BalanceDisplay {
  settled: boolean;
  debtor: Payer | null;
  creditor: Payer | null;
  amount: number;
}

export interface BalanceResponse {
  balance: number;
  display: BalanceDisplay;
}

export interface RecordsResponse {
  records: CombinedRecord[];
}

export interface ExpensePayload {
  date: string;
  payer: Payer;
  item: string;
  amount: number;
  expense_type: ExpenseType;
  note?: string;
}

export interface RepaymentPayload {
  date: string;
  payer: Payer;
  receiver: Payer;
  amount: number;
  note?: string;
}
