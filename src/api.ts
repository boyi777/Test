import type {
  BalanceResponse,
  ExpensePayload,
  Expense,
  RecordsResponse,
  RepaymentPayload,
  Repayment,
} from "@/types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const API_URL = `${SUPABASE_URL}/functions/v1/api`;

function getHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    apikey: SUPABASE_ANON_KEY,
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function fetchBalance(): Promise<BalanceResponse> {
  const res = await fetch(`${API_URL}/balance`, { headers: getHeaders() });
  return handleResponse<BalanceResponse>(res);
}

export async function fetchRecords(): Promise<RecordsResponse> {
  const res = await fetch(`${API_URL}/records`, { headers: getHeaders() });
  return handleResponse<RecordsResponse>(res);
}

export async function createExpense(payload: ExpensePayload): Promise<Expense> {
  const res = await fetch(`${API_URL}/expenses`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<{ expense: Expense }>(res);
  return data.expense;
}

export async function updateExpense(
  id: string,
  payload: Partial<ExpensePayload>,
): Promise<Expense> {
  const res = await fetch(`${API_URL}/expenses/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<{ expense: Expense }>(res);
  return data.expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/expenses/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  await handleResponse<{ success: boolean }>(res);
}

export async function createRepayment(payload: RepaymentPayload): Promise<Repayment> {
  const res = await fetch(`${API_URL}/repayments`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<{ repayment: Repayment }>(res);
  return data.repayment;
}

export async function updateRepayment(
  id: string,
  payload: Partial<RepaymentPayload>,
): Promise<Repayment> {
  const res = await fetch(`${API_URL}/repayments/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<{ repayment: Repayment }>(res);
  return data.repayment;
}

export async function deleteRepayment(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/repayments/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  await handleResponse<{ success: boolean }>(res);
}
