export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      _backup_jimscanner_gsc_pages_20260429: {
        Row: {
          clicks: number | null
          collected_at: string | null
          ctr: number | null
          date: string | null
          impressions: number | null
          page: string | null
          position: number | null
        }
        Insert: {
          clicks?: number | null
          collected_at?: string | null
          ctr?: number | null
          date?: string | null
          impressions?: number | null
          page?: string | null
          position?: number | null
        }
        Update: {
          clicks?: number | null
          collected_at?: string | null
          ctr?: number | null
          date?: string | null
          impressions?: number | null
          page?: string | null
          position?: number | null
        }
        Relationships: []
      }
      agency_settings: {
        Row: {
          address: string | null
          companyName: string | null
          contactNumber: string | null
          created_at: string
          defaultWarehouse: string | null
          email: string | null
          id: number
        }
        Insert: {
          address?: string | null
          companyName?: string | null
          contactNumber?: string | null
          created_at?: string
          defaultWarehouse?: string | null
          email?: string | null
          id?: number
        }
        Update: {
          address?: string | null
          companyName?: string | null
          contactNumber?: string | null
          created_at?: string
          defaultWarehouse?: string | null
          email?: string | null
          id?: number
        }
        Relationships: []
      }
      b2b_account_documents: {
        Row: {
          account_id: string
          ai_review_notes: Json | null
          ai_review_status: string
          ai_reviewed_at: string | null
          document_type: string
          file_name: string | null
          human_review_notes: string | null
          human_review_status: string
          human_reviewed_at: string | null
          human_reviewer_email: string | null
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          account_id: string
          ai_review_notes?: Json | null
          ai_review_status?: string
          ai_reviewed_at?: string | null
          document_type: string
          file_name?: string | null
          human_review_notes?: string | null
          human_review_status?: string
          human_reviewed_at?: string | null
          human_reviewer_email?: string | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          account_id?: string
          ai_review_notes?: Json | null
          ai_review_status?: string
          ai_reviewed_at?: string | null
          document_type?: string
          file_name?: string | null
          human_review_notes?: string | null
          human_review_status?: string
          human_reviewed_at?: string | null
          human_reviewer_email?: string | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_account_documents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_account_terms_consent: {
        Row: {
          account_id: string
          consented_at: string
          id: string
          ip_address: unknown
          terms_version_id: string
          user_agent: string | null
        }
        Insert: {
          account_id: string
          consented_at?: string
          id?: string
          ip_address?: unknown
          terms_version_id: string
          user_agent?: string | null
        }
        Update: {
          account_id?: string
          consented_at?: string
          id?: string
          ip_address?: unknown
          terms_version_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "b2b_account_terms_consent_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_account_terms_consent_terms_version_id_fkey"
            columns: ["terms_version_id"]
            isOneToOne: false
            referencedRelation: "b2b_terms_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_accounts: {
        Row: {
          address: string | null
          business_category_main: string | null
          business_category_sub: string | null
          business_name: string | null
          business_no: string | null
          business_no_verified_at: string | null
          business_type: string | null
          ceo_name: string | null
          communication_sales_no: string | null
          created_at: string
          deleted_at: string | null
          detail_address: string | null
          document_reviewed_at: string | null
          email: string
          id: string
          last_login_at: string | null
          marketing_opt_in: boolean
          phone: string | null
          pii_storage_mode: string
          postal_code: string | null
          representative_verified_at: string | null
          suspended_at: string | null
          suspended_reason: string | null
          updated_at: string
          user_id: string
          verification_level: number
          verification_rejected_reason: string | null
          verification_status: string
        }
        Insert: {
          address?: string | null
          business_category_main?: string | null
          business_category_sub?: string | null
          business_name?: string | null
          business_no?: string | null
          business_no_verified_at?: string | null
          business_type?: string | null
          ceo_name?: string | null
          communication_sales_no?: string | null
          created_at?: string
          deleted_at?: string | null
          detail_address?: string | null
          document_reviewed_at?: string | null
          email: string
          id?: string
          last_login_at?: string | null
          marketing_opt_in?: boolean
          phone?: string | null
          pii_storage_mode?: string
          postal_code?: string | null
          representative_verified_at?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
          user_id: string
          verification_level?: number
          verification_rejected_reason?: string | null
          verification_status?: string
        }
        Update: {
          address?: string | null
          business_category_main?: string | null
          business_category_sub?: string | null
          business_name?: string | null
          business_no?: string | null
          business_no_verified_at?: string | null
          business_type?: string | null
          ceo_name?: string | null
          communication_sales_no?: string | null
          created_at?: string
          deleted_at?: string | null
          detail_address?: string | null
          document_reviewed_at?: string | null
          email?: string
          id?: string
          last_login_at?: string | null
          marketing_opt_in?: boolean
          phone?: string | null
          pii_storage_mode?: string
          postal_code?: string | null
          representative_verified_at?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
          user_id?: string
          verification_level?: number
          verification_rejected_reason?: string | null
          verification_status?: string
        }
        Relationships: []
      }
      b2b_announcements: {
        Row: {
          body_markdown: string
          created_at: string
          created_by: string | null
          email_sent_at: string | null
          ends_at: string
          id: string
          send_email: boolean
          starts_at: string
          target_plan_codes: string[]
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          body_markdown: string
          created_at?: string
          created_by?: string | null
          email_sent_at?: string | null
          ends_at: string
          id?: string
          send_email?: boolean
          starts_at: string
          target_plan_codes?: string[]
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          body_markdown?: string
          created_at?: string
          created_by?: string | null
          email_sent_at?: string | null
          ends_at?: string
          id?: string
          send_email?: boolean
          starts_at?: string
          target_plan_codes?: string[]
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      b2b_audit_log: {
        Row: {
          account_id: string | null
          action: string
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "b2b_audit_log_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_auto_runs: {
        Row: {
          agent_type: string | null
          change_summary: string | null
          commit_hash: string | null
          commit_message: string | null
          created_at: string
          decision_issue_number: number | null
          decision_needed: boolean
          decision_resolution: string | null
          decision_resolved_at: string | null
          duration_seconds: number | null
          error_message: string | null
          files_changed: Json | null
          id: string
          mode: string
          next_direction: string | null
          output_summary: string | null
          selection_reason: string | null
          task_picked: string | null
          task_status: string | null
          tick_at: string
        }
        Insert: {
          agent_type?: string | null
          change_summary?: string | null
          commit_hash?: string | null
          commit_message?: string | null
          created_at?: string
          decision_issue_number?: number | null
          decision_needed?: boolean
          decision_resolution?: string | null
          decision_resolved_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          files_changed?: Json | null
          id?: string
          mode: string
          next_direction?: string | null
          output_summary?: string | null
          selection_reason?: string | null
          task_picked?: string | null
          task_status?: string | null
          tick_at?: string
        }
        Update: {
          agent_type?: string | null
          change_summary?: string | null
          commit_hash?: string | null
          commit_message?: string | null
          created_at?: string
          decision_issue_number?: number | null
          decision_needed?: boolean
          decision_resolution?: string | null
          decision_resolved_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          files_changed?: Json | null
          id?: string
          mode?: string
          next_direction?: string | null
          output_summary?: string | null
          selection_reason?: string | null
          task_picked?: string | null
          task_status?: string | null
          tick_at?: string
        }
        Relationships: []
      }
      b2b_clients: {
        Row: {
          account_id: string
          address: string | null
          created_at: string
          deleted_at: string | null
          detail_address: string | null
          display_name: string
          email: string | null
          encrypted_pii: Json | null
          external_id: string | null
          full_name: string | null
          id: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          tags: string[]
          total_orders: number
          total_revenue_krw: number
          updated_at: string
          vip_grade: string
        }
        Insert: {
          account_id: string
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          detail_address?: string | null
          display_name: string
          email?: string | null
          encrypted_pii?: Json | null
          external_id?: string | null
          full_name?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          tags?: string[]
          total_orders?: number
          total_revenue_krw?: number
          updated_at?: string
          vip_grade?: string
        }
        Update: {
          account_id?: string
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          detail_address?: string | null
          display_name?: string
          email?: string | null
          encrypted_pii?: Json | null
          external_id?: string | null
          full_name?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          tags?: string[]
          total_orders?: number
          total_revenue_krw?: number
          updated_at?: string
          vip_grade?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_clients_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_domestic_products: {
        Row: {
          account_id: string
          category: string | null
          created_at: string
          display_name: string
          id: string
          image_url: string | null
          is_active: boolean
          market_option: string | null
          market_product_id: string | null
          marketplace: string | null
          notes: string | null
          sale_price_krw: number | null
          seller_sku: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          category?: string | null
          created_at?: string
          display_name: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          market_option?: string | null
          market_product_id?: string | null
          marketplace?: string | null
          notes?: string | null
          sale_price_krw?: number | null
          seller_sku?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          category?: string | null
          created_at?: string
          display_name?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          market_option?: string | null
          market_product_id?: string | null
          marketplace?: string | null
          notes?: string | null
          sale_price_krw?: number | null
          seller_sku?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_domestic_products_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_form_template_columns: {
        Row: {
          column_index: number
          column_label: string
          column_letter: string | null
          composite_template: string | null
          constant_value: string | null
          id: string
          notes: string | null
          required: boolean
          source_kind: string
          source_path: string | null
          template_id: string
          transform: string | null
          user_input_label: string | null
          user_input_options: string[] | null
        }
        Insert: {
          column_index: number
          column_label: string
          column_letter?: string | null
          composite_template?: string | null
          constant_value?: string | null
          id?: string
          notes?: string | null
          required?: boolean
          source_kind: string
          source_path?: string | null
          template_id: string
          transform?: string | null
          user_input_label?: string | null
          user_input_options?: string[] | null
        }
        Update: {
          column_index?: number
          column_label?: string
          column_letter?: string | null
          composite_template?: string | null
          constant_value?: string | null
          id?: string
          notes?: string | null
          required?: boolean
          source_kind?: string
          source_path?: string | null
          template_id?: string
          transform?: string | null
          user_input_label?: string | null
          user_input_options?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "b2b_form_template_columns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "b2b_form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_form_templates: {
        Row: {
          combine_rule: string | null
          created_at: string
          data_sheet_name: string
          data_start_row: number
          forwarder_id: string | null
          header_row_count: number
          id: string
          is_active: boolean
          name: string
          notes: string | null
          owner_account_id: string | null
          source_file_path: string
          source_file_size: number | null
          updated_at: string
        }
        Insert: {
          combine_rule?: string | null
          created_at?: string
          data_sheet_name: string
          data_start_row?: number
          forwarder_id?: string | null
          header_row_count?: number
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          owner_account_id?: string | null
          source_file_path: string
          source_file_size?: number | null
          updated_at?: string
        }
        Update: {
          combine_rule?: string | null
          created_at?: string
          data_sheet_name?: string
          data_start_row?: number
          forwarder_id?: string | null
          header_row_count?: number
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          owner_account_id?: string | null
          source_file_path?: string
          source_file_size?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_form_templates_forwarder_id_fkey"
            columns: ["forwarder_id"]
            isOneToOne: false
            referencedRelation: "forwarders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_form_templates_owner_account_id_fkey"
            columns: ["owner_account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_forwarder_addresses: {
        Row: {
          account_id: string | null
          address1: string
          address2: string | null
          city: string
          country: string
          created_at: string
          forwarder_id: string
          id: string
          is_default: boolean
          is_official: boolean
          label: string
          member_no: string | null
          notes: string | null
          phone: string | null
          recipient_name: string
          state: string
          updated_at: string
          zip: string
        }
        Insert: {
          account_id?: string | null
          address1: string
          address2?: string | null
          city: string
          country?: string
          created_at?: string
          forwarder_id: string
          id?: string
          is_default?: boolean
          is_official?: boolean
          label: string
          member_no?: string | null
          notes?: string | null
          phone?: string | null
          recipient_name: string
          state: string
          updated_at?: string
          zip: string
        }
        Update: {
          account_id?: string | null
          address1?: string
          address2?: string | null
          city?: string
          country?: string
          created_at?: string
          forwarder_id?: string
          id?: string
          is_default?: boolean
          is_official?: boolean
          label?: string
          member_no?: string | null
          notes?: string | null
          phone?: string | null
          recipient_name?: string
          state?: string
          updated_at?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_forwarder_addresses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_forwarder_addresses_forwarder_id_fkey"
            columns: ["forwarder_id"]
            isOneToOne: false
            referencedRelation: "forwarders"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_forwarder_form_snapshots: {
        Row: {
          account_id: string
          created_at: string
          fields: Json | null
          forwarder_id: string | null
          forwarder_slug: string | null
          html_excerpt: string | null
          id: string
          page_title: string | null
          url: string
          user_note: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          fields?: Json | null
          forwarder_id?: string | null
          forwarder_slug?: string | null
          html_excerpt?: string | null
          id?: string
          page_title?: string | null
          url: string
          user_note?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          fields?: Json | null
          forwarder_id?: string | null
          forwarder_slug?: string | null
          html_excerpt?: string | null
          id?: string
          page_title?: string | null
          url?: string
          user_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "b2b_forwarder_form_snapshots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_forwarder_form_snapshots_forwarder_id_fkey"
            columns: ["forwarder_id"]
            isOneToOne: false
            referencedRelation: "forwarders"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_forwarder_mappings: {
        Row: {
          account_id: string
          column_map: Json
          created_at: string
          forwarder_id: string
          id: string
          is_default: boolean
          mapping_name: string
          updated_at: string
        }
        Insert: {
          account_id: string
          column_map: Json
          created_at?: string
          forwarder_id: string
          id?: string
          is_default?: boolean
          mapping_name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          column_map?: Json
          created_at?: string
          forwarder_id?: string
          id?: string
          is_default?: boolean
          mapping_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_forwarder_mappings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_forwarder_mappings_forwarder_id_fkey"
            columns: ["forwarder_id"]
            isOneToOne: false
            referencedRelation: "forwarders"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_forwarder_transit_defaults: {
        Row: {
          avg_transit_days: number
          created_at: string
          id: string
          is_active: boolean
          max_transit_days: number | null
          method: string
          min_transit_days: number | null
          notes: string | null
          origin_country: string
          source: string
          updated_at: string
        }
        Insert: {
          avg_transit_days: number
          created_at?: string
          id?: string
          is_active?: boolean
          max_transit_days?: number | null
          method?: string
          min_transit_days?: number | null
          notes?: string | null
          origin_country: string
          source?: string
          updated_at?: string
        }
        Update: {
          avg_transit_days?: number
          created_at?: string
          id?: string
          is_active?: boolean
          max_transit_days?: number | null
          method?: string
          min_transit_days?: number | null
          notes?: string | null
          origin_country?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      b2b_notifications: {
        Row: {
          account_id: string
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          account_id: string
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          account_id?: string
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_notifications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_order_items: {
        Row: {
          brand: string | null
          carrier: string | null
          category: string | null
          created_at: string
          currency: string | null
          display_order: number
          forwarder_id: string | null
          id: string
          image_url: string | null
          market_option: string | null
          market_product_id: string | null
          notes: string | null
          order_id: string
          payment_card_id: string | null
          product_id: string | null
          product_image_url: string | null
          product_name: string
          product_url: string | null
          quantity: number
          sale_price_krw: number | null
          supplier_order_number: string | null
          supplier_purchased_at: string | null
          supplier_site: string | null
          total_price_foreign: number | null
          total_price_krw: number | null
          tracking_number: string | null
          tracking_number_overseas: string | null
          unit_price_foreign: number | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          brand?: string | null
          carrier?: string | null
          category?: string | null
          created_at?: string
          currency?: string | null
          display_order?: number
          forwarder_id?: string | null
          id?: string
          image_url?: string | null
          market_option?: string | null
          market_product_id?: string | null
          notes?: string | null
          order_id: string
          payment_card_id?: string | null
          product_id?: string | null
          product_image_url?: string | null
          product_name: string
          product_url?: string | null
          quantity?: number
          sale_price_krw?: number | null
          supplier_order_number?: string | null
          supplier_purchased_at?: string | null
          supplier_site?: string | null
          total_price_foreign?: number | null
          total_price_krw?: number | null
          tracking_number?: string | null
          tracking_number_overseas?: string | null
          unit_price_foreign?: number | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          brand?: string | null
          carrier?: string | null
          category?: string | null
          created_at?: string
          currency?: string | null
          display_order?: number
          forwarder_id?: string | null
          id?: string
          image_url?: string | null
          market_option?: string | null
          market_product_id?: string | null
          notes?: string | null
          order_id?: string
          payment_card_id?: string | null
          product_id?: string | null
          product_image_url?: string | null
          product_name?: string
          product_url?: string | null
          quantity?: number
          sale_price_krw?: number | null
          supplier_order_number?: string | null
          supplier_purchased_at?: string | null
          supplier_site?: string | null
          total_price_foreign?: number | null
          total_price_krw?: number | null
          tracking_number?: string | null
          tracking_number_overseas?: string | null
          unit_price_foreign?: number | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "b2b_order_items_forwarder_id_fkey"
            columns: ["forwarder_id"]
            isOneToOne: false
            referencedRelation: "forwarders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "b2b_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_order_items_payment_card_id_fkey"
            columns: ["payment_card_id"]
            isOneToOne: false
            referencedRelation: "b2b_payment_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_orders: {
        Row: {
          account_id: string
          actual_cost_krw: number | null
          buyer_address: string | null
          buyer_customs_code: string | null
          buyer_detail_address: string | null
          buyer_name: string | null
          buyer_phone: string | null
          buyer_postal_code: string | null
          client_id: string | null
          created_at: string
          deleted_at: string | null
          estimated_cost_krw: number | null
          exchange_rate_applied: Json | null
          forwarder_country: string | null
          forwarder_id: string | null
          forwarder_request_no: string | null
          forwarder_submitted_at: string | null
          forwarder_warehouse: string | null
          id: string
          internal_notes: string | null
          margin_krw: number | null
          market_commission_krw: number | null
          market_order_number: string | null
          marketplace: string | null
          order_date: string
          order_number: string
          request_notes: string | null
          shipping_fee_krw: number | null
          source: string
          source_meta: Json | null
          status: string
          status_history: Json
          updated_at: string
        }
        Insert: {
          account_id: string
          actual_cost_krw?: number | null
          buyer_address?: string | null
          buyer_customs_code?: string | null
          buyer_detail_address?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          buyer_postal_code?: string | null
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          estimated_cost_krw?: number | null
          exchange_rate_applied?: Json | null
          forwarder_country?: string | null
          forwarder_id?: string | null
          forwarder_request_no?: string | null
          forwarder_submitted_at?: string | null
          forwarder_warehouse?: string | null
          id?: string
          internal_notes?: string | null
          margin_krw?: number | null
          market_commission_krw?: number | null
          market_order_number?: string | null
          marketplace?: string | null
          order_date?: string
          order_number: string
          request_notes?: string | null
          shipping_fee_krw?: number | null
          source?: string
          source_meta?: Json | null
          status?: string
          status_history?: Json
          updated_at?: string
        }
        Update: {
          account_id?: string
          actual_cost_krw?: number | null
          buyer_address?: string | null
          buyer_customs_code?: string | null
          buyer_detail_address?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          buyer_postal_code?: string | null
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          estimated_cost_krw?: number | null
          exchange_rate_applied?: Json | null
          forwarder_country?: string | null
          forwarder_id?: string | null
          forwarder_request_no?: string | null
          forwarder_submitted_at?: string | null
          forwarder_warehouse?: string | null
          id?: string
          internal_notes?: string | null
          margin_krw?: number | null
          market_commission_krw?: number | null
          market_order_number?: string | null
          marketplace?: string | null
          order_date?: string
          order_number?: string
          request_notes?: string | null
          shipping_fee_krw?: number | null
          source?: string
          source_meta?: Json | null
          status?: string
          status_history?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_orders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "b2b_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_orders_forwarder_id_fkey"
            columns: ["forwarder_id"]
            isOneToOne: false
            referencedRelation: "forwarders"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_payment_cards: {
        Row: {
          account_id: string
          alias: string
          billing_day: number | null
          brand: string | null
          color: string | null
          created_at: string
          credit_limit_krw: number | null
          deleted_at: string | null
          id: string
          is_active: boolean
          last4: string | null
          notes: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          account_id: string
          alias: string
          billing_day?: number | null
          brand?: string | null
          color?: string | null
          created_at?: string
          credit_limit_krw?: number | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          last4?: string | null
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          alias?: string
          billing_day?: number | null
          brand?: string | null
          color?: string | null
          created_at?: string
          credit_limit_krw?: number | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          last4?: string | null
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_payment_cards_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_product_mappings: {
        Row: {
          account_id: string
          created_at: string
          domestic_product_id: string
          foreign_product_id: string
          id: string
          notes: string | null
          qty_ratio: number
        }
        Insert: {
          account_id: string
          created_at?: string
          domestic_product_id: string
          foreign_product_id: string
          id?: string
          notes?: string | null
          qty_ratio?: number
        }
        Update: {
          account_id?: string
          created_at?: string
          domestic_product_id?: string
          foreign_product_id?: string
          id?: string
          notes?: string | null
          qty_ratio?: number
        }
        Relationships: [
          {
            foreignKeyName: "b2b_product_mappings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_product_mappings_domestic_product_id_fkey"
            columns: ["domestic_product_id"]
            isOneToOne: false
            referencedRelation: "b2b_domestic_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_product_mappings_foreign_product_id_fkey"
            columns: ["foreign_product_id"]
            isOneToOne: false
            referencedRelation: "b2b_products"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_product_market_links: {
        Row: {
          created_at: string
          id: string
          market_option: string | null
          market_product_id: string
          marketplace: string
          notes: string | null
          product_id: string
          sale_price_krw: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          market_option?: string | null
          market_product_id: string
          marketplace: string
          notes?: string | null
          product_id: string
          sale_price_krw?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          market_option?: string | null
          market_product_id?: string
          marketplace?: string
          notes?: string | null
          product_id?: string
          sale_price_krw?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "b2b_product_market_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "b2b_products"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_product_supplier_links: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          notes: string | null
          product_id: string
          supplier_currency: string | null
          supplier_product_url: string | null
          supplier_site: string
          supplier_unit_price: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          product_id: string
          supplier_currency?: string | null
          supplier_product_url?: string | null
          supplier_site: string
          supplier_unit_price?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          product_id?: string
          supplier_currency?: string | null
          supplier_product_url?: string | null
          supplier_site?: string
          supplier_unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "b2b_product_supplier_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "b2b_products"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_products: {
        Row: {
          account_id: string
          category: string | null
          created_at: string
          default_currency: string | null
          default_forwarder_country: string | null
          default_forwarder_id: string | null
          default_supplier_site: string | null
          default_unit_price: number | null
          default_weight_kg: number | null
          display_name: string
          english_name: string | null
          id: string
          image_url: string | null
          is_active: boolean
          notes: string | null
          seller_sku: string
          updated_at: string
        }
        Insert: {
          account_id: string
          category?: string | null
          created_at?: string
          default_currency?: string | null
          default_forwarder_country?: string | null
          default_forwarder_id?: string | null
          default_supplier_site?: string | null
          default_unit_price?: number | null
          default_weight_kg?: number | null
          display_name: string
          english_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          notes?: string | null
          seller_sku: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          category?: string | null
          created_at?: string
          default_currency?: string | null
          default_forwarder_country?: string | null
          default_forwarder_id?: string | null
          default_supplier_site?: string | null
          default_unit_price?: number | null
          default_weight_kg?: number | null
          display_name?: string
          english_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          notes?: string | null
          seller_sku?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_products_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_products_default_forwarder_id_fkey"
            columns: ["default_forwarder_id"]
            isOneToOne: false
            referencedRelation: "forwarders"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_refunds: {
        Row: {
          account_id: string
          approved_at: string | null
          buyer_message: string | null
          created_at: string
          deleted_at: string | null
          id: string
          internal_notes: string | null
          order_id: string
          order_item_id: string | null
          reason: string
          reason_category: string | null
          refund_amount_krw: number
          refund_method: string | null
          requested_at: string
          settled_at: string | null
          status: string
          status_history: Json
          updated_at: string
        }
        Insert: {
          account_id: string
          approved_at?: string | null
          buyer_message?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          internal_notes?: string | null
          order_id: string
          order_item_id?: string | null
          reason: string
          reason_category?: string | null
          refund_amount_krw?: number
          refund_method?: string | null
          requested_at?: string
          settled_at?: string | null
          status?: string
          status_history?: Json
          updated_at?: string
        }
        Update: {
          account_id?: string
          approved_at?: string | null
          buyer_message?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          internal_notes?: string | null
          order_id?: string
          order_item_id?: string | null
          reason?: string
          reason_category?: string | null
          refund_amount_krw?: number
          refund_method?: string | null
          requested_at?: string
          settled_at?: string | null
          status?: string
          status_history?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_refunds_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "b2b_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_refunds_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "b2b_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_seller_health_snapshot: {
        Row: {
          account_id: string
          computed_at: string
          has_extension: boolean
          health_score: number | null
          issue_flags: Json
          last_login_at: string | null
          last_order_at: string | null
          margin_30d_krw: number
          margin_failed_count: number
          matched_pct: number | null
          orders_30d: number
          orders_pending: number
          orders_stuck: number
          orders_total: number
          plan_code: string | null
          plan_status: string | null
          products_count: number
          purchase_30d_krw: number
          receipts_7d: number
          sales_30d_krw: number
          snapshot_date: string
          verification_level: number | null
          verification_status: string | null
        }
        Insert: {
          account_id: string
          computed_at?: string
          has_extension?: boolean
          health_score?: number | null
          issue_flags?: Json
          last_login_at?: string | null
          last_order_at?: string | null
          margin_30d_krw?: number
          margin_failed_count?: number
          matched_pct?: number | null
          orders_30d?: number
          orders_pending?: number
          orders_stuck?: number
          orders_total?: number
          plan_code?: string | null
          plan_status?: string | null
          products_count?: number
          purchase_30d_krw?: number
          receipts_7d?: number
          sales_30d_krw?: number
          snapshot_date?: string
          verification_level?: number | null
          verification_status?: string | null
        }
        Update: {
          account_id?: string
          computed_at?: string
          has_extension?: boolean
          health_score?: number | null
          issue_flags?: Json
          last_login_at?: string | null
          last_order_at?: string | null
          margin_30d_krw?: number
          margin_failed_count?: number
          matched_pct?: number | null
          orders_30d?: number
          orders_pending?: number
          orders_stuck?: number
          orders_total?: number
          plan_code?: string | null
          plan_status?: string | null
          products_count?: number
          purchase_30d_krw?: number
          receipts_7d?: number
          sales_30d_krw?: number
          snapshot_date?: string
          verification_level?: number | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "b2b_seller_health_snapshot_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_seller_tokens: {
        Row: {
          account_id: string
          created_at: string
          id: string
          label: string
          last_used_at: string | null
          revoked_at: string | null
          token_hash: string
          token_prefix: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          label?: string
          last_used_at?: string | null
          revoked_at?: string | null
          token_hash: string
          token_prefix: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          label?: string
          last_used_at?: string | null
          revoked_at?: string | null
          token_hash?: string
          token_prefix?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_seller_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_shipments: {
        Row: {
          account_id: string
          arrived_at: string | null
          arrived_korea_at: string | null
          country: string | null
          created_at: string
          delivered_at: string | null
          forwarder_id: string | null
          forwarder_request_no: string | null
          id: string
          last_synced_at: string | null
          order_id: string | null
          raw_status_data: Json | null
          shipped_at: string | null
          status: string
          submitted_at: string | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          arrived_at?: string | null
          arrived_korea_at?: string | null
          country?: string | null
          created_at?: string
          delivered_at?: string | null
          forwarder_id?: string | null
          forwarder_request_no?: string | null
          id?: string
          last_synced_at?: string | null
          order_id?: string | null
          raw_status_data?: Json | null
          shipped_at?: string | null
          status?: string
          submitted_at?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          arrived_at?: string | null
          arrived_korea_at?: string | null
          country?: string | null
          created_at?: string
          delivered_at?: string | null
          forwarder_id?: string | null
          forwarder_request_no?: string | null
          id?: string
          last_synced_at?: string | null
          order_id?: string | null
          raw_status_data?: Json | null
          shipped_at?: string | null
          status?: string
          submitted_at?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_shipments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_shipments_forwarder_id_fkey"
            columns: ["forwarder_id"]
            isOneToOne: false
            referencedRelation: "forwarders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "b2b_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          features: Json
          id: string
          is_active: boolean
          monthly_order_quota: number | null
          name_ko: string
          plan_code: string
          price_krw_monthly: number
          price_krw_yearly: number
          required_verification_level: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          features?: Json
          id?: string
          is_active?: boolean
          monthly_order_quota?: number | null
          name_ko: string
          plan_code: string
          price_krw_monthly?: number
          price_krw_yearly?: number
          required_verification_level?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          features?: Json
          id?: string
          is_active?: boolean
          monthly_order_quota?: number | null
          name_ko?: string
          plan_code?: string
          price_krw_monthly?: number
          price_krw_yearly?: number
          required_verification_level?: number
          updated_at?: string
        }
        Relationships: []
      }
      b2b_subscriptions: {
        Row: {
          account_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          discount_override_pct: number | null
          id: string
          monthly_order_quota_override: number | null
          monthly_order_used: number
          next_billing_at: string | null
          period_end: string | null
          period_start: string
          plan_id: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          discount_override_pct?: number | null
          id?: string
          monthly_order_quota_override?: number | null
          monthly_order_used?: number
          next_billing_at?: string | null
          period_end?: string | null
          period_start?: string
          plan_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          discount_override_pct?: number | null
          id?: string
          monthly_order_quota_override?: number | null
          monthly_order_used?: number
          next_billing_at?: string | null
          period_end?: string | null
          period_start?: string
          plan_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "b2b_subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_supplier_purchase_matches: {
        Row: {
          account_id: string
          amount_share_foreign: number | null
          id: string
          match_confidence: number | null
          matched_at: string
          matched_by_user_id: string | null
          note: string | null
          order_id: string
          order_item_id: string | null
          receipt_id: string
        }
        Insert: {
          account_id: string
          amount_share_foreign?: number | null
          id?: string
          match_confidence?: number | null
          matched_at?: string
          matched_by_user_id?: string | null
          note?: string | null
          order_id: string
          order_item_id?: string | null
          receipt_id: string
        }
        Update: {
          account_id?: string
          amount_share_foreign?: number | null
          id?: string
          match_confidence?: number | null
          matched_at?: string
          matched_by_user_id?: string | null
          note?: string | null
          order_id?: string
          order_item_id?: string | null
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_supplier_purchase_matches_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_supplier_purchase_matches_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "b2b_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_supplier_purchase_matches_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "b2b_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_supplier_purchase_matches_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "b2b_supplier_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_supplier_purchases: {
        Row: {
          account_id: string
          created_at: string
          currency: string | null
          id: string
          items: Json
          matched_at: string | null
          matched_order_id: string | null
          purchased_at: string | null
          raw_meta: Json | null
          shipping_foreign: number | null
          source: string
          source_url: string | null
          subtotal_foreign: number | null
          supplier_order_number: string
          tax_foreign: number | null
          total_foreign: number | null
        }
        Insert: {
          account_id: string
          created_at?: string
          currency?: string | null
          id?: string
          items?: Json
          matched_at?: string | null
          matched_order_id?: string | null
          purchased_at?: string | null
          raw_meta?: Json | null
          shipping_foreign?: number | null
          source: string
          source_url?: string | null
          subtotal_foreign?: number | null
          supplier_order_number: string
          tax_foreign?: number | null
          total_foreign?: number | null
        }
        Update: {
          account_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          items?: Json
          matched_at?: string | null
          matched_order_id?: string | null
          purchased_at?: string | null
          raw_meta?: Json | null
          shipping_foreign?: number | null
          source?: string
          source_url?: string | null
          subtotal_foreign?: number | null
          supplier_order_number?: string
          tax_foreign?: number | null
          total_foreign?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "b2b_supplier_purchases_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_supplier_purchases_matched_order_id_fkey"
            columns: ["matched_order_id"]
            isOneToOne: false
            referencedRelation: "b2b_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_supplier_purchases_audit: {
        Row: {
          account_id: string
          changed_at: string
          changed_by_user_id: string | null
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          reason: string | null
          receipt_id: string
        }
        Insert: {
          account_id: string
          changed_at?: string
          changed_by_user_id?: string | null
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          receipt_id: string
        }
        Update: {
          account_id?: string
          changed_at?: string
          changed_by_user_id?: string | null
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_supplier_purchases_audit_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_supplier_purchases_audit_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "b2b_supplier_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_support_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender: string
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender: string
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "b2b_support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_support_tickets: {
        Row: {
          account_id: string
          category: string
          created_at: string
          id: string
          last_message_at: string
          status: string
          subject: string
        }
        Insert: {
          account_id: string
          category?: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          subject: string
        }
        Update: {
          account_id?: string
          category?: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_support_tickets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_terms_versions: {
        Row: {
          body: string
          category: string
          created_at: string
          effective_from: string
          id: string
          is_active: boolean
          is_required: boolean
          title: string
          version_code: string
        }
        Insert: {
          body: string
          category: string
          created_at?: string
          effective_from?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          title: string
          version_code: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          effective_from?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          title?: string
          version_code?: string
        }
        Relationships: []
      }
      centers: {
        Row: {
          address: string | null
          center_name: string | null
          country: string
          country_name: string | null
          default_phone: string | null
          forwarder_id: string | null
          id: string
          is_tax_free: boolean | null
          lat: number | null
          lng: number | null
          min_weight: number | null
          shipping_type: string | null
          special_benefit: string | null
          state: string | null
          storage_days: number | null
        }
        Insert: {
          address?: string | null
          center_name?: string | null
          country: string
          country_name?: string | null
          default_phone?: string | null
          forwarder_id?: string | null
          id?: string
          is_tax_free?: boolean | null
          lat?: number | null
          lng?: number | null
          min_weight?: number | null
          shipping_type?: string | null
          special_benefit?: string | null
          state?: string | null
          storage_days?: number | null
        }
        Update: {
          address?: string | null
          center_name?: string | null
          country?: string
          country_name?: string | null
          default_phone?: string | null
          forwarder_id?: string | null
          id?: string
          is_tax_free?: boolean | null
          lat?: number | null
          lng?: number | null
          min_weight?: number | null
          shipping_type?: string | null
          special_benefit?: string | null
          state?: string | null
          storage_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "centers_forwarder_id_fkey"
            columns: ["forwarder_id"]
            isOneToOne: false
            referencedRelation: "forwarders"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          base_rate: number | null
          cash_buy: number | null
          cash_sell: number | null
          created_at: string
          currency: string | null
          currency_name: string | null
          exchange_seq: number
          remit_receive: number | null
          remit_send: number | null
          usd_conversion_rate: number | null
        }
        Insert: {
          base_rate?: number | null
          cash_buy?: number | null
          cash_sell?: number | null
          created_at?: string
          currency?: string | null
          currency_name?: string | null
          exchange_seq?: number
          remit_receive?: number | null
          remit_send?: number | null
          usd_conversion_rate?: number | null
        }
        Update: {
          base_rate?: number | null
          cash_buy?: number | null
          cash_sell?: number | null
          created_at?: string
          currency?: string | null
          currency_name?: string | null
          exchange_seq?: number
          remit_receive?: number | null
          remit_send?: number | null
          usd_conversion_rate?: number | null
        }
        Relationships: []
      }
      forwarder_additional_services: {
        Row: {
          category: string
          conditions: string | null
          description: string | null
          display_order: number | null
          forwarder_id: string
          id: string
          is_active: boolean | null
          price_currency: string | null
          price_numeric: number | null
          price_text: string | null
          price_unit: string | null
          service_name: string
          source: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          conditions?: string | null
          description?: string | null
          display_order?: number | null
          forwarder_id: string
          id?: string
          is_active?: boolean | null
          price_currency?: string | null
          price_numeric?: number | null
          price_text?: string | null
          price_unit?: string | null
          service_name: string
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          conditions?: string | null
          description?: string | null
          display_order?: number | null
          forwarder_id?: string
          id?: string
          is_active?: boolean | null
          price_currency?: string | null
          price_numeric?: number | null
          price_text?: string | null
          price_unit?: string | null
          service_name?: string
          source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forwarder_additional_services_forwarder_id_fkey"
            columns: ["forwarder_id"]
            isOneToOne: false
            referencedRelation: "forwarders"
            referencedColumns: ["id"]
          },
        ]
      }
      forwarders: {
        Row: {
          cons: string[] | null
          created_at: string | null
          default_phone: string | null
          description: string | null
          features: string[] | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          official_reviews_url: string | null
          pros: string[] | null
          rate_page_url: string | null
          slug: string
          website: string | null
        }
        Insert: {
          cons?: string[] | null
          created_at?: string | null
          default_phone?: string | null
          description?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          official_reviews_url?: string | null
          pros?: string[] | null
          rate_page_url?: string | null
          slug: string
          website?: string | null
        }
        Update: {
          cons?: string[] | null
          created_at?: string | null
          default_phone?: string | null
          description?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          official_reviews_url?: string | null
          pros?: string[] | null
          rate_page_url?: string | null
          slug?: string
          website?: string | null
        }
        Relationships: []
      }
      health_admin_actions: {
        Row: {
          action: string
          actor_email: string
          created_at: string | null
          id: number
          payload: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_email: string
          created_at?: string | null
          id?: number
          payload?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_email?: string
          created_at?: string | null
          id?: number
          payload?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      health_blog_post_reviews: {
        Row: {
          applied: boolean
          body_md_after: string | null
          body_md_before: string | null
          content_id: string
          created_at: string
          created_by: string | null
          excerpt_after: string | null
          excerpt_before: string | null
          findings: Json
          grounding_urls: string[]
          id: string
          model: string | null
          perspectives: string[]
          reverted_at: string | null
          summary: string | null
          title_after: string | null
          title_before: string | null
        }
        Insert: {
          applied?: boolean
          body_md_after?: string | null
          body_md_before?: string | null
          content_id: string
          created_at?: string
          created_by?: string | null
          excerpt_after?: string | null
          excerpt_before?: string | null
          findings?: Json
          grounding_urls?: string[]
          id?: string
          model?: string | null
          perspectives: string[]
          reverted_at?: string | null
          summary?: string | null
          title_after?: string | null
          title_before?: string | null
        }
        Update: {
          applied?: boolean
          body_md_after?: string | null
          body_md_before?: string | null
          content_id?: string
          created_at?: string
          created_by?: string | null
          excerpt_after?: string | null
          excerpt_before?: string | null
          findings?: Json
          grounding_urls?: string[]
          id?: string
          model?: string | null
          perspectives?: string[]
          reverted_at?: string | null
          summary?: string | null
          title_after?: string | null
          title_before?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_blog_post_reviews_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "health_contents"
            referencedColumns: ["id"]
          },
        ]
      }
      health_blog_review_perspectives: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      health_contents: {
        Row: {
          author_credential: string | null
          author_name: string | null
          body_md: string | null
          category: string | null
          cover_image_url: string | null
          created_at: string | null
          evidence_level: string | null
          excerpt: string | null
          id: string
          published_at: string | null
          reviewed_at: string | null
          reviewer_credential: string | null
          reviewer_name: string | null
          slug: string
          source_ids: string[] | null
          status: string | null
          tags: string[] | null
          title: string
          topic_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_credential?: string | null
          author_name?: string | null
          body_md?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          evidence_level?: string | null
          excerpt?: string | null
          id?: string
          published_at?: string | null
          reviewed_at?: string | null
          reviewer_credential?: string | null
          reviewer_name?: string | null
          slug: string
          source_ids?: string[] | null
          status?: string | null
          tags?: string[] | null
          title: string
          topic_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_credential?: string | null
          author_name?: string | null
          body_md?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          evidence_level?: string | null
          excerpt?: string | null
          id?: string
          published_at?: string | null
          reviewed_at?: string | null
          reviewer_credential?: string | null
          reviewer_name?: string | null
          slug?: string
          source_ids?: string[] | null
          status?: string | null
          tags?: string[] | null
          title?: string
          topic_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_contents_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "health_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      health_product_prices: {
        Row: {
          fetched_at: string | null
          id: string
          in_stock: boolean | null
          price_krw: number | null
          price_usd: number | null
          product_id: string | null
          shipping_krw: number | null
          vendor: string
          vendor_url: string | null
        }
        Insert: {
          fetched_at?: string | null
          id?: string
          in_stock?: boolean | null
          price_krw?: number | null
          price_usd?: number | null
          product_id?: string | null
          shipping_krw?: number | null
          vendor: string
          vendor_url?: string | null
        }
        Update: {
          fetched_at?: string | null
          id?: string
          in_stock?: boolean | null
          price_krw?: number | null
          price_usd?: number | null
          product_id?: string | null
          shipping_krw?: number | null
          vendor?: string
          vendor_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "health_products"
            referencedColumns: ["id"]
          },
        ]
      }
      health_products: {
        Row: {
          benefits: string[] | null
          category: string | null
          cautions: string[] | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          ingredients: string[] | null
          is_active: boolean | null
          name: string
          slug: string
        }
        Insert: {
          benefits?: string[] | null
          category?: string | null
          cautions?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string[] | null
          is_active?: boolean | null
          name: string
          slug: string
        }
        Update: {
          benefits?: string[] | null
          category?: string | null
          cautions?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string[] | null
          is_active?: boolean | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      health_sources: {
        Row: {
          abstract: string | null
          authors: string[] | null
          collected_at: string | null
          collected_by: string | null
          doi: string | null
          id: string
          key_findings: string | null
          linked_content_id: string | null
          notes: string | null
          outlet: string | null
          pmid: string | null
          published_date: string | null
          quality_score: number | null
          source_type: string
          status: string
          title: string
          topic_id: string | null
          topics: string[] | null
          updated_at: string | null
          url: string
        }
        Insert: {
          abstract?: string | null
          authors?: string[] | null
          collected_at?: string | null
          collected_by?: string | null
          doi?: string | null
          id?: string
          key_findings?: string | null
          linked_content_id?: string | null
          notes?: string | null
          outlet?: string | null
          pmid?: string | null
          published_date?: string | null
          quality_score?: number | null
          source_type: string
          status?: string
          title: string
          topic_id?: string | null
          topics?: string[] | null
          updated_at?: string | null
          url: string
        }
        Update: {
          abstract?: string | null
          authors?: string[] | null
          collected_at?: string | null
          collected_by?: string | null
          doi?: string | null
          id?: string
          key_findings?: string | null
          linked_content_id?: string | null
          notes?: string | null
          outlet?: string | null
          pmid?: string | null
          published_date?: string | null
          quality_score?: number | null
          source_type?: string
          status?: string
          title?: string
          topic_id?: string | null
          topics?: string[] | null
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_sources_linked_content_id_fkey"
            columns: ["linked_content_id"]
            isOneToOne: false
            referencedRelation: "health_contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_sources_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "health_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      health_topics: {
        Row: {
          cluster_roadmap: Json | null
          created_at: string | null
          description: string | null
          id: string
          keywords: string[] | null
          metadata: Json | null
          priority: number | null
          slug: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          cluster_roadmap?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          metadata?: Json | null
          priority?: number | null
          slug: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          cluster_roadmap?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          metadata?: Json | null
          priority?: number | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      info_user_base: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          is_super: boolean
          user_id: string
          user_name: string | null
          user_password: string
        }
        Insert: {
          created_at?: string
          id?: number
          is_active?: boolean
          is_super?: boolean
          user_id: string
          user_name?: string | null
          user_password: string
        }
        Update: {
          created_at?: string
          id?: number
          is_active?: boolean
          is_super?: boolean
          user_id?: string
          user_name?: string | null
          user_password?: string
        }
        Relationships: []
      }
      jimscanner_admin_actions: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          id: string
          metadata: Json
          summary: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          summary?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          summary?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      jimscanner_blog_generation_prompts: {
        Row: {
          change_summary: string | null
          char_count: number | null
          created_at: string
          created_by: string | null
          derived_from_review_ids: string[]
          id: string
          is_active: boolean
          label: string
          parent_version_id: string | null
          system_prompt: string
          version: number
        }
        Insert: {
          change_summary?: string | null
          char_count?: number | null
          created_at?: string
          created_by?: string | null
          derived_from_review_ids?: string[]
          id?: string
          is_active?: boolean
          label: string
          parent_version_id?: string | null
          system_prompt: string
          version: number
        }
        Update: {
          change_summary?: string | null
          char_count?: number | null
          created_at?: string
          created_by?: string | null
          derived_from_review_ids?: string[]
          id?: string
          is_active?: boolean
          label?: string
          parent_version_id?: string | null
          system_prompt?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "jimscanner_blog_generation_prompts_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "jimscanner_blog_generation_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      jimscanner_blog_home_sections: {
        Row: {
          active: boolean
          category: string
          display_order: number
          layout: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          display_order?: number
          layout?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          display_order?: number
          layout?: string
          updated_at?: string
        }
        Relationships: []
      }
      jimscanner_blog_post_reviews: {
        Row: {
          applied: boolean
          content_after: string | null
          content_before: string | null
          created_at: string
          created_by: string | null
          description_after: string | null
          description_before: string | null
          findings: Json
          grounding_urls: string[]
          id: string
          model: string | null
          perspectives: string[]
          post_slug: string
          reverted_at: string | null
          summary: string | null
          title_after: string | null
          title_before: string | null
        }
        Insert: {
          applied?: boolean
          content_after?: string | null
          content_before?: string | null
          created_at?: string
          created_by?: string | null
          description_after?: string | null
          description_before?: string | null
          findings?: Json
          grounding_urls?: string[]
          id?: string
          model?: string | null
          perspectives?: string[]
          post_slug: string
          reverted_at?: string | null
          summary?: string | null
          title_after?: string | null
          title_before?: string | null
        }
        Update: {
          applied?: boolean
          content_after?: string | null
          content_before?: string | null
          created_at?: string
          created_by?: string | null
          description_after?: string | null
          description_before?: string | null
          findings?: Json
          grounding_urls?: string[]
          id?: string
          model?: string | null
          perspectives?: string[]
          post_slug?: string
          reverted_at?: string | null
          summary?: string | null
          title_after?: string | null
          title_before?: string | null
        }
        Relationships: []
      }
      jimscanner_blog_posts: {
        Row: {
          author: string
          auto_generated: boolean | null
          category: string
          content: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          faq: Json
          home_featured: boolean
          home_order: number | null
          id: string
          last_pipeline_tick_at: string | null
          og_image: string | null
          pipeline_status: string | null
          published_at: string | null
          review_history: Json | null
          reviewed_by: string | null
          revision_count: number | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          source_urls: Json
          status: string
          tags: string[]
          target_keywords: string[]
          title: string
          topic_category: string | null
          topic_keywords: string[] | null
          updated_at: string
          view_count: number
        }
        Insert: {
          author?: string
          auto_generated?: boolean | null
          category?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          faq?: Json
          home_featured?: boolean
          home_order?: number | null
          id?: string
          last_pipeline_tick_at?: string | null
          og_image?: string | null
          pipeline_status?: string | null
          published_at?: string | null
          review_history?: Json | null
          reviewed_by?: string | null
          revision_count?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          source_urls?: Json
          status?: string
          tags?: string[]
          target_keywords?: string[]
          title: string
          topic_category?: string | null
          topic_keywords?: string[] | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          author?: string
          auto_generated?: boolean | null
          category?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          faq?: Json
          home_featured?: boolean
          home_order?: number | null
          id?: string
          last_pipeline_tick_at?: string | null
          og_image?: string | null
          pipeline_status?: string | null
          published_at?: string | null
          review_history?: Json | null
          reviewed_by?: string | null
          revision_count?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          source_urls?: Json
          status?: string
          tags?: string[]
          target_keywords?: string[]
          title?: string
          topic_category?: string | null
          topic_keywords?: string[] | null
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      jimscanner_blog_review_perspectives: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      jimscanner_blog_topic_queue: {
        Row: {
          category: string | null
          created_post_id: string | null
          id: string
          keywords: string[] | null
          notes: string | null
          picked_at: string | null
          priority: number | null
          source: string | null
          status: string | null
          suggested_at: string | null
          title_draft: string
        }
        Insert: {
          category?: string | null
          created_post_id?: string | null
          id?: string
          keywords?: string[] | null
          notes?: string | null
          picked_at?: string | null
          priority?: number | null
          source?: string | null
          status?: string | null
          suggested_at?: string | null
          title_draft: string
        }
        Update: {
          category?: string | null
          created_post_id?: string | null
          id?: string
          keywords?: string[] | null
          notes?: string | null
          picked_at?: string | null
          priority?: number | null
          source?: string | null
          status?: string | null
          suggested_at?: string | null
          title_draft?: string
        }
        Relationships: [
          {
            foreignKeyName: "jimscanner_blog_topic_queue_created_post_id_fkey"
            columns: ["created_post_id"]
            isOneToOne: false
            referencedRelation: "jimscanner_blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      jimscanner_category_weights: {
        Row: {
          brand: string | null
          category_tag: string
          confidence: string
          id: string
          last_recomputed_at: string | null
          sample_n: number
          shipping_mode: string | null
          source_country: string | null
          weight_max_kg: number | null
          weight_mean_kg: number | null
          weight_median_kg: number
          weight_min_kg: number | null
          weight_p25_kg: number | null
          weight_p75_kg: number | null
        }
        Insert: {
          brand?: string | null
          category_tag: string
          confidence: string
          id?: string
          last_recomputed_at?: string | null
          sample_n: number
          shipping_mode?: string | null
          source_country?: string | null
          weight_max_kg?: number | null
          weight_mean_kg?: number | null
          weight_median_kg: number
          weight_min_kg?: number | null
          weight_p25_kg?: number | null
          weight_p75_kg?: number | null
        }
        Update: {
          brand?: string | null
          category_tag?: string
          confidence?: string
          id?: string
          last_recomputed_at?: string | null
          sample_n?: number
          shipping_mode?: string | null
          source_country?: string | null
          weight_max_kg?: number | null
          weight_mean_kg?: number | null
          weight_median_kg?: number
          weight_min_kg?: number | null
          weight_p25_kg?: number | null
          weight_p75_kg?: number | null
        }
        Relationships: []
      }
      jimscanner_coupang_listings: {
        Row: {
          approval_status_name: string | null
          approved_at: string | null
          auto_paused: boolean | null
          brand: string | null
          coupang_sale_stopped_at: string | null
          created_at: string
          display_category_code: number
          display_category_name: string | null
          displayable: boolean
          dome_price_krw: number
          estimated_fee_krw: number | null
          estimated_margin_krw: number | null
          estimated_margin_pct: number | null
          id: string
          last_response: Json | null
          last_stock_check: string | null
          last_synced_at: string | null
          list_price_krw: number
          msp_price_krw: number
          outbound_shipping_fee_krw: number | null
          product_id: number | null
          registered_at: string | null
          registered_title: string
          rejection_reason: string | null
          request_payload: Json | null
          seller_product_id: number | null
          sold_count: number | null
          source: string
          source_detail_url: string | null
          source_goods_no: string
          source_shipping_fee_krw: number | null
          status: string
          stock_sold_out_at: string | null
          stock_status: string | null
          updated_at: string
          vendor_id: string
          view_count: number | null
        }
        Insert: {
          approval_status_name?: string | null
          approved_at?: string | null
          auto_paused?: boolean | null
          brand?: string | null
          coupang_sale_stopped_at?: string | null
          created_at?: string
          display_category_code: number
          display_category_name?: string | null
          displayable?: boolean
          dome_price_krw: number
          estimated_fee_krw?: number | null
          estimated_margin_krw?: number | null
          estimated_margin_pct?: number | null
          id?: string
          last_response?: Json | null
          last_stock_check?: string | null
          last_synced_at?: string | null
          list_price_krw: number
          msp_price_krw: number
          outbound_shipping_fee_krw?: number | null
          product_id?: number | null
          registered_at?: string | null
          registered_title: string
          rejection_reason?: string | null
          request_payload?: Json | null
          seller_product_id?: number | null
          sold_count?: number | null
          source?: string
          source_detail_url?: string | null
          source_goods_no: string
          source_shipping_fee_krw?: number | null
          status?: string
          stock_sold_out_at?: string | null
          stock_status?: string | null
          updated_at?: string
          vendor_id: string
          view_count?: number | null
        }
        Update: {
          approval_status_name?: string | null
          approved_at?: string | null
          auto_paused?: boolean | null
          brand?: string | null
          coupang_sale_stopped_at?: string | null
          created_at?: string
          display_category_code?: number
          display_category_name?: string | null
          displayable?: boolean
          dome_price_krw?: number
          estimated_fee_krw?: number | null
          estimated_margin_krw?: number | null
          estimated_margin_pct?: number | null
          id?: string
          last_response?: Json | null
          last_stock_check?: string | null
          last_synced_at?: string | null
          list_price_krw?: number
          msp_price_krw?: number
          outbound_shipping_fee_krw?: number | null
          product_id?: number | null
          registered_at?: string | null
          registered_title?: string
          rejection_reason?: string | null
          request_payload?: Json | null
          seller_product_id?: number | null
          sold_count?: number | null
          source?: string
          source_detail_url?: string | null
          source_goods_no?: string
          source_shipping_fee_krw?: number | null
          status?: string
          stock_sold_out_at?: string | null
          stock_status?: string | null
          updated_at?: string
          vendor_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jimscanner_coupang_listings_source_goods_no_fk"
            columns: ["source_goods_no"]
            isOneToOne: false
            referencedRelation: "jimscanner_ggsan_products"
            referencedColumns: ["goods_no"]
          },
        ]
      }
      jimscanner_coupang_orders: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivery_charge: number | null
          delivery_company: string | null
          discount_amount: number | null
          id: string
          invoice_number: string | null
          last_synced_at: string | null
          listing_id: string | null
          option_name: string | null
          order_id: number
          order_item_id: number
          order_price: number | null
          ordered_at: string
          paid_amount: number | null
          paid_at: string | null
          product_name: string
          purchase_note: string | null
          purchase_ordered_at: string | null
          purchase_received_at: string | null
          purchase_status: string
          purchase_total_cost: number | null
          purchase_unit_cost: number | null
          raw_payload: Json | null
          receiver_address: string | null
          receiver_name: string | null
          receiver_phone: string | null
          receiver_zip_code: string | null
          sale_price: number | null
          seller_product_id: number | null
          shipment_box_id: number | null
          shipped_at: string | null
          shipping_count: number
          shipping_status: string
          updated_at: string
          vendor_id: string
          vendor_item_id: number | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_charge?: number | null
          delivery_company?: string | null
          discount_amount?: number | null
          id?: string
          invoice_number?: string | null
          last_synced_at?: string | null
          listing_id?: string | null
          option_name?: string | null
          order_id: number
          order_item_id: number
          order_price?: number | null
          ordered_at: string
          paid_amount?: number | null
          paid_at?: string | null
          product_name: string
          purchase_note?: string | null
          purchase_ordered_at?: string | null
          purchase_received_at?: string | null
          purchase_status?: string
          purchase_total_cost?: number | null
          purchase_unit_cost?: number | null
          raw_payload?: Json | null
          receiver_address?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          receiver_zip_code?: string | null
          sale_price?: number | null
          seller_product_id?: number | null
          shipment_box_id?: number | null
          shipped_at?: string | null
          shipping_count?: number
          shipping_status?: string
          updated_at?: string
          vendor_id: string
          vendor_item_id?: number | null
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_charge?: number | null
          delivery_company?: string | null
          discount_amount?: number | null
          id?: string
          invoice_number?: string | null
          last_synced_at?: string | null
          listing_id?: string | null
          option_name?: string | null
          order_id?: number
          order_item_id?: number
          order_price?: number | null
          ordered_at?: string
          paid_amount?: number | null
          paid_at?: string | null
          product_name?: string
          purchase_note?: string | null
          purchase_ordered_at?: string | null
          purchase_received_at?: string | null
          purchase_status?: string
          purchase_total_cost?: number | null
          purchase_unit_cost?: number | null
          raw_payload?: Json | null
          receiver_address?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          receiver_zip_code?: string | null
          sale_price?: number | null
          seller_product_id?: number | null
          shipment_box_id?: number | null
          shipped_at?: string | null
          shipping_count?: number
          shipping_status?: string
          updated_at?: string
          vendor_id?: string
          vendor_item_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jimscanner_coupang_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "jimscanner_coupang_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      jimscanner_coupang_stock_sync_runs: {
        Row: {
          duration_ms: number | null
          error_count: number | null
          error_message: string | null
          finished_at: string | null
          id: string
          resumed_count: number | null
          sold_out_count: number | null
          started_at: string
          status: string | null
          total_checked: number | null
          triggered_by: string | null
        }
        Insert: {
          duration_ms?: number | null
          error_count?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          resumed_count?: number | null
          sold_out_count?: number | null
          started_at?: string
          status?: string | null
          total_checked?: number | null
          triggered_by?: string | null
        }
        Update: {
          duration_ms?: number | null
          error_count?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          resumed_count?: number | null
          sold_out_count?: number | null
          started_at?: string
          status?: string | null
          total_checked?: number | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      jimscanner_duty_rates: {
        Row: {
          category_tag: string
          duty_rate_percent: number
          excise_rate_percent: number | null
          excise_threshold_krw: number | null
          excluded_from_list_clearance: boolean | null
          id: string
          is_active: boolean | null
          label_ko: string
          notes: string | null
          personal_use_limit: number | null
          personal_use_limit_unit: string | null
          source: string | null
          updated_at: string | null
          vat_rate_percent: number
        }
        Insert: {
          category_tag: string
          duty_rate_percent: number
          excise_rate_percent?: number | null
          excise_threshold_krw?: number | null
          excluded_from_list_clearance?: boolean | null
          id?: string
          is_active?: boolean | null
          label_ko: string
          notes?: string | null
          personal_use_limit?: number | null
          personal_use_limit_unit?: string | null
          source?: string | null
          updated_at?: string | null
          vat_rate_percent?: number
        }
        Update: {
          category_tag?: string
          duty_rate_percent?: number
          excise_rate_percent?: number | null
          excise_threshold_krw?: number | null
          excluded_from_list_clearance?: boolean | null
          id?: string
          is_active?: boolean | null
          label_ko?: string
          notes?: string | null
          personal_use_limit?: number | null
          personal_use_limit_unit?: string | null
          source?: string | null
          updated_at?: string | null
          vat_rate_percent?: number
        }
        Relationships: []
      }
      jimscanner_email_digest_subscribers: {
        Row: {
          created_at: string
          email: string
          ip_address: unknown
          last_sent_at: string | null
          source_context: string
          subscribed_at: string
          unsubscribed_at: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          ip_address?: unknown
          last_sent_at?: string | null
          source_context?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          ip_address?: unknown
          last_sent_at?: string | null
          source_context?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      jimscanner_exchange_rate_history: {
        Row: {
          created_at: string
          currency: string
          id: string
          rate_date: string
          rate_krw: number
          source: string
        }
        Insert: {
          created_at?: string
          currency: string
          id?: string
          rate_date: string
          rate_krw: number
          source?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          rate_date?: string
          rate_krw?: number
          source?: string
        }
        Relationships: []
      }
      jimscanner_exchange_rate_logs: {
        Row: {
          created_at: string
          currency: string
          error_message: string | null
          id: string
          previous_rate_krw: number | null
          rate_krw: number
          source: string
          status: string
          triggered_by: string
        }
        Insert: {
          created_at?: string
          currency: string
          error_message?: string | null
          id?: string
          previous_rate_krw?: number | null
          rate_krw: number
          source: string
          status?: string
          triggered_by: string
        }
        Update: {
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          previous_rate_krw?: number | null
          rate_krw?: number
          source?: string
          status?: string
          triggered_by?: string
        }
        Relationships: []
      }
      jimscanner_exchange_rates: {
        Row: {
          currency: string
          id: string
          rate_krw: number
          source: string
          updated_at: string
        }
        Insert: {
          currency: string
          id?: string
          rate_krw: number
          source?: string
          updated_at?: string
        }
        Update: {
          currency?: string
          id?: string
          rate_krw?: number
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      jimscanner_forwarder_content: {
        Row: {
          created_at: string
          created_by: string | null
          faq: Json
          forwarder_id: string
          overview: string | null
          pricing_notes: string | null
          published_at: string | null
          recommended_for: string | null
          reviewed_by: string | null
          service_features: Json
          source_urls: Json
          status: string
          strengths: Json
          updated_at: string
          usage_tips: Json
          weaknesses: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          faq?: Json
          forwarder_id: string
          overview?: string | null
          pricing_notes?: string | null
          published_at?: string | null
          recommended_for?: string | null
          reviewed_by?: string | null
          service_features?: Json
          source_urls?: Json
          status?: string
          strengths?: Json
          updated_at?: string
          usage_tips?: Json
          weaknesses?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          faq?: Json
          forwarder_id?: string
          overview?: string | null
          pricing_notes?: string | null
          published_at?: string | null
          recommended_for?: string | null
          reviewed_by?: string | null
          service_features?: Json
          source_urls?: Json
          status?: string
          strengths?: Json
          updated_at?: string
          usage_tips?: Json
          weaknesses?: Json
        }
        Relationships: [
          {
            foreignKeyName: "jimscanner_forwarder_content_forwarder_id_fkey"
            columns: ["forwarder_id"]
            isOneToOne: true
            referencedRelation: "forwarders"
            referencedColumns: ["id"]
          },
        ]
      }
      jimscanner_forwarder_info_sources: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number
          forwarder_id: string
          id: string
          is_active: boolean
          label: string | null
          last_fetch_status: string | null
          last_fetched_at: string | null
          notes: string | null
          source_type: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          forwarder_id: string
          id?: string
          is_active?: boolean
          label?: string | null
          last_fetch_status?: string | null
          last_fetched_at?: string | null
          notes?: string | null
          source_type: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          forwarder_id?: string
          id?: string
          is_active?: boolean
          label?: string | null
          last_fetch_status?: string | null
          last_fetched_at?: string | null
          notes?: string | null
          source_type?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "jimscanner_forwarder_info_sources_forwarder_id_fkey"
            columns: ["forwarder_id"]
            isOneToOne: false
            referencedRelation: "forwarders"
            referencedColumns: ["id"]
          },
        ]
      }
      jimscanner_forwarder_review_summary: {
        Row: {
          collected_at: string | null
          country: string
          created_at: string
          data_availability: string
          data_availability_note: string | null
          forwarder_id: string
          notable_issues: string | null
          overall_sentiment: string | null
          review_count: number
          updated_at: string
        }
        Insert: {
          collected_at?: string | null
          country: string
          created_at?: string
          data_availability?: string
          data_availability_note?: string | null
          forwarder_id: string
          notable_issues?: string | null
          overall_sentiment?: string | null
          review_count?: number
          updated_at?: string
        }
        Update: {
          collected_at?: string | null
          country?: string
          created_at?: string
          data_availability?: string
          data_availability_note?: string | null
          forwarder_id?: string
          notable_issues?: string | null
          overall_sentiment?: string | null
          review_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jimscanner_forwarder_review_summary_forwarder_id_fkey"
            columns: ["forwarder_id"]
            isOneToOne: false
            referencedRelation: "forwarders"
            referencedColumns: ["id"]
          },
        ]
      }
      jimscanner_forwarder_reviews: {
        Row: {
          country: string
          created_at: string
          forwarder_id: string
          id: string
          is_hidden: boolean
          keywords: string[]
          platform: string | null
          quote: string | null
          review_date: string | null
          source: string
          status: string
          status_changed_at: string | null
          status_changed_by: string | null
          summary: string
          tone: string
          updated_at: string
          url: string | null
        }
        Insert: {
          country: string
          created_at?: string
          forwarder_id: string
          id?: string
          is_hidden?: boolean
          keywords?: string[]
          platform?: string | null
          quote?: string | null
          review_date?: string | null
          source?: string
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          summary: string
          tone: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          country?: string
          created_at?: string
          forwarder_id?: string
          id?: string
          is_hidden?: boolean
          keywords?: string[]
          platform?: string | null
          quote?: string | null
          review_date?: string | null
          source?: string
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          summary?: string
          tone?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jimscanner_forwarder_reviews_forwarder_id_fkey"
            columns: ["forwarder_id"]
            isOneToOne: false
            referencedRelation: "forwarders"
            referencedColumns: ["id"]
          },
        ]
      }
      jimscanner_ggsan_price_history: {
        Row: {
          goods_no: string
          id: string
          observed_at: string
          price_krw: number | null
          status: string | null
        }
        Insert: {
          goods_no: string
          id?: string
          observed_at?: string
          price_krw?: number | null
          status?: string | null
        }
        Update: {
          goods_no?: string
          id?: string
          observed_at?: string
          price_krw?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jimscanner_ggsan_price_history_goods_no_fkey"
            columns: ["goods_no"]
            isOneToOne: false
            referencedRelation: "jimscanner_ggsan_products"
            referencedColumns: ["goods_no"]
          },
        ]
      }
      jimscanner_ggsan_products: {
        Row: {
          brand: string | null
          cate_cd: string | null
          cate_label: string | null
          created_at: string
          detail_url: string | null
          first_seen_at: string
          goods_no: string
          image_url: string | null
          is_imminent: boolean | null
          last_changed_at: string
          last_seen_at: string
          list_price_krw: number | null
          min_sell_price_krw: number | null
          price_krw: number | null
          price_text: string | null
          raw_payload: Json | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          cate_cd?: string | null
          cate_label?: string | null
          created_at?: string
          detail_url?: string | null
          first_seen_at?: string
          goods_no: string
          image_url?: string | null
          is_imminent?: boolean | null
          last_changed_at?: string
          last_seen_at?: string
          list_price_krw?: number | null
          min_sell_price_krw?: number | null
          price_krw?: number | null
          price_text?: string | null
          raw_payload?: Json | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          cate_cd?: string | null
          cate_label?: string | null
          created_at?: string
          detail_url?: string | null
          first_seen_at?: string
          goods_no?: string
          image_url?: string | null
          is_imminent?: boolean | null
          last_changed_at?: string
          last_seen_at?: string
          list_price_krw?: number | null
          min_sell_price_krw?: number | null
          price_krw?: number | null
          price_text?: string | null
          raw_payload?: Json | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      jimscanner_ggsan_refresh_queue: {
        Row: {
          changed_count: number | null
          error_message: string | null
          fetched_count: number | null
          finished_at: string | null
          id: string
          inserted_count: number | null
          requested_at: string
          requested_by: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          changed_count?: number | null
          error_message?: string | null
          fetched_count?: number | null
          finished_at?: string | null
          id?: string
          inserted_count?: number | null
          requested_at?: string
          requested_by?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          changed_count?: number | null
          error_message?: string | null
          fetched_count?: number | null
          finished_at?: string | null
          id?: string
          inserted_count?: number | null
          requested_at?: string
          requested_by?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      jimscanner_gsc_pages: {
        Row: {
          clicks: number
          collected_at: string
          ctr: number
          date: string
          impressions: number
          page: string
          position: number
        }
        Insert: {
          clicks?: number
          collected_at?: string
          ctr?: number
          date: string
          impressions?: number
          page: string
          position?: number
        }
        Update: {
          clicks?: number
          collected_at?: string
          ctr?: number
          date?: string
          impressions?: number
          page?: string
          position?: number
        }
        Relationships: []
      }
      jimscanner_gsc_queries: {
        Row: {
          clicks: number
          collected_at: string
          ctr: number
          date: string
          impressions: number
          position: number
          query: string
        }
        Insert: {
          clicks?: number
          collected_at?: string
          ctr?: number
          date: string
          impressions?: number
          position?: number
          query: string
        }
        Update: {
          clicks?: number
          collected_at?: string
          ctr?: number
          date?: string
          impressions?: number
          position?: number
          query?: string
        }
        Relationships: []
      }
      jimscanner_home_hero_blog_picks: {
        Row: {
          blog_slug: string | null
          position: number
          updated_at: string
        }
        Insert: {
          blog_slug?: string | null
          position: number
          updated_at?: string
        }
        Update: {
          blog_slug?: string | null
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      jimscanner_improvement_ideas: {
        Row: {
          category: string
          cost_usd: number | null
          dedup_signature: string | null
          description: string
          generated_at: string
          generated_by: string
          id: string
          implementation_branch: string | null
          implementation_commit: string | null
          implementation_error: string | null
          input_tokens: number | null
          note: string | null
          num_turns: number | null
          output_tokens: number | null
          priority: string
          processing_started_at: string | null
          project: string
          rationale: string | null
          referenced_files: string[]
          status: string
          title: string
        }
        Insert: {
          category: string
          cost_usd?: number | null
          dedup_signature?: string | null
          description: string
          generated_at?: string
          generated_by?: string
          id?: string
          implementation_branch?: string | null
          implementation_commit?: string | null
          implementation_error?: string | null
          input_tokens?: number | null
          note?: string | null
          num_turns?: number | null
          output_tokens?: number | null
          priority: string
          processing_started_at?: string | null
          project: string
          rationale?: string | null
          referenced_files?: string[]
          status?: string
          title: string
        }
        Update: {
          category?: string
          cost_usd?: number | null
          dedup_signature?: string | null
          description?: string
          generated_at?: string
          generated_by?: string
          id?: string
          implementation_branch?: string | null
          implementation_commit?: string | null
          implementation_error?: string | null
          input_tokens?: number | null
          note?: string | null
          num_turns?: number | null
          output_tokens?: number | null
          priority?: string
          processing_started_at?: string | null
          project?: string
          rationale?: string | null
          referenced_files?: string[]
          status?: string
          title?: string
        }
        Relationships: []
      }
      jimscanner_manifest_items: {
        Row: {
          brand_raw: string | null
          category_tag: string | null
          center_name: string | null
          collected_date: string | null
          hs_code: string | null
          id: string
          imported_at: string | null
          invoice_id_hash: string
          invoice_total_weight_kg: number | null
          invoice_volumetric_weight_kg: number | null
          is_outlier: boolean | null
          is_single_item_invoice: boolean | null
          item_count_in_invoice: number
          outlier_reason: string | null
          pcs: number
          product_name_en: string
          purchase_site: string | null
          shipping_mode: string
          source_country: string
          source_file: string
          source_forwarder_slug: string | null
          unit_value_usd: number | null
          weight_per_piece_kg: number | null
        }
        Insert: {
          brand_raw?: string | null
          category_tag?: string | null
          center_name?: string | null
          collected_date?: string | null
          hs_code?: string | null
          id?: string
          imported_at?: string | null
          invoice_id_hash: string
          invoice_total_weight_kg?: number | null
          invoice_volumetric_weight_kg?: number | null
          is_outlier?: boolean | null
          is_single_item_invoice?: boolean | null
          item_count_in_invoice: number
          outlier_reason?: string | null
          pcs?: number
          product_name_en: string
          purchase_site?: string | null
          shipping_mode: string
          source_country: string
          source_file: string
          source_forwarder_slug?: string | null
          unit_value_usd?: number | null
          weight_per_piece_kg?: number | null
        }
        Update: {
          brand_raw?: string | null
          category_tag?: string | null
          center_name?: string | null
          collected_date?: string | null
          hs_code?: string | null
          id?: string
          imported_at?: string | null
          invoice_id_hash?: string
          invoice_total_weight_kg?: number | null
          invoice_volumetric_weight_kg?: number | null
          is_outlier?: boolean | null
          is_single_item_invoice?: boolean | null
          item_count_in_invoice?: number
          outlier_reason?: string | null
          pcs?: number
          product_name_en?: string
          purchase_site?: string | null
          shipping_mode?: string
          source_country?: string
          source_file?: string
          source_forwarder_slug?: string | null
          unit_value_usd?: number | null
          weight_per_piece_kg?: number | null
        }
        Relationships: []
      }
      jimscanner_market_raw: {
        Row: {
          captured_at: string
          dedup_key: string
          expires_at: string
          external_id: string | null
          id: string
          metadata: Json
          processed: boolean
          query: string | null
          source: string
          source_url: string | null
          title: string | null
        }
        Insert: {
          captured_at?: string
          dedup_key: string
          expires_at?: string
          external_id?: string | null
          id?: string
          metadata?: Json
          processed?: boolean
          query?: string | null
          source: string
          source_url?: string | null
          title?: string | null
        }
        Update: {
          captured_at?: string
          dedup_key?: string
          expires_at?: string
          external_id?: string | null
          id?: string
          metadata?: Json
          processed?: boolean
          query?: string | null
          source?: string
          source_url?: string | null
          title?: string | null
        }
        Relationships: []
      }
      jimscanner_market_signals: {
        Row: {
          category: string | null
          country: string | null
          description: string | null
          expires_at: string | null
          first_seen: string
          frequency: number
          id: string
          keywords: string[]
          last_seen: string
          raw_ids: string[]
          signal_type: string
        }
        Insert: {
          category?: string | null
          country?: string | null
          description?: string | null
          expires_at?: string | null
          first_seen?: string
          frequency?: number
          id?: string
          keywords?: string[]
          last_seen?: string
          raw_ids?: string[]
          signal_type: string
        }
        Update: {
          category?: string | null
          country?: string | null
          description?: string | null
          expires_at?: string | null
          first_seen?: string
          frequency?: number
          id?: string
          keywords?: string[]
          last_seen?: string
          raw_ids?: string[]
          signal_type?: string
        }
        Relationships: []
      }
      jimscanner_product_taxonomy: {
        Row: {
          aliases: string[] | null
          brand_canonical: string | null
          category_tag: string | null
          created_at: string | null
          default_country: string | null
          description: string | null
          display_order: number | null
          icon_emoji: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          kind: string
          label_en: string | null
          label_ko: string
          updated_at: string | null
        }
        Insert: {
          aliases?: string[] | null
          brand_canonical?: string | null
          category_tag?: string | null
          created_at?: string | null
          default_country?: string | null
          description?: string | null
          display_order?: number | null
          icon_emoji?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          kind: string
          label_en?: string | null
          label_ko: string
          updated_at?: string | null
        }
        Update: {
          aliases?: string[] | null
          brand_canonical?: string | null
          category_tag?: string | null
          created_at?: string | null
          default_country?: string | null
          description?: string | null
          display_order?: number | null
          icon_emoji?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          kind?: string
          label_en?: string | null
          label_ko?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      jimscanner_rate_check_results: {
        Row: {
          ai_confidence: string | null
          ai_raw_response: string | null
          ai_summary: string | null
          ai_verdict: string | null
          applied_at: string | null
          applied_by: string | null
          checked_at: string
          error_message: string | null
          extracted_count: number | null
          extracted_rates: Json | null
          forwarder_id: string
          forwarder_name: string
          forwarder_slug: string
          id: string
          page_size_bytes: number | null
          page_url: string | null
          run_id: string
          status: string
        }
        Insert: {
          ai_confidence?: string | null
          ai_raw_response?: string | null
          ai_summary?: string | null
          ai_verdict?: string | null
          applied_at?: string | null
          applied_by?: string | null
          checked_at?: string
          error_message?: string | null
          extracted_count?: number | null
          extracted_rates?: Json | null
          forwarder_id: string
          forwarder_name: string
          forwarder_slug: string
          id?: string
          page_size_bytes?: number | null
          page_url?: string | null
          run_id: string
          status: string
        }
        Update: {
          ai_confidence?: string | null
          ai_raw_response?: string | null
          ai_summary?: string | null
          ai_verdict?: string | null
          applied_at?: string | null
          applied_by?: string | null
          checked_at?: string
          error_message?: string | null
          extracted_count?: number | null
          extracted_rates?: Json | null
          forwarder_id?: string
          forwarder_name?: string
          forwarder_slug?: string
          id?: string
          page_size_bytes?: number | null
          page_url?: string | null
          run_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "jimscanner_rate_check_results_forwarder_id_fkey"
            columns: ["forwarder_id"]
            isOneToOne: false
            referencedRelation: "forwarders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jimscanner_rate_check_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "jimscanner_rate_check_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      jimscanner_rate_check_runs: {
        Row: {
          changed_count: number | null
          completed_at: string | null
          error_count: number | null
          id: string
          no_change_count: number | null
          skipped_count: number | null
          started_at: string
          total_forwarders: number | null
          triggered_by: string
        }
        Insert: {
          changed_count?: number | null
          completed_at?: string | null
          error_count?: number | null
          id?: string
          no_change_count?: number | null
          skipped_count?: number | null
          started_at?: string
          total_forwarders?: number | null
          triggered_by: string
        }
        Update: {
          changed_count?: number | null
          completed_at?: string | null
          error_count?: number | null
          id?: string
          no_change_count?: number | null
          skipped_count?: number | null
          started_at?: string
          total_forwarders?: number | null
          triggered_by?: string
        }
        Relationships: []
      }
      jimscanner_rate_fetch_runs: {
        Row: {
          countries: string[]
          duration_ms: number | null
          error_message: string | null
          finished_at: string
          forwarder_id: string
          id: string
          inserted_count: number
          parsed_count: number
          raw_snapshot: string | null
          source_id: string | null
          source_url: string
          started_at: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          countries?: string[]
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string
          forwarder_id: string
          id?: string
          inserted_count?: number
          parsed_count?: number
          raw_snapshot?: string | null
          source_id?: string | null
          source_url: string
          started_at?: string
          status: string
          triggered_by?: string | null
        }
        Update: {
          countries?: string[]
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string
          forwarder_id?: string
          id?: string
          inserted_count?: number
          parsed_count?: number
          raw_snapshot?: string | null
          source_id?: string | null
          source_url?: string
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jimscanner_rate_fetch_runs_forwarder_id_fkey"
            columns: ["forwarder_id"]
            isOneToOne: false
            referencedRelation: "forwarders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jimscanner_rate_fetch_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "jimscanner_forwarder_info_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      jimscanner_report_ip_blocklist: {
        Row: {
          blocked_at: string
          blocked_by: string | null
          ip: unknown
          reason: string | null
        }
        Insert: {
          blocked_at?: string
          blocked_by?: string | null
          ip: unknown
          reason?: string | null
        }
        Update: {
          blocked_at?: string
          blocked_by?: string | null
          ip?: unknown
          reason?: string | null
        }
        Relationships: []
      }
      jimscanner_reports: {
        Row: {
          admin_action_label: string | null
          admin_note: string | null
          correct_info: string | null
          created_at: string
          description: string
          diff_summary: string | null
          id: string
          reason_category: string
          reporter_email: string | null
          reporter_ip: unknown
          reporter_ua: string | null
          resolved_at: string | null
          resolved_by: string | null
          source_url: string | null
          status: string
          target_id: string | null
          target_slug: string | null
          target_type: string
          target_url: string
          updated_at: string
        }
        Insert: {
          admin_action_label?: string | null
          admin_note?: string | null
          correct_info?: string | null
          created_at?: string
          description: string
          diff_summary?: string | null
          id?: string
          reason_category: string
          reporter_email?: string | null
          reporter_ip: unknown
          reporter_ua?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_url?: string | null
          status?: string
          target_id?: string | null
          target_slug?: string | null
          target_type: string
          target_url: string
          updated_at?: string
        }
        Update: {
          admin_action_label?: string | null
          admin_note?: string | null
          correct_info?: string | null
          created_at?: string
          description?: string
          diff_summary?: string | null
          id?: string
          reason_category?: string
          reporter_email?: string | null
          reporter_ip?: unknown
          reporter_ua?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_url?: string | null
          status?: string
          target_id?: string | null
          target_slug?: string | null
          target_type?: string
          target_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      jimscanner_sale_events: {
        Row: {
          categories: string[]
          confidence: number | null
          country: string
          created_at: string
          created_by: string | null
          description: string | null
          end_at: string | null
          external_url: string | null
          id: string
          name: string
          priority: number
          recommended_forwarders: string[]
          related_blog_tags: string[]
          slug: string | null
          source: string
          source_url: string | null
          start_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          categories?: string[]
          confidence?: number | null
          country: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          external_url?: string | null
          id?: string
          name: string
          priority?: number
          recommended_forwarders?: string[]
          related_blog_tags?: string[]
          slug?: string | null
          source?: string
          source_url?: string | null
          start_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          categories?: string[]
          confidence?: number | null
          country?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          external_url?: string | null
          id?: string
          name?: string
          priority?: number
          recommended_forwarders?: string[]
          related_blog_tags?: string[]
          slug?: string | null
          source?: string
          source_url?: string | null
          start_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      jimscanner_shops: {
        Row: {
          affiliate_status: string
          affiliate_url_template: string | null
          categories: string[]
          cons: string[]
          country: string
          created_at: string | null
          created_by: string | null
          description: string | null
          external_url: string
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          logo_url: string | null
          name: string
          name_ko: string | null
          notes: string | null
          popularity_rank: number | null
          pros: string[]
          recommended_forwarder_slug: string | null
          shipping_to_korea: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          affiliate_status?: string
          affiliate_url_template?: string | null
          categories?: string[]
          cons?: string[]
          country: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          external_url: string
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          logo_url?: string | null
          name: string
          name_ko?: string | null
          notes?: string | null
          popularity_rank?: number | null
          pros?: string[]
          recommended_forwarder_slug?: string | null
          shipping_to_korea?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          affiliate_status?: string
          affiliate_url_template?: string | null
          categories?: string[]
          cons?: string[]
          country?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          external_url?: string
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          logo_url?: string | null
          name?: string
          name_ko?: string | null
          notes?: string | null
          popularity_rank?: number | null
          pros?: string[]
          recommended_forwarder_slug?: string | null
          shipping_to_korea?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      jimscanner_trends_aliases: {
        Row: {
          alias: string
          alias_type: string
          classified_by: string | null
          confidence: number
          created_at: string
          id: string
          product_id: string
          source: string | null
        }
        Insert: {
          alias: string
          alias_type: string
          classified_by?: string | null
          confidence?: number
          created_at?: string
          id?: string
          product_id: string
          source?: string | null
        }
        Update: {
          alias?: string
          alias_type?: string
          classified_by?: string | null
          confidence?: number
          created_at?: string
          id?: string
          product_id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jimscanner_trends_aliases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "jimscanner_trends_products"
            referencedColumns: ["id"]
          },
        ]
      }
      jimscanner_trends_heartbeat: {
        Row: {
          heartbeat_at: string
          hostname: string | null
          id: string
          last_collector: string | null
          last_run_status: string | null
          notes: string | null
        }
        Insert: {
          heartbeat_at?: string
          hostname?: string | null
          id?: string
          last_collector?: string | null
          last_run_status?: string | null
          notes?: string | null
        }
        Update: {
          heartbeat_at?: string
          hostname?: string | null
          id?: string
          last_collector?: string | null
          last_run_status?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      jimscanner_trends_keywords: {
        Row: {
          category: string | null
          category_top: string | null
          classified_category: string | null
          classified_intent: string | null
          collected_at: string
          domain_score: number | null
          id: string
          keyword: string
          notes: string | null
          pinned: boolean
          rank: number | null
          source: string
          volume_relative: number | null
        }
        Insert: {
          category?: string | null
          category_top?: string | null
          classified_category?: string | null
          classified_intent?: string | null
          collected_at?: string
          domain_score?: number | null
          id?: string
          keyword: string
          notes?: string | null
          pinned?: boolean
          rank?: number | null
          source: string
          volume_relative?: number | null
        }
        Update: {
          category?: string | null
          category_top?: string | null
          classified_category?: string | null
          classified_intent?: string | null
          collected_at?: string
          domain_score?: number | null
          id?: string
          keyword?: string
          notes?: string | null
          pinned?: boolean
          rank?: number | null
          source?: string
          volume_relative?: number | null
        }
        Relationships: []
      }
      jimscanner_trends_llm_calls: {
        Row: {
          day: string
          input_token_count: number
          last_call_at: string | null
          model: string
          notes: string | null
          output_token_count: number
          product_count: number
          request_count: number
        }
        Insert: {
          day?: string
          input_token_count?: number
          last_call_at?: string | null
          model?: string
          notes?: string | null
          output_token_count?: number
          product_count?: number
          request_count?: number
        }
        Update: {
          day?: string
          input_token_count?: number
          last_call_at?: string | null
          model?: string
          notes?: string | null
          output_token_count?: number
          product_count?: number
          request_count?: number
        }
        Relationships: []
      }
      jimscanner_trends_pins: {
        Row: {
          keyword: string
          notes: string | null
          pinned_at: string
          source: string
        }
        Insert: {
          keyword: string
          notes?: string | null
          pinned_at?: string
          source: string
        }
        Update: {
          keyword?: string
          notes?: string | null
          pinned_at?: string
          source?: string
        }
        Relationships: []
      }
      jimscanner_trends_products: {
        Row: {
          alias_count: number
          brand: string | null
          canonical_name: string
          category_mid: string | null
          category_top: string
          created_at: string
          description: string | null
          first_seen_at: string
          id: string
          intent_label: string | null
          last_seen_at: string
          llm_classified_at: string | null
          llm_model: string | null
          updated_at: string
        }
        Insert: {
          alias_count?: number
          brand?: string | null
          canonical_name: string
          category_mid?: string | null
          category_top: string
          created_at?: string
          description?: string | null
          first_seen_at?: string
          id?: string
          intent_label?: string | null
          last_seen_at?: string
          llm_classified_at?: string | null
          llm_model?: string | null
          updated_at?: string
        }
        Update: {
          alias_count?: number
          brand?: string | null
          canonical_name?: string
          category_mid?: string | null
          category_top?: string
          created_at?: string
          description?: string | null
          first_seen_at?: string
          id?: string
          intent_label?: string | null
          last_seen_at?: string
          llm_classified_at?: string | null
          llm_model?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      jimscanner_trends_raw: {
        Row: {
          collected_at: string
          id: string
          payload: Json
          request_label: string | null
          source: string
        }
        Insert: {
          collected_at?: string
          id?: string
          payload: Json
          request_label?: string | null
          source: string
        }
        Update: {
          collected_at?: string
          id?: string
          payload?: Json
          request_label?: string | null
          source?: string
        }
        Relationships: []
      }
      jimscanner_trends_runs: {
        Row: {
          duration_ms: number | null
          error_message: string | null
          fetched_count: number
          finished_at: string | null
          id: string
          inserted_count: number
          source: string
          started_at: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          duration_ms?: number | null
          error_message?: string | null
          fetched_count?: number
          finished_at?: string | null
          id?: string
          inserted_count?: number
          source: string
          started_at?: string
          status: string
          triggered_by?: string | null
        }
        Update: {
          duration_ms?: number | null
          error_message?: string | null
          fetched_count?: number
          finished_at?: string | null
          id?: string
          inserted_count?: number
          source?: string
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      jimscanner_trends_scores: {
        Row: {
          commerce_score: number
          competition_score: number
          computed_at: string
          final_score: number
          id: string
          product_id: string
          score_components: Json
          supplier_score: number
          trend_score: number
        }
        Insert: {
          commerce_score: number
          competition_score: number
          computed_at?: string
          final_score: number
          id?: string
          product_id: string
          score_components?: Json
          supplier_score: number
          trend_score: number
        }
        Update: {
          commerce_score?: number
          competition_score?: number
          computed_at?: string
          final_score?: number
          id?: string
          product_id?: string
          score_components?: Json
          supplier_score?: number
          trend_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "jimscanner_trends_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "jimscanner_trends_products"
            referencedColumns: ["id"]
          },
        ]
      }
      jimscanner_trends_seeds: {
        Row: {
          config: Json
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          kind: string
          label: string
          source: string
          updated_at: string
        }
        Insert: {
          config: Json
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          kind: string
          label: string
          source: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          kind?: string
          label?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      jimscanner_trends_supplier: {
        Row: {
          collected_at: string
          id: string
          inventory_status: string | null
          lead_time_days: number | null
          moq: number | null
          price_currency: string
          price_krw: number | null
          price_original: number | null
          product_id: string
          raw_payload: Json | null
          supplier_product_id: string | null
          supplier_source: string
          supplier_url: string | null
          title: string | null
          url_image: string | null
        }
        Insert: {
          collected_at?: string
          id?: string
          inventory_status?: string | null
          lead_time_days?: number | null
          moq?: number | null
          price_currency?: string
          price_krw?: number | null
          price_original?: number | null
          product_id: string
          raw_payload?: Json | null
          supplier_product_id?: string | null
          supplier_source: string
          supplier_url?: string | null
          title?: string | null
          url_image?: string | null
        }
        Update: {
          collected_at?: string
          id?: string
          inventory_status?: string | null
          lead_time_days?: number | null
          moq?: number | null
          price_currency?: string
          price_krw?: number | null
          price_original?: number | null
          product_id?: string
          raw_payload?: Json | null
          supplier_product_id?: string | null
          supplier_source?: string
          supplier_url?: string | null
          title?: string | null
          url_image?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jimscanner_trends_supplier_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "jimscanner_trends_products"
            referencedColumns: ["id"]
          },
        ]
      }
      member_grade_definitions: {
        Row: {
          description: string | null
          discount_percent: number | null
          forwarder_id: string | null
          grade_level: number
          grade_name: string
          id: string
          min_shipments: number | null
        }
        Insert: {
          description?: string | null
          discount_percent?: number | null
          forwarder_id?: string | null
          grade_level: number
          grade_name: string
          id?: string
          min_shipments?: number | null
        }
        Update: {
          description?: string | null
          discount_percent?: number | null
          forwarder_id?: string | null
          grade_level?: number
          grade_name?: string
          id?: string
          min_shipments?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "member_grade_definitions_forwarder_id_fkey"
            columns: ["forwarder_id"]
            isOneToOne: false
            referencedRelation: "forwarders"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_agency_address_info: {
        Row: {
          address_info_seq: number
          address_name: string
          address_value: string
          agency_seq: number
          index: number
          warehouse_info_seq: number
        }
        Insert: {
          address_info_seq?: number
          address_name: string
          address_value: string
          agency_seq: number
          index: number
          warehouse_info_seq: number
        }
        Update: {
          address_info_seq?: number
          address_name?: string
          address_value?: string
          agency_seq?: number
          index?: number
          warehouse_info_seq?: number
        }
        Relationships: []
      }
      shipping_agency_costs_info: {
        Row: {
          agency_seq: number
          amount: number
          city_code: string
          costs_info_seq: number
          country_code: string
          currency: string
          grade_info_seq: number
          unit: string
          warehouse_info_seq: number
          weight: number
        }
        Insert: {
          agency_seq: number
          amount: number
          city_code: string
          costs_info_seq?: number
          country_code: string
          currency: string
          grade_info_seq: number
          unit: string
          warehouse_info_seq: number
          weight: number
        }
        Update: {
          agency_seq?: number
          amount?: number
          city_code?: string
          costs_info_seq?: number
          country_code?: string
          currency?: string
          grade_info_seq?: number
          unit?: string
          warehouse_info_seq?: number
          weight?: number
        }
        Relationships: []
      }
      shipping_agency_info: {
        Row: {
          agency_image: string | null
          agency_seq: number
          created_at: string
          domain: string
          email: string | null
          phone: string | null
          sns: string | null
          user_name: string
        }
        Insert: {
          agency_image?: string | null
          agency_seq?: number
          created_at?: string
          domain: string
          email?: string | null
          phone?: string | null
          sns?: string | null
          user_name: string
        }
        Update: {
          agency_image?: string | null
          agency_seq?: number
          created_at?: string
          domain?: string
          email?: string | null
          phone?: string | null
          sns?: string | null
          user_name?: string
        }
        Relationships: []
      }
      shipping_agency_member_grade_info: {
        Row: {
          agency_seq: number
          grade_benefit: string | null
          grade_info_seq: number
          grade_level: string | null
          grade_name: string
        }
        Insert: {
          agency_seq: number
          grade_benefit?: string | null
          grade_info_seq?: number
          grade_level?: string | null
          grade_name: string
        }
        Update: {
          agency_seq?: number
          grade_benefit?: string | null
          grade_info_seq?: number
          grade_level?: string | null
          grade_name?: string
        }
        Relationships: []
      }
      shipping_rates: {
        Row: {
          center_name: string | null
          country: string
          forwarder_id: string | null
          grade_level: number
          id: string
          member_grade: string
          price_cny: number | null
          price_eur: number | null
          price_jpy: number | null
          price_krw: number | null
          price_usd: number | null
          service_label: string | null
          shipping_type: string | null
          source: string | null
          updated_at: string | null
          weight_max: number
          weight_min: number
          weight_unit: string | null
        }
        Insert: {
          center_name?: string | null
          country: string
          forwarder_id?: string | null
          grade_level?: number
          id?: string
          member_grade?: string
          price_cny?: number | null
          price_eur?: number | null
          price_jpy?: number | null
          price_krw?: number | null
          price_usd?: number | null
          service_label?: string | null
          shipping_type?: string | null
          source?: string | null
          updated_at?: string | null
          weight_max: number
          weight_min: number
          weight_unit?: string | null
        }
        Update: {
          center_name?: string | null
          country?: string
          forwarder_id?: string | null
          grade_level?: number
          id?: string
          member_grade?: string
          price_cny?: number | null
          price_eur?: number | null
          price_jpy?: number | null
          price_krw?: number | null
          price_usd?: number | null
          service_label?: string | null
          shipping_type?: string | null
          source?: string | null
          updated_at?: string | null
          weight_max?: number
          weight_min?: number
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_rates_forwarder_id_fkey"
            columns: ["forwarder_id"]
            isOneToOne: false
            referencedRelation: "forwarders"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_service_fee_info: {
        Row: {
          agency_seq: number | null
          fee_amount: string | null
          fee_detail: string | null
          fee_info_seq: number
          fee_name: string
          user_name: string
        }
        Insert: {
          agency_seq?: number | null
          fee_amount?: string | null
          fee_detail?: string | null
          fee_info_seq?: number
          fee_name: string
          user_name: string
        }
        Update: {
          agency_seq?: number | null
          fee_amount?: string | null
          fee_detail?: string | null
          fee_info_seq?: number
          fee_name?: string
          user_name?: string
        }
        Relationships: []
      }
      shipping_warehouse_info: {
        Row: {
          agency_seq: number | null
          city_code: string
          combined_shipping_fee: string | null
          country_code: string
          country_name: string
          customs_office: string | null
          free_storage_days: string | null
          general_customs_fee: string | null
          inspection_fee: string | null
          return_shipping_fee: string | null
          special_packaging_fee: string | null
          warehouse_info_seq: number
        }
        Insert: {
          agency_seq?: number | null
          city_code: string
          combined_shipping_fee?: string | null
          country_code: string
          country_name: string
          customs_office?: string | null
          free_storage_days?: string | null
          general_customs_fee?: string | null
          inspection_fee?: string | null
          return_shipping_fee?: string | null
          special_packaging_fee?: string | null
          warehouse_info_seq: number
        }
        Update: {
          agency_seq?: number | null
          city_code?: string
          combined_shipping_fee?: string | null
          country_code?: string
          country_name?: string
          customs_office?: string | null
          free_storage_days?: string | null
          general_customs_fee?: string | null
          inspection_fee?: string | null
          return_shipping_fee?: string | null
          special_packaging_fee?: string | null
          warehouse_info_seq?: number
        }
        Relationships: []
      }
      tbl_admin_user: {
        Row: {
          company_name: string | null
          created_at: string
          id: number
          is_active: boolean
          is_superuser: boolean
          login_id: string
          password: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          id?: number
          is_active?: boolean
          is_superuser?: boolean
          login_id: string
          password: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          id?: number
          is_active?: boolean
          is_superuser?: boolean
          login_id?: string
          password?: string
        }
        Relationships: []
      }
      tbl_center: {
        Row: {
          active: string | null
          center_code: string | null
          center_name: string | null
          created_at: string
          creator: string | null
          currency: string | null
          id: number
          purchase_commission_rate: number | null
          reg_status: string | null
          volume_weight_divisor: number | null
          volume_weight_unit: string | null
          weight_unit: string | null
        }
        Insert: {
          active?: string | null
          center_code?: string | null
          center_name?: string | null
          created_at?: string
          creator?: string | null
          currency?: string | null
          id?: number
          purchase_commission_rate?: number | null
          reg_status?: string | null
          volume_weight_divisor?: number | null
          volume_weight_unit?: string | null
          weight_unit?: string | null
        }
        Update: {
          active?: string | null
          center_code?: string | null
          center_name?: string | null
          created_at?: string
          creator?: string | null
          currency?: string | null
          id?: number
          purchase_commission_rate?: number | null
          reg_status?: string | null
          volume_weight_divisor?: number | null
          volume_weight_unit?: string | null
          weight_unit?: string | null
        }
        Relationships: []
      }
      tbl_cookie: {
        Row: {
          cookie: string | null
          created_at: string
          id: number
          site: string | null
        }
        Insert: {
          cookie?: string | null
          created_at?: string
          id?: number
          site?: string | null
        }
        Update: {
          cookie?: string | null
          created_at?: string
          id?: number
          site?: string | null
        }
        Relationships: []
      }
      tbl_member: {
        Row: {
          address: string | null
          created_at: string
          deposit: number | null
          email: string | null
          id: number
          last_login_date: string | null
          level: string | null
          member_id: string | null
          member_name: string | null
          member_no: number | null
          mobile: string | null
          order_count: number | null
          point: number | null
          post_code: string | null
          reg_date: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          deposit?: number | null
          email?: string | null
          id?: number
          last_login_date?: string | null
          level?: string | null
          member_id?: string | null
          member_name?: string | null
          member_no?: number | null
          mobile?: string | null
          order_count?: number | null
          point?: number | null
          post_code?: string | null
          reg_date?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          deposit?: number | null
          email?: string | null
          id?: number
          last_login_date?: string | null
          level?: string | null
          member_id?: string | null
          member_name?: string | null
          member_no?: number | null
          mobile?: string | null
          order_count?: number | null
          point?: number | null
          post_code?: string | null
          reg_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tbl_order: {
        Row: {
          applied_exchange_rate: string | null
          box_count: string | null
          center: string | null
          coupon_history: string | null
          created_at: string
          custom_type: string | null
          customs_declaration_number: string | null
          delete_option: string | null
          global_delivery_fee: number | null
          global_delivery_fee_currency: string | null
          global_delivery_fee_discount: number | null
          global_tracking_log: string | null
          global_tracking_no: string | null
          global_tracking_url: string | null
          id: number
          no_data_amount: number | null
          no_data_currency: string | null
          option: string | null
          order_detail_url: string | null
          order_no: string | null
          order_status: string | null
          orderer_grade: string | null
          orderer_name: string | null
          payment_amount: number | null
          payment_amount_currency: string | null
          payment_weight: number | null
          payment_weight_symbol: string | null
          post_code: string | null
          receiver_address: string | null
          receiver_name: string | null
          receiver_phone_number: string | null
          request_date: string | null
          request_message: string | null
          shipping_company: string | null
          shipping_weight: number | null
          shipping_weight_symbol: string | null
          status_json: Json | null
          status_log: string | null
          storage_period: string | null
          total_declared_amount: number | null
          total_declared_currency: string | null
          updated_at: string | null
        }
        Insert: {
          applied_exchange_rate?: string | null
          box_count?: string | null
          center?: string | null
          coupon_history?: string | null
          created_at?: string
          custom_type?: string | null
          customs_declaration_number?: string | null
          delete_option?: string | null
          global_delivery_fee?: number | null
          global_delivery_fee_currency?: string | null
          global_delivery_fee_discount?: number | null
          global_tracking_log?: string | null
          global_tracking_no?: string | null
          global_tracking_url?: string | null
          id?: number
          no_data_amount?: number | null
          no_data_currency?: string | null
          option?: string | null
          order_detail_url?: string | null
          order_no?: string | null
          order_status?: string | null
          orderer_grade?: string | null
          orderer_name?: string | null
          payment_amount?: number | null
          payment_amount_currency?: string | null
          payment_weight?: number | null
          payment_weight_symbol?: string | null
          post_code?: string | null
          receiver_address?: string | null
          receiver_name?: string | null
          receiver_phone_number?: string | null
          request_date?: string | null
          request_message?: string | null
          shipping_company?: string | null
          shipping_weight?: number | null
          shipping_weight_symbol?: string | null
          status_json?: Json | null
          status_log?: string | null
          storage_period?: string | null
          total_declared_amount?: number | null
          total_declared_currency?: string | null
          updated_at?: string | null
        }
        Update: {
          applied_exchange_rate?: string | null
          box_count?: string | null
          center?: string | null
          coupon_history?: string | null
          created_at?: string
          custom_type?: string | null
          customs_declaration_number?: string | null
          delete_option?: string | null
          global_delivery_fee?: number | null
          global_delivery_fee_currency?: string | null
          global_delivery_fee_discount?: number | null
          global_tracking_log?: string | null
          global_tracking_no?: string | null
          global_tracking_url?: string | null
          id?: number
          no_data_amount?: number | null
          no_data_currency?: string | null
          option?: string | null
          order_detail_url?: string | null
          order_no?: string | null
          order_status?: string | null
          orderer_grade?: string | null
          orderer_name?: string | null
          payment_amount?: number | null
          payment_amount_currency?: string | null
          payment_weight?: number | null
          payment_weight_symbol?: string | null
          post_code?: string | null
          receiver_address?: string | null
          receiver_name?: string | null
          receiver_phone_number?: string | null
          request_date?: string | null
          request_message?: string | null
          shipping_company?: string | null
          shipping_weight?: number | null
          shipping_weight_symbol?: string | null
          status_json?: Json | null
          status_log?: string | null
          storage_period?: string | null
          total_declared_amount?: number | null
          total_declared_currency?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tbl_order_item: {
        Row: {
          arrival_company: string | null
          arrival_date: string | null
          brand: string | null
          center: string | null
          color: string | null
          created_at: string
          id: number
          image_url: string | null
          item_no: string | null
          item_status: string | null
          local_order_no: string | null
          local_shipping_amount: number | null
          local_shipping_amount_currency: string | null
          local_tracking_no: string | null
          order_no: string | null
          product_amount: number | null
          product_amount_currency: string | null
          product_category: string | null
          product_name: string | null
          product_url: string | null
          quantity: number | null
          size: string | null
          updated_at: string | null
        }
        Insert: {
          arrival_company?: string | null
          arrival_date?: string | null
          brand?: string | null
          center?: string | null
          color?: string | null
          created_at?: string
          id?: number
          image_url?: string | null
          item_no?: string | null
          item_status?: string | null
          local_order_no?: string | null
          local_shipping_amount?: number | null
          local_shipping_amount_currency?: string | null
          local_tracking_no?: string | null
          order_no?: string | null
          product_amount?: number | null
          product_amount_currency?: string | null
          product_category?: string | null
          product_name?: string | null
          product_url?: string | null
          quantity?: number | null
          size?: string | null
          updated_at?: string | null
        }
        Update: {
          arrival_company?: string | null
          arrival_date?: string | null
          brand?: string | null
          center?: string | null
          color?: string | null
          created_at?: string
          id?: number
          image_url?: string | null
          item_no?: string | null
          item_status?: string | null
          local_order_no?: string | null
          local_shipping_amount?: number | null
          local_shipping_amount_currency?: string | null
          local_tracking_no?: string | null
          order_no?: string | null
          product_amount?: number | null
          product_amount_currency?: string | null
          product_category?: string | null
          product_name?: string | null
          product_url?: string | null
          quantity?: number | null
          size?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tbl_ship_weight_list: {
        Row: {
          center_code: string | null
          created_at: string
          currency: string | null
          id: number
          max_weight: string | null
          min_weight: string | null
          seq: number | null
          shipping_fee: number | null
          weight_unit: string | null
        }
        Insert: {
          center_code?: string | null
          created_at?: string
          currency?: string | null
          id?: number
          max_weight?: string | null
          min_weight?: string | null
          seq?: number | null
          shipping_fee?: number | null
          weight_unit?: string | null
        }
        Update: {
          center_code?: string | null
          created_at?: string
          currency?: string | null
          id?: number
          max_weight?: string | null
          min_weight?: string | null
          seq?: number | null
          shipping_fee?: number | null
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tbl_ship_weight_center_code_fkey"
            columns: ["center_code"]
            isOneToOne: false
            referencedRelation: "tbl_center"
            referencedColumns: ["center_code"]
          },
        ]
      }
      tbl_ship_weight_set: {
        Row: {
          center_code: string | null
          created_at: string
          currency: string | null
          id: number
          per_shipping_fee: number | null
          per_weight: number | null
          seq: number | null
          upper_weight: number | null
          weight_uinit: string | null
        }
        Insert: {
          center_code?: string | null
          created_at?: string
          currency?: string | null
          id?: number
          per_shipping_fee?: number | null
          per_weight?: number | null
          seq?: number | null
          upper_weight?: number | null
          weight_uinit?: string | null
        }
        Update: {
          center_code?: string | null
          created_at?: string
          currency?: string | null
          id?: number
          per_shipping_fee?: number | null
          per_weight?: number | null
          seq?: number | null
          upper_weight?: number | null
          weight_uinit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tbl_ship_weight_set_center_code_fkey"
            columns: ["center_code"]
            isOneToOne: false
            referencedRelation: "tbl_center"
            referencedColumns: ["center_code"]
          },
        ]
      }
      tmp_page_counter: {
        Row: {
          collect_page: number | null
          created_at: string
          id: number
        }
        Insert: {
          collect_page?: number | null
          created_at?: string
          id?: number
        }
        Update: {
          collect_page?: number | null
          created_at?: string
          id?: number
        }
        Relationships: []
      }
    }
    Views: {
      forwarder_min_rates: {
        Row: {
          country: string | null
          forwarder_id: string | null
          min_price_krw: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_rates_forwarder_id_fkey"
            columns: ["forwarder_id"]
            isOneToOne: false
            referencedRelation: "forwarders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      b2b_compute_seller_health_snapshot: {
        Args: { p_date?: string }
        Returns: {
          out_processed: number
          out_snapshot_date: string
        }[]
      }
      b2b_marketwide_supplier_stats: {
        Args: { p_min_lines?: number }
        Returns: {
          avg_qty: number
          avg_sale_krw: number
          line_count: number
          median_sale_krw: number
          supplier_site: string
        }[]
      }
      b2b_reset_monthly_quotas: {
        Args: never
        Returns: {
          reset_count: number
        }[]
      }
      jimscanner_ggsan_recommend: {
        Args: {
          days_window?: number
          min_score?: number
          min_sim?: number
          result_limit?: number
        }
        Returns: {
          cate_cd: string
          cate_label: string
          detail_url: string
          final_score: number
          ggsan_last_seen: string
          goods_no: string
          image_url: string
          imminent_bonus: number
          is_imminent: boolean
          price_krw: number
          raw_score: number
          search_match_count: number
          search_score: number
          search_sources: string[]
          search_top_keyword: string
          title: string
          tv_match_count: number
          tv_score: number
          tv_top_keyword: string
          tv_total_pushes: number
        }[]
      }
      jimscanner_recompute_forwarder_review_summary: {
        Args: { p_country: string; p_forwarder_id: string }
        Returns: undefined
      }
      jimscanner_tv_ggsan_match: {
        Args: {
          days_window?: number
          min_sim?: number
          per_keyword_limit?: number
          result_limit?: number
        }
        Returns: {
          cate_cd: string
          cate_label: string
          detail_url: string
          ggsan_last_seen: string
          ggsan_title: string
          goods_no: string
          image_url: string
          is_imminent: boolean
          keyword: string
          price_krw: number
          sim: number
          tv_count: number
          tv_first_seen: string
          tv_last_seen: string
        }[]
      }
      recompute_category_weights: { Args: never; Returns: number }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
