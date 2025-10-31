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
      dashboard_reports: {
        Row: {
          created_at: string
          dashboard_id: string
          id: string
          position: number
          report_id: string
        }
        Insert: {
          created_at?: string
          dashboard_id: string
          id?: string
          position?: number
          report_id: string
        }
        Update: {
          created_at?: string
          dashboard_id?: string
          id?: string
          position?: number
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_reports_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_reports_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "saved_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboards_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          team_id: string | null
          team_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          team_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          team_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_reports: {
        Row: {
          charts_config: Json
          created_at: string
          id: string
          name: string
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          charts_config?: Json
          created_at?: string
          id?: string
          name: string
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          charts_config?: Json
          created_at?: string
          id?: string
          name?: string
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          available_metrics: Json | null
          car_info: string | null
          created_at: string
          date: string | null
          driver_name: string | null
          id: string
          name: string
          session_type: string
          team_id: string | null
          track_name: string | null
          updated_at: string
          user_id: string
          weather_conditions: string | null
        }
        Insert: {
          available_metrics?: Json | null
          car_info?: string | null
          created_at?: string
          date?: string | null
          driver_name?: string | null
          id?: string
          name: string
          session_type: string
          team_id?: string | null
          track_name?: string | null
          updated_at?: string
          user_id: string
          weather_conditions?: string | null
        }
        Update: {
          available_metrics?: Json | null
          car_info?: string | null
          created_at?: string
          date?: string | null
          driver_name?: string | null
          id?: string
          name?: string
          session_type?: string
          team_id?: string | null
          track_name?: string | null
          updated_at?: string
          user_id?: string
          weather_conditions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      telemetry_data: {
        Row: {
          airbox_temperature: number | null
          bat_volts_dash: number | null
          bat_volts_ecu: number | null
          boost_pressure: number | null
          comms_rs232_2_diag: number | null
          coolant_temperature: number | null
          cpu_usage: number | null
          created_at: string
          dash_temp: number | null
          device_up_time: number | null
          drive_speed: number | null
          engine_oil_pressure: number | null
          engine_oil_temperature: number | null
          engine_speed: number | null
          file_id: string
          fuel_inj_primary_duty_cycle: number | null
          fuel_pressure_sensor: number | null
          fuel_temperature: number | null
          fuel_used_m1: number | null
          g_force_lat: number | null
          g_force_long: number | null
          g_force_vert: number | null
          gear: number | null
          gear_detect_value: number | null
          gps_altitude: number | null
          gps_date: string | null
          gps_heading: number | null
          gps_latitude: number | null
          gps_longitude: number | null
          gps_sats_used: number | null
          gps_speed: number | null
          gps_time: string | null
          ground_speed: number | null
          id: string
          ignition_timing: number | null
          inlet_air_temperature: number | null
          inlet_manifold_pressure: number | null
          lap_distance: number | null
          lap_gain_loss_running: number | null
          lap_number: number | null
          lap_time: number | null
          lap_time_predicted: number | null
          reference_lap_time: number | null
          running_lap_time: number | null
          session_id: string
          throttle_pedal: number | null
          throttle_position: number | null
          time: number | null
          trip_distance: number | null
        }
        Insert: {
          airbox_temperature?: number | null
          bat_volts_dash?: number | null
          bat_volts_ecu?: number | null
          boost_pressure?: number | null
          comms_rs232_2_diag?: number | null
          coolant_temperature?: number | null
          cpu_usage?: number | null
          created_at?: string
          dash_temp?: number | null
          device_up_time?: number | null
          drive_speed?: number | null
          engine_oil_pressure?: number | null
          engine_oil_temperature?: number | null
          engine_speed?: number | null
          file_id: string
          fuel_inj_primary_duty_cycle?: number | null
          fuel_pressure_sensor?: number | null
          fuel_temperature?: number | null
          fuel_used_m1?: number | null
          g_force_lat?: number | null
          g_force_long?: number | null
          g_force_vert?: number | null
          gear?: number | null
          gear_detect_value?: number | null
          gps_altitude?: number | null
          gps_date?: string | null
          gps_heading?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_sats_used?: number | null
          gps_speed?: number | null
          gps_time?: string | null
          ground_speed?: number | null
          id?: string
          ignition_timing?: number | null
          inlet_air_temperature?: number | null
          inlet_manifold_pressure?: number | null
          lap_distance?: number | null
          lap_gain_loss_running?: number | null
          lap_number?: number | null
          lap_time?: number | null
          lap_time_predicted?: number | null
          reference_lap_time?: number | null
          running_lap_time?: number | null
          session_id: string
          throttle_pedal?: number | null
          throttle_position?: number | null
          time?: number | null
          trip_distance?: number | null
        }
        Update: {
          airbox_temperature?: number | null
          bat_volts_dash?: number | null
          bat_volts_ecu?: number | null
          boost_pressure?: number | null
          comms_rs232_2_diag?: number | null
          coolant_temperature?: number | null
          cpu_usage?: number | null
          created_at?: string
          dash_temp?: number | null
          device_up_time?: number | null
          drive_speed?: number | null
          engine_oil_pressure?: number | null
          engine_oil_temperature?: number | null
          engine_speed?: number | null
          file_id?: string
          fuel_inj_primary_duty_cycle?: number | null
          fuel_pressure_sensor?: number | null
          fuel_temperature?: number | null
          fuel_used_m1?: number | null
          g_force_lat?: number | null
          g_force_long?: number | null
          g_force_vert?: number | null
          gear?: number | null
          gear_detect_value?: number | null
          gps_altitude?: number | null
          gps_date?: string | null
          gps_heading?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_sats_used?: number | null
          gps_speed?: number | null
          gps_time?: string | null
          ground_speed?: number | null
          id?: string
          ignition_timing?: number | null
          inlet_air_temperature?: number | null
          inlet_manifold_pressure?: number | null
          lap_distance?: number | null
          lap_gain_loss_running?: number | null
          lap_number?: number | null
          lap_time?: number | null
          lap_time_predicted?: number | null
          reference_lap_time?: number | null
          running_lap_time?: number | null
          session_id?: string
          throttle_pedal?: number | null
          throttle_position?: number | null
          time?: number | null
          trip_distance?: number | null
        }
        Relationships: []
      }
      uploaded_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          session_id: string
          upload_status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          session_id: string
          upload_status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          session_id?: string
          upload_status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_files_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_team_admin: {
        Args: { check_team_id: string; check_user_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { check_team_id: string; check_user_id: string }
        Returns: boolean
      }
      sample_telemetry_data: {
        Args: { p_metric: string; p_sample_size?: number; p_session_id: string }
        Returns: {
          row_time: number
          row_value: number
        }[]
      }
    }
    Enums: {
      bid_status: "pending" | "accepted" | "rejected" | "withdrawn"
      job_category:
        | "plumbing"
        | "electrical"
        | "carpentry"
        | "painting"
        | "cleaning"
        | "landscaping"
        | "appliance_repair"
        | "handyman"
        | "other"
      job_status: "open" | "in_progress" | "completed" | "cancelled"
      user_role: "driver" | "engineer" | "team_manager"
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
    Enums: {
      bid_status: ["pending", "accepted", "rejected", "withdrawn"],
      job_category: [
        "plumbing",
        "electrical",
        "carpentry",
        "painting",
        "cleaning",
        "landscaping",
        "appliance_repair",
        "handyman",
        "other",
      ],
      job_status: ["open", "in_progress", "completed", "cancelled"],
      user_role: ["driver", "engineer", "team_manager"],
    },
  },
} as const
