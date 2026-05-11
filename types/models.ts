export interface Category {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ImagePair {
  id: number;
  category_id: number;
  category_name?: string;
  original_filename: string | null;
  painted_filename: string | null;
  description: string | null;
  painted_at: string | null;
  created_at: string;
}
