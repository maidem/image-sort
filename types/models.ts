export interface Trainer {
  id: number;
  name: string;
  pin?: string;
  color: string;
  created_at?: string;
  checked_in_at?: string | null;
}

export interface Group {
  id: number;
  name: string;
  description: string | null;
  trainers?: Trainer[];
}

export interface Location {
  id: number;
  name: string;
  description: string | null;
  created_at?: string;
}

export interface Label {
  id: number;
  name: string;
  description: string | null;
  created_at?: string;
}

export interface Plan {
  id: number;
  year: number;
  month: number;
  title: string | null;
  created_at: string;
}

export interface Slot {
  id: number;
  plan_id: number;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  group_id: number | null;
  location_id: number | null;
  trainer_id: number | null;
  note: string | null;
  checked_in_at: string | null;
  // joined
  group_name?: string | null;
  location_name?: string | null;
  trainer_name?: string | null;
  trainer_color?: string | null;
  trainers?: Trainer[];
  labels?: Label[];
}
