export type Role = "admin" | "ceo" | "hr";
export type Status = "pending" | "approved" | "rejected";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

export type Recommendation = {
  id: string;
  // Details
  staff_name: string;
  designation: string | null;
  components: string | null;
  current_pay: number | null;
  expectation: number | null;
  years_experience: number | null;
  // Recommendation
  monthly_consultancy_fee: number | null;
  annual_consultancy_pay: number | null; // generated
  year_end_fee: number | null;
  performance_fee: number | null;
  upkeep_fee: number | null;
  annual_gross_fee: number | null; // generated
  // Workflow
  status: Status;
  review_note: string | null;
  created_by: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
};
