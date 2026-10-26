import type { Cents } from "./money";
import type { DownpaymentScheme, FirstTimerStatus } from "./bto";
import type { FlatTypeId } from "./bto-data";

/**
 * Row types. These mirror the Postgres tables in supabase/migrations 1:1
 * (snake_case columns), so the same engine runs on localStorage and on Supabase.
 */

export interface Profile {
  id: string;
  couple_id: string | null;
  display_name: string;
  /** Average gross monthly income in dollars — optional, only used for "split by income". */
  monthly_income: number | null;
  age: number | null;
  first_timer: boolean | null;
  /** Current CPF Ordinary Account balance in cents, for projecting the BTO downpayment. */
  cpf_oa: number | null;
  created_at: string;
}

export interface Couple {
  id: string;
  name: string;
  pet_name: string;
  /** Optimistic-concurrency version; every committed command bumps it. */
  version: number;
  created_at: string;
}

export type PotKind = "bto" | "wedding" | "renovation" | "trip" | "custom";
export type PotStatus = "draft" | "pending_split" | "active" | "completed";

export interface BtoMeta {
  project_id: string | null;
  project_name: string;
  town: string;
  flat_type: FlatTypeId;
  price: Cents;
  scheme: DownpaymentScheme;
  ehg: Cents;
  cpf_oa: Cents;
  waiting_months: number;
  loan_monthly: Cents;
  household?: { firstTimers: FirstTimerStatus; monthlyIncome: number; ageA: number; ageB: number };
}

/** Guests and ang bao for a wedding pot (amounts in cents). */
export interface WeddingMeta {
  tables: number;
  price_per_table: Cents;
  guests_per_table: number;
  /** Average ang bao per guest, used when no guest groups are set. */
  avg_angbao: Cents;
  /** Optional weighted groups, e.g. family tables at $150 and friends at $100. They replace the single average. */
  categories?: { name: string; guests: number; avg: Cents }[];
}

export interface Pot {
  id: string;
  couple_id: string;
  kind: PotKind;
  name: string;
  subtitle: string;
  status: PotStatus;
  /** Stages are filled in order (BTO) or treated as a budget list (trip/wedding). */
  sequential: boolean;
  target_date: string;
  created_by: string;
  created_at: string;
  bto: BtoMeta | null;
  /** Wedding pots only: banquet tables and expected ang bao. */
  wedding: WeddingMeta | null;
}

export interface Stage {
  id: string;
  pot_id: string;
  idx: number;
  name: string;
  description: string;
  target: Cents;
  due_date: string | null;
}

export type SplitMode = "equal" | "income" | "custom";
export type ProposalStatus = "pending" | "accepted" | "declined" | "superseded";

export interface SplitProposal {
  id: string;
  pot_id: string;
  couple_id: string;
  proposed_by: string;
  mode: SplitMode;
  /** user_id → monthly cents */
  shares: Record<string, Cents>;
  monthly_total: Cents;
  status: ProposalStatus;
  response_note: string | null;
  responded_at: string | null;
  created_at: string;
}

export type TxKind = "contribution" | "withdrawal" | "transfer_in" | "transfer_out";

export interface Transaction {
  id: string;
  couple_id: string;
  pot_id: string;
  kind: TxKind;
  /** Always positive; direction comes from `kind`. */
  amount: Cents;
  user_id: string;
  note: string;
  occurred_on: string;
  created_at: string;
  edited_at: string | null;
  /** Soft delete so "Undo" can restore the exact row. */
  voided_at: string | null;
  request_id: string | null;
  /** Set when one partner paid this to cover the other's share: the id of the partner it counts for. */
  covering?: string | null;
  /** Set when a bank statement confirmed this contribution. Only the flag is stored, never the statement. */
  verified_at?: string | null;
}

export type RequestKind = "withdrawal" | "transfer";
export type RequestStatus = "pending" | "approved" | "declined" | "cancelled" | "expired";

export interface ApprovalRequest {
  id: string;
  couple_id: string;
  kind: RequestKind;
  pot_id: string;
  to_pot_id: string | null;
  amount: Cents;
  reason: string;
  requested_by: string;
  status: RequestStatus;
  response_note: string | null;
  expires_at: string;
  responded_at: string | null;
  created_at: string;
}

export type CareAction = "food" | "play" | "rest" | "outfit";

export interface PetCare {
  id: string;
  couple_id: string;
  user_id: string;
  action: CareAction;
  coins: number;
  created_at: string;
}

export interface Notification {
  id: string;
  couple_id: string;
  user_id: string;
  text: string;
  href: string;
  read: boolean;
  created_at: string;
}

/** Everything one couple can see. Loaded in one go and passed to the engine. */
export type ApplicationResult = "pending" | "successful" | "unsuccessful" | "declined";

/** One BTO application a couple made for a pot (the history behind "I didn't get the flat"). */
export interface BtoApplication {
  id: string;
  couple_id: string;
  pot_id: string;
  /** Exercise label as HDB names it, e.g. "Jun 2026". */
  exercise: string;
  project_id: string | null;
  flat_type: FlatTypeId;
  applied_on: string;
  result: ApplicationResult;
  queue_number: number | null;
  created_at: string;
}

export type CoverStatus = "pending" | "accepted" | "declined" | "cancelled";

/** One partner covering the other's missed monthly share, to be paid back over the next few months. */
export interface Cover {
  id: string;
  couple_id: string;
  pot_id: string;
  /** The partner who pays now. */
  payer_id: string;
  /** The partner whose share is covered, and who pays it back. */
  for_user_id: string;
  /** First day of the month whose share was missed. */
  month: string;
  amount: Cents;
  /** Number of months the payback is spread over. */
  months: number;
  status: CoverStatus;
  response_note: string | null;
  responded_at: string | null;
  created_at: string;
}

export type MemberRole = "partner" | "contributor";

/**
 * Who can see and use one pot. The couple are always its owners; a contributor (a parent, say) is
 * invited to a single pot and can only view its progress and log gifts to it.
 */
export interface PotMember {
  id: string;
  couple_id: string;
  pot_id: string;
  user_id: string;
  role: MemberRole;
  /** How the contributor is shown on the ledger, e.g. "Mum". */
  display_name: string;
  created_at: string;
}

export interface CoupleState {
  couple: Couple;
  profiles: Profile[];
  pots: Pot[];
  stages: Stage[];
  proposals: SplitProposal[];
  transactions: Transaction[];
  requests: ApprovalRequest[];
  petCare: PetCare[];
  notifications: Notification[];
  btoApplications: BtoApplication[];
  covers: Cover[];
  potMembers: PotMember[];
}

export type TableName = "couples" | "profiles" | "pots" | "stages" | "proposals" | "transactions" | "requests" | "pet_care" | "notifications" | "bto_applications" | "covers" | "pot_members";

export const STATE_KEY: Record<TableName, keyof CoupleState> = {
  couples: "couple",
  profiles: "profiles",
  pots: "pots",
  stages: "stages",
  proposals: "proposals",
  transactions: "transactions",
  requests: "requests",
  pet_care: "petCare",
  notifications: "notifications",
  bto_applications: "btoApplications",
  covers: "covers",
  pot_members: "potMembers",
};

/** A change the engine wants persisted. Stores apply these atomically. */
export type Mutation =
  | { table: TableName; op: "insert"; row: { id: string } }
  | { table: TableName; op: "update"; id: string; patch: Record<string, unknown> }
  | { table: TableName; op: "delete"; id: string };
