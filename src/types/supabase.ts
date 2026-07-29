export type Database = {
  public: {
    Tables: {
      opportunities: {
        Row: {
          id: number;
          product_name: string;
          store: string;
          price: string;
          savings: string;
          badge: string;
          description: string;
          created_at?: string;
        };
        Insert: {
          id?: number;
          product_name: string;
          store: string;
          price: string;
          savings: string;
          badge: string;
          description: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          product_name?: string;
          store?: string;
          price?: string;
          savings?: string;
          badge?: string;
          description?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
