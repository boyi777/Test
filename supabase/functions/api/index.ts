import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const VALID_PAYERS = ["Boi", "土土"];
const VALID_EXPENSE_TYPES = ["shared", "boi_personal", "tutu_personal"];

interface Expense {
  id: string;
  date: string;
  payer: string;
  item: string;
  amount: number;
  expense_type: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

interface Repayment {
  id: string;
  date: string;
  payer: string;
  receiver: string;
  amount: number;
  note: string | null;
  created_at: string;
}

type Record = Expense | Repayment;

function isExpense(r: Record): r is Expense {
  return (r as Expense).expense_type !== undefined;
}

/**
 * Calculate net debt from all expenses and repayments.
 * Positive result = 土土 owes Boi.
 * Negative result = Boi owes 土土.
 */
function calculateNetDebt(expenses: Expense[], repayments: Repayment[]): number {
  let balance = 0;

  for (const e of expenses) {
    const amount = Math.round(e.amount);
    if (e.expense_type === "shared") {
      // Shared: payer paid full, each owes half → other person owes payer half
      if (e.payer === "Boi") {
        balance += Math.round(amount / 2); // 土土 owes Boi
      } else {
        balance -= Math.round(amount / 2); // Boi owes 土土
      }
    } else if (e.expense_type === "boi_personal") {
      // Boi's personal expense: whoever paid, Boi should bear the full cost
      if (e.payer === "Boi") {
        // Boi paid for himself → no change
      } else {
        // 土土 paid for Boi → Boi owes 土土
        balance -= amount;
      }
    } else if (e.expense_type === "tutu_personal") {
      // 土土's personal expense: whoever paid, 土土 should bear the full cost
      if (e.payer === "土土") {
        // 土土 paid for herself → no change
      } else {
        // Boi paid for 土土 → 土土 owes Boi
        balance += amount;
      }
    }
  }

  for (const r of repayments) {
    const amount = Math.round(r.amount);
    if (r.payer === "土土" && r.receiver === "Boi") {
      balance -= amount; // 土土 repays Boi → reduces 土土's debt to Boi
    } else if (r.payer === "Boi" && r.receiver === "土土") {
      balance += amount; // Boi repays 土土 → reduces Boi's debt to 土土
    }
  }

  return balance;
}

function formatBalance(balance: number) {
  if (balance === 0) {
    return { settled: true, debtor: null, creditor: null, amount: 0 };
  }
  if (balance > 0) {
    return { settled: false, debtor: "土土", creditor: "Boi", amount: balance };
  }
  return { settled: false, debtor: "Boi", creditor: "土土", amount: Math.abs(balance) };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function error(message: string, status = 400) {
  return json({ error: message }, status);
}

function isValidDate(s: string): boolean {
  return !isNaN(Date.parse(s));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, "");

  try {
    // GET /balance — calculate current net debt
    if ((req.method === "GET") && (path === "/balance" || path === "/balance/")) {
      const { data: expenses, error: e1 } = await supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (e1) return error("Database error", 500);

      const { data: repayments, error: e2 } = await supabase
        .from("repayments")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (e2) return error("Database error", 500);

      const balance = calculateNetDebt(expenses as Expense[], repayments as Repayment[]);
      return json({ balance, display: formatBalance(balance) });
    }

    // GET /records — get all expenses and repayments, merged and sorted
    if ((req.method === "GET") && (path === "/records" || path === "/records/")) {
      const { data: expenses, error: e1 } = await supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (e1) return error("Database error", 500);

      const { data: repayments, error: e2 } = await supabase
        .from("repayments")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (e2) return error("Database error", 500);

      const allRecords = [
        ...(expenses as Expense[]).map((e) => ({ ...e, record_type: "expense" })),
        ...(repayments as Repayment[]).map((r) => ({ ...r, record_type: "repayment" })),
      ].sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return a.created_at < b.created_at ? 1 : -1;
      });

      return json({ records: allRecords });
    }

    // POST /expenses — create new expense
    if (req.method === "POST" && (path === "/expenses" || path === "/expenses/")) {
      const body = await req.json();
      const { date, payer, item, amount, expense_type, note } = body;

      if (!date || !isValidDate(date)) return error("Valid date is required");
      if (!VALID_PAYERS.includes(payer)) return error("Invalid payer");
      if (!item || typeof item !== "string" || item.trim() === "") return error("Item name is required");
      if (!Number.isInteger(amount) || amount <= 0) return error("Amount must be a positive integer");
      if (!VALID_EXPENSE_TYPES.includes(expense_type)) return error("Invalid expense type");

      const { data, error: dbErr } = await supabase
        .from("expenses")
        .insert({
          date: date,
          payer,
          item: item.trim(),
          amount,
          expense_type,
          note: note?.trim() || null,
        })
        .select("*")
        .single();
      if (dbErr) return error("Failed to create expense", 500);

      return json({ expense: data }, 201);
    }

    // PUT /expenses/:id — update expense
    if (req.method === "PUT" && path.startsWith("/expenses/")) {
      const id = path.split("/")[2];
      if (!id) return error("Expense ID is required");

      const body = await req.json();
      const { date, payer, item, amount, expense_type, note } = body;

      const update: Record<string, unknown> = {};
      if (date !== undefined) {
        if (!isValidDate(date)) return error("Valid date is required");
        update.date = date;
      }
      if (payer !== undefined) {
        if (!VALID_PAYERS.includes(payer)) return error("Invalid payer");
        update.payer = payer;
      }
      if (item !== undefined) {
        if (typeof item !== "string" || item.trim() === "") return error("Item name is required");
        update.item = item.trim();
      }
      if (amount !== undefined) {
        if (!Number.isInteger(amount) || amount <= 0) return error("Amount must be a positive integer");
        update.amount = amount;
      }
      if (expense_type !== undefined) {
        if (!VALID_EXPENSE_TYPES.includes(expense_type)) return error("Invalid expense type");
        update.expense_type = expense_type;
      }
      if (note !== undefined) {
        update.note = note?.trim() || null;
      }

      const { data, error: dbErr } = await supabase
        .from("expenses")
        .update(update)
        .eq("id", id)
        .select("*")
        .single();
      if (dbErr) return error("Failed to update expense", 500);

      return json({ expense: data });
    }

    // DELETE /expenses/:id — delete expense
    if (req.method === "DELETE" && path.startsWith("/expenses/")) {
      const id = path.split("/")[2];
      if (!id) return error("Expense ID is required");

      const { error: dbErr } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);
      if (dbErr) return error("Failed to delete expense", 500);

      return json({ success: true });
    }

    // POST /repayments — create new repayment
    if (req.method === "POST" && (path === "/repayments" || path === "/repayments/")) {
      const body = await req.json();
      const { date, payer, receiver, amount, note } = body;

      if (!date || !isValidDate(date)) return error("Valid date is required");
      if (!VALID_PAYERS.includes(payer)) return error("Invalid payer");
      if (!VALID_PAYERS.includes(receiver)) return error("Invalid receiver");
      if (payer === receiver) return error("Payer and receiver must be different");
      if (!Number.isInteger(amount) || amount <= 0) return error("Amount must be a positive integer");

      const { data, error: dbErr } = await supabase
        .from("repayments")
        .insert({
          date,
          payer,
          receiver,
          amount,
          note: note?.trim() || null,
        })
        .select("*")
        .single();
      if (dbErr) return error("Failed to create repayment", 500);

      return json({ repayment: data }, 201);
    }

    // PUT /repayments/:id — update repayment
    if (req.method === "PUT" && path.startsWith("/repayments/")) {
      const id = path.split("/")[2];
      if (!id) return error("Repayment ID is required");

      const body = await req.json();
      const { date, payer, receiver, amount, note } = body;

      const update: Record<string, unknown> = {};
      if (date !== undefined) {
        if (!isValidDate(date)) return error("Valid date is required");
        update.date = date;
      }
      if (payer !== undefined) {
        if (!VALID_PAYERS.includes(payer)) return error("Invalid payer");
        update.payer = payer;
      }
      if (receiver !== undefined) {
        if (!VALID_PAYERS.includes(receiver)) return error("Invalid receiver");
        update.receiver = receiver;
      }
      if (payer !== undefined && receiver !== undefined && payer === receiver) {
        return error("Payer and receiver must be different");
      }
      if (amount !== undefined) {
        if (!Number.isInteger(amount) || amount <= 0) return error("Amount must be a positive integer");
        update.amount = amount;
      }
      if (note !== undefined) {
        update.note = note?.trim() || null;
      }

      const { data, error: dbErr } = await supabase
        .from("repayments")
        .update(update)
        .eq("id", id)
        .select("*")
        .single();
      if (dbErr) return error("Failed to update repayment", 500);

      return json({ repayment: data });
    }

    // DELETE /repayments/:id — delete repayment
    if (req.method === "DELETE" && path.startsWith("/repayments/")) {
      const id = path.split("/")[2];
      if (!id) return error("Repayment ID is required");

      const { error: dbErr } = await supabase
        .from("repayments")
        .delete()
        .eq("id", id);
      if (dbErr) return error("Failed to delete repayment", 500);

      return json({ success: true });
    }

    return error("Not found", 404);
  } catch (err) {
    return error(err.message || "Internal server error", 500);
  }
});
