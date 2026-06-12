// Hand-maintained Supabase schema types for Phase A tables.
// Extend alongside each SQL migration (Phase B adds the business tables).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrgRole = "owner" | "admin" | "member";
export type InviteRole = "admin" | "member";

export type ActivityEntityType =
  | "client"
  | "engagement"
  | "deliverable"
  | "invoice"
  | "article"
  | "metric"
  | "member"
  | "service"
  | "lead";

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "converted"
  | "lost";

export type ActivityAction =
  | "created"
  | "updated"
  | "status_changed"
  | "paid"
  | "published"
  | "delivered"
  | "deleted"
  | "invited";

export type ClientType = "client" | "supplier" | "both";

export type EngagementStatus =
  | "proposal"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export type FinancialMode = "auto" | "manual" | "performance";

export type PricingModel =
  | "fixed"
  | "retainer"
  | "cpl"
  | "cpa"
  | "cpc"
  | "rev_share";

export type DeliverableType =
  | "article"
  | "audit_report"
  | "website"
  | "dashboard_report"
  | "video"
  | "creative"
  | "landing_page"
  | "other";

export type DeliverableStatus =
  | "planned"
  | "in_progress"
  | "review"
  | "delivered"
  | "published";

export type ArticleStatus = "idea" | "draft" | "review" | "published";

export type InvoiceDirection = "outbound" | "inbound";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          plan: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          plan?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          plan?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          email?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: OrgRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: OrgRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: OrgRole;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      invites: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: InviteRole;
          token: string;
          invited_by: string | null;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email: string;
          role?: InviteRole;
          token?: string;
          invited_by?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          email?: string;
          role?: InviteRole;
          token?: string;
          invited_by?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invites_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invites_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_log: {
        Row: {
          id: string;
          organization_id: string;
          actor_user_id: string | null;
          entity_type: ActivityEntityType;
          entity_id: string | null;
          entity_label: string;
          action: ActivityAction;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          actor_user_id?: string | null;
          entity_type: ActivityEntityType;
          entity_id?: string | null;
          entity_label?: string;
          action: ActivityAction;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          actor_user_id?: string | null;
          entity_type?: ActivityEntityType;
          entity_id?: string | null;
          entity_label?: string;
          action?: ActivityAction;
          details?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_log_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          color: string;
          description: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          slug: string;
          color?: string;
          description?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          slug?: string;
          color?: string;
          description?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "services_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          company_name: string;
          email: string;
          phone: string;
          default_currency: string;
          notes: string;
          type: ClientType;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          company_name?: string;
          email?: string;
          phone?: string;
          default_currency?: string;
          notes?: string;
          type?: ClientType;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          company_name?: string;
          email?: string;
          phone?: string;
          default_currency?: string;
          notes?: string;
          type?: ClientType;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      engagements: {
        Row: {
          id: string;
          organization_id: string;
          client_id: string;
          service_id: string;
          name: string;
          status: EngagementStatus;
          start_date: string | null;
          end_date: string | null;
          budget_amount: number | null;
          budget_currency: string;
          financial_mode: FinancialMode;
          manual_revenue: number | null;
          manual_cost: number | null;
          pricing_model: PricingModel;
          unit_rate: number | null;
          rev_share_percent: number | null;
          supplier_id: string | null;
          payout_percent: number | null;
          notes: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          client_id: string;
          service_id: string;
          name: string;
          status?: EngagementStatus;
          start_date?: string | null;
          end_date?: string | null;
          budget_amount?: number | null;
          budget_currency?: string;
          financial_mode?: FinancialMode;
          manual_revenue?: number | null;
          manual_cost?: number | null;
          pricing_model?: PricingModel;
          unit_rate?: number | null;
          rev_share_percent?: number | null;
          supplier_id?: string | null;
          payout_percent?: number | null;
          notes?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          client_id?: string;
          service_id?: string;
          name?: string;
          status?: EngagementStatus;
          start_date?: string | null;
          end_date?: string | null;
          budget_amount?: number | null;
          budget_currency?: string;
          financial_mode?: FinancialMode;
          manual_revenue?: number | null;
          manual_cost?: number | null;
          pricing_model?: PricingModel;
          unit_rate?: number | null;
          rev_share_percent?: number | null;
          supplier_id?: string | null;
          payout_percent?: number | null;
          notes?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "engagements_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "engagements_client_id_organization_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "engagements_supplier_fk";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "engagements_service_id_organization_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      engagement_metrics: {
        Row: {
          id: string;
          organization_id: string;
          engagement_id: string;
          period_start: string;
          period_end: string;
          spend: number | null;
          impressions: number | null;
          clicks: number | null;
          leads: number | null;
          approved_leads: number | null;
          conversions: number | null;
          sessions: number | null;
          organic_traffic: number | null;
          revenue_generated: number | null;
          notes: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          engagement_id: string;
          period_start: string;
          period_end: string;
          spend?: number | null;
          impressions?: number | null;
          clicks?: number | null;
          leads?: number | null;
          approved_leads?: number | null;
          conversions?: number | null;
          sessions?: number | null;
          organic_traffic?: number | null;
          revenue_generated?: number | null;
          notes?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          engagement_id?: string;
          period_start?: string;
          period_end?: string;
          spend?: number | null;
          impressions?: number | null;
          clicks?: number | null;
          leads?: number | null;
          approved_leads?: number | null;
          conversions?: number | null;
          sessions?: number | null;
          organic_traffic?: number | null;
          revenue_generated?: number | null;
          notes?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "engagement_metrics_engagement_id_organization_id_fkey";
            columns: ["engagement_id"];
            isOneToOne: false;
            referencedRelation: "engagements";
            referencedColumns: ["id"];
          },
        ];
      };
      deliverables: {
        Row: {
          id: string;
          organization_id: string;
          engagement_id: string;
          type: DeliverableType;
          title: string;
          status: DeliverableStatus;
          due_date: string | null;
          delivered_at: string | null;
          url: string | null;
          notes: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          engagement_id: string;
          type: DeliverableType;
          title: string;
          status?: DeliverableStatus;
          due_date?: string | null;
          delivered_at?: string | null;
          url?: string | null;
          notes?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          engagement_id?: string;
          type?: DeliverableType;
          title?: string;
          status?: DeliverableStatus;
          due_date?: string | null;
          delivered_at?: string | null;
          url?: string | null;
          notes?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deliverables_engagement_id_organization_id_fkey";
            columns: ["engagement_id"];
            isOneToOne: false;
            referencedRelation: "engagements";
            referencedColumns: ["id"];
          },
        ];
      };
      seo_articles: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          slug: string;
          engagement_id: string | null;
          client_id: string | null;
          target_keywords: string[];
          status: ArticleStatus;
          published_url: string;
          published_at: string | null;
          word_count: number;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          slug?: string;
          engagement_id?: string | null;
          client_id?: string | null;
          target_keywords?: string[];
          status?: ArticleStatus;
          published_url?: string;
          published_at?: string | null;
          word_count?: number;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          title?: string;
          slug?: string;
          engagement_id?: string | null;
          client_id?: string | null;
          target_keywords?: string[];
          status?: ArticleStatus;
          published_url?: string;
          published_at?: string | null;
          word_count?: number;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seo_articles_engagement_id_organization_id_fkey";
            columns: ["engagement_id"];
            isOneToOne: false;
            referencedRelation: "engagements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seo_articles_client_id_organization_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          id: string;
          organization_id: string;
          number: string;
          direction: InvoiceDirection;
          client_id: string;
          engagement_id: string | null;
          issue_date: string;
          due_date: string | null;
          currency: string;
          status: InvoiceStatus;
          notes: string;
          subtotal: number;
          tax_amount: number;
          total: number;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          number: string;
          direction: InvoiceDirection;
          client_id: string;
          engagement_id?: string | null;
          issue_date?: string;
          due_date?: string | null;
          currency?: string;
          status?: InvoiceStatus;
          notes?: string;
          subtotal?: number;
          tax_amount?: number;
          total?: number;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          number?: string;
          direction?: InvoiceDirection;
          client_id?: string;
          engagement_id?: string | null;
          issue_date?: string;
          due_date?: string | null;
          currency?: string;
          status?: InvoiceStatus;
          notes?: string;
          subtotal?: number;
          tax_amount?: number;
          total?: number;
          paid_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_organization_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_engagement_id_organization_id_fkey";
            columns: ["engagement_id"];
            isOneToOne: false;
            referencedRelation: "engagements";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_items: {
        Row: {
          id: string;
          organization_id: string;
          invoice_id: string;
          description: string;
          quantity: number;
          unit_price: number;
          line_total: number;
          sort_order: number;
        };
        Insert: {
          id?: string;
          organization_id: string;
          invoice_id: string;
          description?: string;
          quantity?: number;
          unit_price?: number;
          line_total?: number;
          sort_order?: number;
        };
        Update: {
          id?: string;
          organization_id?: string;
          invoice_id?: string;
          description?: string;
          quantity?: number;
          unit_price?: number;
          line_total?: number;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_organization_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          email: string;
          phone: string;
          message: string;
          status: LeadStatus;
          source: string;
          utm_source: string;
          utm_medium: string;
          utm_campaign: string;
          utm_term: string;
          utm_content: string;
          referrer: string;
          landing_page: string;
          visitor_id: string;
          client_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          email: string;
          phone?: string;
          message?: string;
          status?: LeadStatus;
          source?: string;
          utm_source?: string;
          utm_medium?: string;
          utm_campaign?: string;
          utm_term?: string;
          utm_content?: string;
          referrer?: string;
          landing_page?: string;
          visitor_id?: string;
          client_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          email?: string;
          phone?: string;
          message?: string;
          status?: LeadStatus;
          source?: string;
          utm_source?: string;
          utm_medium?: string;
          utm_campaign?: string;
          utm_term?: string;
          utm_content?: string;
          referrer?: string;
          landing_page?: string;
          visitor_id?: string;
          client_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_client_id_organization_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      site_visits: {
        Row: {
          id: string;
          organization_id: string;
          visitor_id: string;
          path: string;
          referrer: string;
          utm_source: string;
          utm_medium: string;
          utm_campaign: string;
          utm_term: string;
          utm_content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          visitor_id?: string;
          path?: string;
          referrer?: string;
          utm_source?: string;
          utm_medium?: string;
          utm_campaign?: string;
          utm_term?: string;
          utm_content?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          visitor_id?: string;
          path?: string;
          referrer?: string;
          utm_source?: string;
          utm_medium?: string;
          utm_campaign?: string;
          utm_term?: string;
          utm_content?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_organization: {
        Args: { org_name: string };
        Returns: string;
      };
      accept_invite: {
        Args: { invite_token: string };
        Returns: string;
      };
      get_invite_details: {
        Args: { invite_token: string };
        Returns: {
          organization_name: string;
          email: string;
          role: string;
          is_expired: boolean;
          is_accepted: boolean;
        }[];
      };
      is_org_member: {
        Args: { org: string };
        Returns: boolean;
      };
      is_org_admin: {
        Args: { org: string };
        Returns: boolean;
      };
      org_role: {
        Args: { org: string };
        Returns: string;
      };
      shares_org: {
        Args: { target: string };
        Returns: boolean;
      };
      next_invoice_number: {
        Args: { org: string };
        Returns: string;
      };
      seed_default_services: {
        Args: { org: string };
        Returns: undefined;
      };
      track_visit: {
        Args: {
          org_slug: string;
          visitor: string;
          page_path: string;
          page_referrer: string;
          utm_source?: string;
          utm_medium?: string;
          utm_campaign?: string;
          utm_term?: string;
          utm_content?: string;
        };
        Returns: undefined;
      };
      submit_lead: {
        Args: {
          org_slug: string;
          lead_name: string;
          lead_email: string;
          lead_phone?: string;
          lead_message?: string;
          visitor?: string;
          landing?: string;
          page_referrer?: string;
          utm_source?: string;
          utm_medium?: string;
          utm_campaign?: string;
          utm_term?: string;
          utm_content?: string;
          lead_source?: string;
        };
        Returns: string;
      };
      get_public_articles: {
        Args: { org_slug: string };
        Returns: {
          id: string;
          title: string;
          slug: string;
          excerpt: string;
          published_at: string | null;
          word_count: number;
        }[];
      };
      get_public_article: {
        Args: { org_slug: string; article_slug: string };
        Returns: {
          id: string;
          title: string;
          slug: string;
          content: string;
          published_at: string | null;
          word_count: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Membership = Database["public"]["Tables"]["memberships"]["Row"];
export type Invite = Database["public"]["Tables"]["invites"]["Row"];
export type ActivityLogEntry = Database["public"]["Tables"]["activity_log"]["Row"];
export type Service = Database["public"]["Tables"]["services"]["Row"];
export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type Engagement = Database["public"]["Tables"]["engagements"]["Row"];
export type EngagementMetric =
  Database["public"]["Tables"]["engagement_metrics"]["Row"];
export type Deliverable = Database["public"]["Tables"]["deliverables"]["Row"];
export type SeoArticle = Database["public"]["Tables"]["seo_articles"]["Row"];
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type SiteVisit = Database["public"]["Tables"]["site_visits"]["Row"];
export type InvoiceItem = Database["public"]["Tables"]["invoice_items"]["Row"];
