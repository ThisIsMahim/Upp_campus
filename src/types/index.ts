export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          email: string
          avatar_url: string | null
          bio: string | null
          campus_id: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          username: string
          email: string
          avatar_url?: string | null
          bio?: string | null
          campus_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          username?: string
          email?: string
          avatar_url?: string | null
          bio?: string | null
          campus_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      campuses: {
        Row: {
          id: string
          name: string
          short_name: string | null
          description: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          short_name?: string | null
          description?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          short_name?: string | null
          description?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          campus_id: string
          content: string
          image_url: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          campus_id: string
          content: string
          image_url?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          campus_id?: string
          content?: string
          image_url?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
    }
  }
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"]
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"]

export type Campus = Database["public"]["Tables"]["campuses"]["Row"]
export type CampusInsert = Database["public"]["Tables"]["campuses"]["Insert"]
export type CampusUpdate = Database["public"]["Tables"]["campuses"]["Update"]

export type Post = Database["public"]["Tables"]["posts"]["Row"]
export type PostInsert = Database["public"]["Tables"]["posts"]["Insert"]
export type PostUpdate = Database["public"]["Tables"]["posts"]["Update"]

