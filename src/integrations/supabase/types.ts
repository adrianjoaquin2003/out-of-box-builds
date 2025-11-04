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
          "5v_aux_supply": number | null
          acceleration_x_axis: number | null
          acceleration_y_axis: number | null
          acceleration_z_axis: number | null
          airbox_temperature: number | null
          alternative_fuel_conversion_factor: number | null
          alternative_fuel_pump_pin_diagnostic: number | null
          ambient_pressure: number | null
          angular_rate_x_axis: number | null
          angular_rate_y_axis: number | null
          angular_rate_z_axis: number | null
          bat_volts_dash: number | null
          bat_volts_ecu: number | null
          boost_pressure: number | null
          brake_state: number | null
          brake_temp_fl: number | null
          brake_temp_fr: number | null
          brake_temp_rl: number | null
          brake_temp_rr: number | null
          can_bus_1_diagnostic: number | null
          clutch_state: number | null
          comms_can_1_diag: number | null
          comms_can_15_diag: number | null
          comms_can_2_diag: number | null
          comms_can_20_diag: number | null
          comms_can_3_diag: number | null
          comms_rs232_2_diag: number | null
          comms_rs232_diag: number | null
          coolant_pressure: number | null
          coolant_temperature: number | null
          coolant_temperature_ignition_timing_compensation: number | null
          coolant_temperature_sensor_diagnostic: number | null
          coolant_temperature_sensor_voltage_reference: number | null
          coolant_temperature_warning: number | null
          cpu_usage: number | null
          crankcase_pressure_warning: number | null
          created_at: string
          dash_temp: number | null
          device_up_time: number | null
          drive_speed: number | null
          driver_switch_6: number | null
          ecu_acceleration_x: number | null
          ecu_acceleration_y: number | null
          ecu_acceleration_z: number | null
          ecu_battery_diagnostic: number | null
          ecu_battery_voltage: number | null
          ecu_cpu_usage: number | null
          ecu_internal_1v2_diagnostic: number | null
          ecu_internal_1v5_diagnostic: number | null
          ecu_internal_1v8_diagnostic: number | null
          ecu_internal_2v5_diagnostic: number | null
          ecu_internal_3v3_diagnostic: number | null
          ecu_internal_7v0_diagnostic: number | null
          ecu_internal_temperature: number | null
          ecu_sensor_5v0_a_diagnostic: number | null
          ecu_sensor_5v0_b_diagnostic: number | null
          ecu_sensor_5v0_c_diagnostic: number | null
          ecu_sensor_6v3_diagnostic: number | null
          ecu_uptime: number | null
          engine_charge_temperature: number | null
          engine_crankcase_pressure: number | null
          engine_efficiency: number | null
          engine_load: number | null
          engine_load_average: number | null
          engine_load_average_ignition_timing_trim: number | null
          engine_load_normalised: number | null
          engine_oil_pressure: number | null
          engine_oil_pressure_sensor: number | null
          engine_oil_pressure_sensor_diagnostic: number | null
          engine_oil_temp_warning: number | null
          engine_oil_temperature: number | null
          engine_overrun_state: number | null
          engine_run_hours_total: number | null
          engine_run_switch: number | null
          engine_run_time: number | null
          engine_run_time_total: number | null
          engine_speed: number | null
          engine_speed_limit: number | null
          engine_speed_limit_state: number | null
          engine_speed_pin_debounce: number | null
          engine_speed_pin_diagnostic: number | null
          engine_speed_pin_hysteresis: number | null
          engine_speed_reference_blank_ratio: number | null
          engine_speed_reference_cycle_duration: number | null
          engine_speed_reference_cycle_position: number | null
          engine_speed_reference_diagnostic: number | null
          engine_speed_reference_instantaneous: number | null
          engine_speed_reference_mode: number | null
          engine_speed_reference_narrow_pitch_threshold: number | null
          engine_speed_reference_offset: number | null
          engine_speed_reference_state: number | null
          engine_speed_reference_test_speed: number | null
          engine_speed_reference_tooth_count: number | null
          engine_speed_reference_tooth_index: number | null
          engine_speed_reference_tooth_period: number | null
          engine_speed_reference_tooth_pitch: number | null
          engine_speed_reference_wide_pitch_threshold: number | null
          engine_speed_voltage: number | null
          engine_speed_voltage_maximum: number | null
          engine_speed_voltage_minimum: number | null
          engine_speed_warning: number | null
          engine_state: number | null
          engine_synchronisation_ignore_mode: number | null
          engine_synchronisation_pin_active_edge: number | null
          engine_synchronisation_pin_debounce: number | null
          engine_synchronisation_pin_diagnostic: number | null
          engine_synchronisation_pin_hysteresis: number | null
          engine_synchronisation_pin_pullup_control: number | null
          engine_synchronisation_pin_threshold: number | null
          engine_synchronisation_position: number | null
          engine_synchronisation_position_diagnostic: number | null
          engine_synchronisation_position_edge_ticks: number | null
          engine_synchronisation_position_tooth_index: number | null
          engine_synchronisation_state: number | null
          engine_synchronisation_voltage: number | null
          engine_synchronisation_voltage_maximum: number | null
          engine_synchronisation_voltage_minimum: number | null
          exhaust_camshaft_bank_1_position_diagnostic: number | null
          exhaust_camshaft_bank_2_position_diagnostic: number | null
          exhaust_lambda: number | null
          exhaust_lambda_bank_1: number | null
          exhaust_temperature: number | null
          exhaust_temperature_cylinder_11: number | null
          exhaust_temperature_cylinder_12: number | null
          file_id: string
          fuel_cylinder_1_primary_output_diagnostic: number | null
          fuel_cylinder_1_primary_output_pulse_width_1: number | null
          fuel_cylinder_1_primary_output_volume: number | null
          fuel_cylinder_1_primary_pin_diagnostic: number | null
          fuel_cylinder_1_secondary_output_diagnostic: number | null
          fuel_cylinder_1_secondary_output_pulse_width_1: number | null
          fuel_cylinder_1_secondary_output_volume: number | null
          fuel_cylinder_1_secondary_pin_diagnostic: number | null
          fuel_inj_primary_duty_cycle: number | null
          fuel_inj_primary_press: number | null
          fuel_inj_sec_contribution: number | null
          fuel_inj_secondary_duty_cycle: number | null
          fuel_inj_secondary_press: number | null
          fuel_injector_primary_contribution: number | null
          fuel_injector_primary_differential_pressure: number | null
          fuel_injector_primary_duty_cycle: number | null
          fuel_injector_secondary_differential_pressure: number | null
          fuel_injector_secondary_duty_cycle: number | null
          fuel_mixture_aim: number | null
          fuel_output_cut_average: number | null
          fuel_output_cut_count: number | null
          fuel_output_diagnostic: number | null
          fuel_pres_direct: number | null
          fuel_pres_direct_aim: number | null
          fuel_pressure_sensor: number | null
          fuel_pressure_warning: number | null
          fuel_pump_pin_diagnostic: number | null
          fuel_pump_state: number | null
          fuel_temperature: number | null
          fuel_timing_primary: number | null
          fuel_timing_primary_limit: number | null
          fuel_timing_primary_main: number | null
          fuel_timing_primary_makeup: number | null
          fuel_timing_secondary: number | null
          fuel_timing_secondary_limit: number | null
          fuel_timing_secondary_main: number | null
          fuel_timing_secondary_makeup: number | null
          fuel_used_m1: number | null
          fuel_volume_compensation: number | null
          fuel_volume_transient_mode: number | null
          g_force_lat: number | null
          g_force_long: number | null
          g_force_vert: number | null
          gear: number | null
          gear_detect_value: number | null
          gear_estimate_state: number | null
          gear_shift_diagnostic: number | null
          gear_shift_mode: number | null
          gps_altitude: number | null
          gps_date: string | null
          gps_dop: number | null
          gps_hdop: number | null
          gps_heading: number | null
          gps_latitude: number | null
          gps_longitude: number | null
          gps_quality: number | null
          gps_sats_used: number | null
          gps_speed: number | null
          gps_time: string | null
          gps_valid: number | null
          gps_vdop: number | null
          ground_speed: number | null
          id: string
          idle_aim: number | null
          idle_ignition_timing_limit_advance: number | null
          idle_ignition_timing_limit_advance_control_error: number | null
          idle_ignition_timing_limit_advance_control_integral: number | null
          idle_ignition_timing_limit_advance_control_integral_maximum:
            | number
            | null
          idle_ignition_timing_limit_advance_control_integral_minimum:
            | number
            | null
          idle_ignition_timing_limit_advance_control_proportional: number | null
          idle_ignition_timing_limit_advance_target: number | null
          ignition_coil_charge_time: number | null
          ignition_coil_charge_time_main: number | null
          ignition_coil_charge_time_maximum: number | null
          ignition_coil_charge_time_minimum: number | null
          ignition_coil_charge_time_restrike: number | null
          ignition_coil_charge_time_trim: number | null
          ignition_cut_state: number | null
          ignition_cyl_1_knock_level: number | null
          ignition_cyl_1_trim_knock: number | null
          ignition_cylinder_1_output_diagnostic: number | null
          ignition_cylinder_1_timing: number | null
          ignition_output_cut_count: number | null
          ignition_output_diagnostic: number | null
          ignition_state: number | null
          ignition_timing: number | null
          ignition_timing_compensation: number | null
          ignition_timing_cranking: number | null
          ignition_timing_main: number | null
          ignition_timing_mode: number | null
          ignition_timing_normal: number | null
          ignition_timing_state: number | null
          ignition_timing_trim: number | null
          imu_temp: number | null
          inlet_air_temperature: number | null
          inlet_air_temperature_sensor_diagnostic: number | null
          inlet_cam_bank1_duty_cycle: number | null
          inlet_cam_bank2_duty_cycle: number | null
          inlet_camshaft_aim: number | null
          inlet_camshaft_bank_1_position_diagnostic: number | null
          inlet_camshaft_bank_2_position_diagnostic: number | null
          inlet_camshaft_bank1_position: number | null
          inlet_camshaft_bank2_position: number | null
          inlet_manifold_pressure: number | null
          inlet_manifold_pressure_correction: number | null
          inlet_manifold_pressure_estimate: number | null
          inlet_manifold_pressure_estimate_main: number | null
          inlet_manifold_pressure_estimate_mode: number | null
          inlet_manifold_pressure_estimate_unfiltered: number | null
          inlet_manifold_pressure_sensor: number | null
          inlet_manifold_pressure_sensor_diagnostic: number | null
          inlet_manifold_pressure_sensor_diagnostic_high: number | null
          inlet_manifold_pressure_sensor_diagnostic_low: number | null
          inlet_manifold_pressure_sensor_diagnostic_time: number | null
          inlet_manifold_pressure_sensor_translation: number | null
          inlet_manifold_pressure_sensor_voltage: number | null
          inlet_manifold_pressure_sensor_voltage_absolute: number | null
          inlet_manifold_pressure_sensor_voltage_filter: number | null
          inlet_manifold_pressure_sensor_voltage_reference: number | null
          inlet_mass_flow: number | null
          keypad_button_1: number | null
          keypad_button_2: number | null
          keypad_button_3: number | null
          keypad_button_4: number | null
          keypad_button_5: number | null
          keypad_button_6: number | null
          keypad_button_7: number | null
          keypad_button_8: number | null
          knock_state: number | null
          knock_threshold: number | null
          knock_warning: number | null
          lap_beacon_number: number | null
          lap_beacon_number_main: number | null
          lap_beacon_ticks: number | null
          lap_distance: number | null
          lap_gain_loss_final: number | null
          lap_gain_loss_running: number | null
          lap_number: number | null
          lap_time: number | null
          lap_time_predicted: number | null
          lateral_acceleration: number | null
          launch_diagnostic: number | null
          launch_state: number | null
          launch_switch: number | null
          lf_rotor_temp_01_2: number | null
          lf_rotor_temp_02_2: number | null
          lf_rotor_temp_03_2: number | null
          lf_rotor_temp_04_2: number | null
          lf_rotor_temp_05_2: number | null
          lf_rotor_temp_06_2: number | null
          lf_rotor_temp_07_2: number | null
          lf_rotor_temp_08_2: number | null
          lf_rotor_temp_09_2: number | null
          lf_rotor_temp_10_2: number | null
          lf_rotor_temp_11_2: number | null
          lf_rotor_temp_12_2: number | null
          lf_rotor_temp_13_2: number | null
          lf_rotor_temp_14_2: number | null
          lf_rotor_temp_15_2: number | null
          lf_rotor_temp_16_2: number | null
          lf_sensor_temp_2: number | null
          lf_tire_temp_01: number | null
          lf_tire_temp_02: number | null
          lf_tire_temp_03: number | null
          lf_tire_temp_04: number | null
          lf_tire_temp_05: number | null
          lf_tire_temp_06: number | null
          lf_tire_temp_07: number | null
          lf_tire_temp_08: number | null
          lf_tire_temp_09: number | null
          lf_tire_temp_10: number | null
          lf_tire_temp_11: number | null
          lf_tire_temp_12: number | null
          lf_tire_temp_13: number | null
          lf_tire_temp_14: number | null
          lf_tire_temp_15: number | null
          lf_tire_temp_16: number | null
          log_data_available: number | null
          log_memory_busy: number | null
          log_time_remaining: number | null
          log_unloading: number | null
          logging_running: number | null
          logging_system_1_used: number | null
          longitudinal_acceleration: number | null
          lr_rotor_temp_01_2: number | null
          lr_rotor_temp_02_2: number | null
          lr_rotor_temp_03_2: number | null
          lr_rotor_temp_04_2: number | null
          lr_rotor_temp_05_2: number | null
          lr_rotor_temp_06_2: number | null
          lr_rotor_temp_07_2: number | null
          lr_rotor_temp_08_2: number | null
          lr_rotor_temp_09_2: number | null
          lr_rotor_temp_10_2: number | null
          lr_rotor_temp_11_2: number | null
          lr_rotor_temp_12_2: number | null
          lr_rotor_temp_13_2: number | null
          lr_rotor_temp_14_2: number | null
          lr_rotor_temp_15_2: number | null
          lr_rotor_temp_16_2: number | null
          lr_sensor_temp_2: number | null
          lr_tire_temp_01: number | null
          lr_tire_temp_02: number | null
          lr_tire_temp_03: number | null
          lr_tire_temp_04: number | null
          lr_tire_temp_05: number | null
          lr_tire_temp_06: number | null
          lr_tire_temp_07: number | null
          lr_tire_temp_08: number | null
          lr_tire_temp_09: number | null
          lr_tire_temp_10: number | null
          lr_tire_temp_11: number | null
          lr_tire_temp_12: number | null
          lr_tire_temp_13: number | null
          lr_tire_temp_14: number | null
          lr_tire_temp_15: number | null
          lr_tire_temp_16: number | null
          max_straight_speed: number | null
          min_corner_speed: number | null
          nitrous_state: number | null
          odometer: number | null
          pdm_fault_flag: number | null
          pdm_input_1_state: number | null
          pdm_input_1_voltage: number | null
          pdm_input_11_state: number | null
          pdm_input_11_voltage: number | null
          pdm_input_12_state: number | null
          pdm_input_12_voltage: number | null
          pdm_input_5_state: number | null
          pdm_input_5_voltage: number | null
          pdm_internal_9_5v: number | null
          pdm_output_1_current: number | null
          pdm_output_1_load: number | null
          pdm_output_1_status: number | null
          pdm_output_1_voltage: number | null
          pdm_output_10_current: number | null
          pdm_output_10_load: number | null
          pdm_output_10_status: number | null
          pdm_output_10_voltage: number | null
          pdm_output_11_current: number | null
          pdm_output_11_load: number | null
          pdm_output_11_status: number | null
          pdm_output_11_voltage: number | null
          pdm_output_12_current: number | null
          pdm_output_12_load: number | null
          pdm_output_12_status: number | null
          pdm_output_12_voltage: number | null
          pdm_output_13_current: number | null
          pdm_output_13_load: number | null
          pdm_output_13_status: number | null
          pdm_output_13_voltage: number | null
          pdm_output_14_current: number | null
          pdm_output_14_load: number | null
          pdm_output_14_status: number | null
          pdm_output_14_voltage: number | null
          pdm_output_15_current: number | null
          pdm_output_15_load: number | null
          pdm_output_15_status: number | null
          pdm_output_15_voltage: number | null
          pdm_output_2_current: number | null
          pdm_output_2_load: number | null
          pdm_output_2_status: number | null
          pdm_output_2_voltage: number | null
          pdm_output_3_current: number | null
          pdm_output_3_load: number | null
          pdm_output_3_status: number | null
          pdm_output_3_voltage: number | null
          pdm_output_4_current: number | null
          pdm_output_4_load: number | null
          pdm_output_4_status: number | null
          pdm_output_4_voltage: number | null
          pdm_output_9_current: number | null
          pdm_output_9_load: number | null
          pdm_output_9_status: number | null
          pdm_output_9_voltage: number | null
          pdm_reset_source: number | null
          pdm_temp: number | null
          pdm_total_current: number | null
          pitch_rotational_rate: number | null
          race_time_reset_switch: number | null
          reference_lap_time: number | null
          reference_lap_time_reset: number | null
          rf_rotor_temp_01_2: number | null
          rf_rotor_temp_02_2: number | null
          rf_rotor_temp_03_2: number | null
          rf_rotor_temp_04_2: number | null
          rf_rotor_temp_05_2: number | null
          rf_rotor_temp_06_2: number | null
          rf_rotor_temp_07_2: number | null
          rf_rotor_temp_08_2: number | null
          rf_rotor_temp_09_2: number | null
          rf_rotor_temp_10_2: number | null
          rf_rotor_temp_11_2: number | null
          rf_rotor_temp_12_2: number | null
          rf_rotor_temp_13_2: number | null
          rf_rotor_temp_14_2: number | null
          rf_rotor_temp_15_2: number | null
          rf_rotor_temp_16_2: number | null
          rf_sensor_temp_2: number | null
          rf_tire_temp_01: number | null
          rf_tire_temp_02: number | null
          rf_tire_temp_03: number | null
          rf_tire_temp_04: number | null
          rf_tire_temp_05: number | null
          rf_tire_temp_06: number | null
          rf_tire_temp_07: number | null
          rf_tire_temp_08: number | null
          rf_tire_temp_09: number | null
          rf_tire_temp_10: number | null
          rf_tire_temp_11: number | null
          rf_tire_temp_12: number | null
          rf_tire_temp_13: number | null
          rf_tire_temp_14: number | null
          rf_tire_temp_15: number | null
          rf_tire_temp_16: number | null
          roll_rotational_rate: number | null
          rr_rotor_temp_01_2: number | null
          rr_rotor_temp_02_2: number | null
          rr_rotor_temp_03_2: number | null
          rr_rotor_temp_04_2: number | null
          rr_rotor_temp_05_2: number | null
          rr_rotor_temp_06_2: number | null
          rr_rotor_temp_07_2: number | null
          rr_rotor_temp_08_2: number | null
          rr_rotor_temp_09_2: number | null
          rr_rotor_temp_10_2: number | null
          rr_rotor_temp_11_2: number | null
          rr_rotor_temp_12_2: number | null
          rr_rotor_temp_13_2: number | null
          rr_rotor_temp_14_2: number | null
          rr_rotor_temp_15_2: number | null
          rr_rotor_temp_16_2: number | null
          rr_sensor_temp_2: number | null
          rr_tire_temp_01: number | null
          rr_tire_temp_02: number | null
          rr_tire_temp_03: number | null
          rr_tire_temp_04: number | null
          rr_tire_temp_05: number | null
          rr_tire_temp_06: number | null
          rr_tire_temp_07: number | null
          rr_tire_temp_08: number | null
          rr_tire_temp_09: number | null
          rr_tire_temp_10: number | null
          rr_tire_temp_11: number | null
          rr_tire_temp_12: number | null
          rr_tire_temp_13: number | null
          rr_tire_temp_14: number | null
          rr_tire_temp_15: number | null
          rr_tire_temp_16: number | null
          rtc_utc_time: number | null
          running_lap_time: number | null
          session_id: string
          session_reset: number | null
          session_time: number | null
          shock_displacment_fl: number | null
          shock_displacment_fr: number | null
          shock_displacment_rl: number | null
          shock_displacment_rr: number | null
          throttle_aim: number | null
          throttle_aim_state: number | null
          throttle_limit: number | null
          throttle_limit_state: number | null
          throttle_pedal: number | null
          throttle_pedal_sensor: number | null
          throttle_pedal_sensor_diagnostic: number | null
          throttle_pedal_sensor_main_diagnostic: number | null
          throttle_pedal_sensor_tracking_diagnostic: number | null
          throttle_position: number | null
          throttle_position_sensor_diagnostic: number | null
          throttle_servo_bank_1_diagnostic: number | null
          throttle_servo_bank_1_position_sensor_diagnostic: number | null
          throttle_servo_bank_1_position_sensor_main_diagnostic: number | null
          throttle_servo_bank_1_position_sensor_tracking_diagnostic:
            | number
            | null
          throttle_servo_bank_2_diagnostic: number | null
          throttle_servo_bank_2_position_sensor_diagnostic: number | null
          throttle_servo_bank_2_position_sensor_main_diagnostic: number | null
          throttle_servo_bank_2_position_sensor_tracking_diagnostic:
            | number
            | null
          time: number | null
          trip_distance: number | null
          vehicle_accel_lateral: number | null
          vehicle_accel_long: number | null
          vehicle_accel_vert: number | null
          vehicle_speed: number | null
          vehicle_yaw_rate: number | null
          vertical_acceleration: number | null
          warning_light: number | null
          warning_source: number | null
          wheel_speed_fl: number | null
          wheel_speed_fr: number | null
          wheel_speed_rl: number | null
          wheel_speed_rr: number | null
          yaw_rotational_rate: number | null
        }
        Insert: {
          "5v_aux_supply"?: number | null
          acceleration_x_axis?: number | null
          acceleration_y_axis?: number | null
          acceleration_z_axis?: number | null
          airbox_temperature?: number | null
          alternative_fuel_conversion_factor?: number | null
          alternative_fuel_pump_pin_diagnostic?: number | null
          ambient_pressure?: number | null
          angular_rate_x_axis?: number | null
          angular_rate_y_axis?: number | null
          angular_rate_z_axis?: number | null
          bat_volts_dash?: number | null
          bat_volts_ecu?: number | null
          boost_pressure?: number | null
          brake_state?: number | null
          brake_temp_fl?: number | null
          brake_temp_fr?: number | null
          brake_temp_rl?: number | null
          brake_temp_rr?: number | null
          can_bus_1_diagnostic?: number | null
          clutch_state?: number | null
          comms_can_1_diag?: number | null
          comms_can_15_diag?: number | null
          comms_can_2_diag?: number | null
          comms_can_20_diag?: number | null
          comms_can_3_diag?: number | null
          comms_rs232_2_diag?: number | null
          comms_rs232_diag?: number | null
          coolant_pressure?: number | null
          coolant_temperature?: number | null
          coolant_temperature_ignition_timing_compensation?: number | null
          coolant_temperature_sensor_diagnostic?: number | null
          coolant_temperature_sensor_voltage_reference?: number | null
          coolant_temperature_warning?: number | null
          cpu_usage?: number | null
          crankcase_pressure_warning?: number | null
          created_at?: string
          dash_temp?: number | null
          device_up_time?: number | null
          drive_speed?: number | null
          driver_switch_6?: number | null
          ecu_acceleration_x?: number | null
          ecu_acceleration_y?: number | null
          ecu_acceleration_z?: number | null
          ecu_battery_diagnostic?: number | null
          ecu_battery_voltage?: number | null
          ecu_cpu_usage?: number | null
          ecu_internal_1v2_diagnostic?: number | null
          ecu_internal_1v5_diagnostic?: number | null
          ecu_internal_1v8_diagnostic?: number | null
          ecu_internal_2v5_diagnostic?: number | null
          ecu_internal_3v3_diagnostic?: number | null
          ecu_internal_7v0_diagnostic?: number | null
          ecu_internal_temperature?: number | null
          ecu_sensor_5v0_a_diagnostic?: number | null
          ecu_sensor_5v0_b_diagnostic?: number | null
          ecu_sensor_5v0_c_diagnostic?: number | null
          ecu_sensor_6v3_diagnostic?: number | null
          ecu_uptime?: number | null
          engine_charge_temperature?: number | null
          engine_crankcase_pressure?: number | null
          engine_efficiency?: number | null
          engine_load?: number | null
          engine_load_average?: number | null
          engine_load_average_ignition_timing_trim?: number | null
          engine_load_normalised?: number | null
          engine_oil_pressure?: number | null
          engine_oil_pressure_sensor?: number | null
          engine_oil_pressure_sensor_diagnostic?: number | null
          engine_oil_temp_warning?: number | null
          engine_oil_temperature?: number | null
          engine_overrun_state?: number | null
          engine_run_hours_total?: number | null
          engine_run_switch?: number | null
          engine_run_time?: number | null
          engine_run_time_total?: number | null
          engine_speed?: number | null
          engine_speed_limit?: number | null
          engine_speed_limit_state?: number | null
          engine_speed_pin_debounce?: number | null
          engine_speed_pin_diagnostic?: number | null
          engine_speed_pin_hysteresis?: number | null
          engine_speed_reference_blank_ratio?: number | null
          engine_speed_reference_cycle_duration?: number | null
          engine_speed_reference_cycle_position?: number | null
          engine_speed_reference_diagnostic?: number | null
          engine_speed_reference_instantaneous?: number | null
          engine_speed_reference_mode?: number | null
          engine_speed_reference_narrow_pitch_threshold?: number | null
          engine_speed_reference_offset?: number | null
          engine_speed_reference_state?: number | null
          engine_speed_reference_test_speed?: number | null
          engine_speed_reference_tooth_count?: number | null
          engine_speed_reference_tooth_index?: number | null
          engine_speed_reference_tooth_period?: number | null
          engine_speed_reference_tooth_pitch?: number | null
          engine_speed_reference_wide_pitch_threshold?: number | null
          engine_speed_voltage?: number | null
          engine_speed_voltage_maximum?: number | null
          engine_speed_voltage_minimum?: number | null
          engine_speed_warning?: number | null
          engine_state?: number | null
          engine_synchronisation_ignore_mode?: number | null
          engine_synchronisation_pin_active_edge?: number | null
          engine_synchronisation_pin_debounce?: number | null
          engine_synchronisation_pin_diagnostic?: number | null
          engine_synchronisation_pin_hysteresis?: number | null
          engine_synchronisation_pin_pullup_control?: number | null
          engine_synchronisation_pin_threshold?: number | null
          engine_synchronisation_position?: number | null
          engine_synchronisation_position_diagnostic?: number | null
          engine_synchronisation_position_edge_ticks?: number | null
          engine_synchronisation_position_tooth_index?: number | null
          engine_synchronisation_state?: number | null
          engine_synchronisation_voltage?: number | null
          engine_synchronisation_voltage_maximum?: number | null
          engine_synchronisation_voltage_minimum?: number | null
          exhaust_camshaft_bank_1_position_diagnostic?: number | null
          exhaust_camshaft_bank_2_position_diagnostic?: number | null
          exhaust_lambda?: number | null
          exhaust_lambda_bank_1?: number | null
          exhaust_temperature?: number | null
          exhaust_temperature_cylinder_11?: number | null
          exhaust_temperature_cylinder_12?: number | null
          file_id: string
          fuel_cylinder_1_primary_output_diagnostic?: number | null
          fuel_cylinder_1_primary_output_pulse_width_1?: number | null
          fuel_cylinder_1_primary_output_volume?: number | null
          fuel_cylinder_1_primary_pin_diagnostic?: number | null
          fuel_cylinder_1_secondary_output_diagnostic?: number | null
          fuel_cylinder_1_secondary_output_pulse_width_1?: number | null
          fuel_cylinder_1_secondary_output_volume?: number | null
          fuel_cylinder_1_secondary_pin_diagnostic?: number | null
          fuel_inj_primary_duty_cycle?: number | null
          fuel_inj_primary_press?: number | null
          fuel_inj_sec_contribution?: number | null
          fuel_inj_secondary_duty_cycle?: number | null
          fuel_inj_secondary_press?: number | null
          fuel_injector_primary_contribution?: number | null
          fuel_injector_primary_differential_pressure?: number | null
          fuel_injector_primary_duty_cycle?: number | null
          fuel_injector_secondary_differential_pressure?: number | null
          fuel_injector_secondary_duty_cycle?: number | null
          fuel_mixture_aim?: number | null
          fuel_output_cut_average?: number | null
          fuel_output_cut_count?: number | null
          fuel_output_diagnostic?: number | null
          fuel_pres_direct?: number | null
          fuel_pres_direct_aim?: number | null
          fuel_pressure_sensor?: number | null
          fuel_pressure_warning?: number | null
          fuel_pump_pin_diagnostic?: number | null
          fuel_pump_state?: number | null
          fuel_temperature?: number | null
          fuel_timing_primary?: number | null
          fuel_timing_primary_limit?: number | null
          fuel_timing_primary_main?: number | null
          fuel_timing_primary_makeup?: number | null
          fuel_timing_secondary?: number | null
          fuel_timing_secondary_limit?: number | null
          fuel_timing_secondary_main?: number | null
          fuel_timing_secondary_makeup?: number | null
          fuel_used_m1?: number | null
          fuel_volume_compensation?: number | null
          fuel_volume_transient_mode?: number | null
          g_force_lat?: number | null
          g_force_long?: number | null
          g_force_vert?: number | null
          gear?: number | null
          gear_detect_value?: number | null
          gear_estimate_state?: number | null
          gear_shift_diagnostic?: number | null
          gear_shift_mode?: number | null
          gps_altitude?: number | null
          gps_date?: string | null
          gps_dop?: number | null
          gps_hdop?: number | null
          gps_heading?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_quality?: number | null
          gps_sats_used?: number | null
          gps_speed?: number | null
          gps_time?: string | null
          gps_valid?: number | null
          gps_vdop?: number | null
          ground_speed?: number | null
          id?: string
          idle_aim?: number | null
          idle_ignition_timing_limit_advance?: number | null
          idle_ignition_timing_limit_advance_control_error?: number | null
          idle_ignition_timing_limit_advance_control_integral?: number | null
          idle_ignition_timing_limit_advance_control_integral_maximum?:
            | number
            | null
          idle_ignition_timing_limit_advance_control_integral_minimum?:
            | number
            | null
          idle_ignition_timing_limit_advance_control_proportional?:
            | number
            | null
          idle_ignition_timing_limit_advance_target?: number | null
          ignition_coil_charge_time?: number | null
          ignition_coil_charge_time_main?: number | null
          ignition_coil_charge_time_maximum?: number | null
          ignition_coil_charge_time_minimum?: number | null
          ignition_coil_charge_time_restrike?: number | null
          ignition_coil_charge_time_trim?: number | null
          ignition_cut_state?: number | null
          ignition_cyl_1_knock_level?: number | null
          ignition_cyl_1_trim_knock?: number | null
          ignition_cylinder_1_output_diagnostic?: number | null
          ignition_cylinder_1_timing?: number | null
          ignition_output_cut_count?: number | null
          ignition_output_diagnostic?: number | null
          ignition_state?: number | null
          ignition_timing?: number | null
          ignition_timing_compensation?: number | null
          ignition_timing_cranking?: number | null
          ignition_timing_main?: number | null
          ignition_timing_mode?: number | null
          ignition_timing_normal?: number | null
          ignition_timing_state?: number | null
          ignition_timing_trim?: number | null
          imu_temp?: number | null
          inlet_air_temperature?: number | null
          inlet_air_temperature_sensor_diagnostic?: number | null
          inlet_cam_bank1_duty_cycle?: number | null
          inlet_cam_bank2_duty_cycle?: number | null
          inlet_camshaft_aim?: number | null
          inlet_camshaft_bank_1_position_diagnostic?: number | null
          inlet_camshaft_bank_2_position_diagnostic?: number | null
          inlet_camshaft_bank1_position?: number | null
          inlet_camshaft_bank2_position?: number | null
          inlet_manifold_pressure?: number | null
          inlet_manifold_pressure_correction?: number | null
          inlet_manifold_pressure_estimate?: number | null
          inlet_manifold_pressure_estimate_main?: number | null
          inlet_manifold_pressure_estimate_mode?: number | null
          inlet_manifold_pressure_estimate_unfiltered?: number | null
          inlet_manifold_pressure_sensor?: number | null
          inlet_manifold_pressure_sensor_diagnostic?: number | null
          inlet_manifold_pressure_sensor_diagnostic_high?: number | null
          inlet_manifold_pressure_sensor_diagnostic_low?: number | null
          inlet_manifold_pressure_sensor_diagnostic_time?: number | null
          inlet_manifold_pressure_sensor_translation?: number | null
          inlet_manifold_pressure_sensor_voltage?: number | null
          inlet_manifold_pressure_sensor_voltage_absolute?: number | null
          inlet_manifold_pressure_sensor_voltage_filter?: number | null
          inlet_manifold_pressure_sensor_voltage_reference?: number | null
          inlet_mass_flow?: number | null
          keypad_button_1?: number | null
          keypad_button_2?: number | null
          keypad_button_3?: number | null
          keypad_button_4?: number | null
          keypad_button_5?: number | null
          keypad_button_6?: number | null
          keypad_button_7?: number | null
          keypad_button_8?: number | null
          knock_state?: number | null
          knock_threshold?: number | null
          knock_warning?: number | null
          lap_beacon_number?: number | null
          lap_beacon_number_main?: number | null
          lap_beacon_ticks?: number | null
          lap_distance?: number | null
          lap_gain_loss_final?: number | null
          lap_gain_loss_running?: number | null
          lap_number?: number | null
          lap_time?: number | null
          lap_time_predicted?: number | null
          lateral_acceleration?: number | null
          launch_diagnostic?: number | null
          launch_state?: number | null
          launch_switch?: number | null
          lf_rotor_temp_01_2?: number | null
          lf_rotor_temp_02_2?: number | null
          lf_rotor_temp_03_2?: number | null
          lf_rotor_temp_04_2?: number | null
          lf_rotor_temp_05_2?: number | null
          lf_rotor_temp_06_2?: number | null
          lf_rotor_temp_07_2?: number | null
          lf_rotor_temp_08_2?: number | null
          lf_rotor_temp_09_2?: number | null
          lf_rotor_temp_10_2?: number | null
          lf_rotor_temp_11_2?: number | null
          lf_rotor_temp_12_2?: number | null
          lf_rotor_temp_13_2?: number | null
          lf_rotor_temp_14_2?: number | null
          lf_rotor_temp_15_2?: number | null
          lf_rotor_temp_16_2?: number | null
          lf_sensor_temp_2?: number | null
          lf_tire_temp_01?: number | null
          lf_tire_temp_02?: number | null
          lf_tire_temp_03?: number | null
          lf_tire_temp_04?: number | null
          lf_tire_temp_05?: number | null
          lf_tire_temp_06?: number | null
          lf_tire_temp_07?: number | null
          lf_tire_temp_08?: number | null
          lf_tire_temp_09?: number | null
          lf_tire_temp_10?: number | null
          lf_tire_temp_11?: number | null
          lf_tire_temp_12?: number | null
          lf_tire_temp_13?: number | null
          lf_tire_temp_14?: number | null
          lf_tire_temp_15?: number | null
          lf_tire_temp_16?: number | null
          log_data_available?: number | null
          log_memory_busy?: number | null
          log_time_remaining?: number | null
          log_unloading?: number | null
          logging_running?: number | null
          logging_system_1_used?: number | null
          longitudinal_acceleration?: number | null
          lr_rotor_temp_01_2?: number | null
          lr_rotor_temp_02_2?: number | null
          lr_rotor_temp_03_2?: number | null
          lr_rotor_temp_04_2?: number | null
          lr_rotor_temp_05_2?: number | null
          lr_rotor_temp_06_2?: number | null
          lr_rotor_temp_07_2?: number | null
          lr_rotor_temp_08_2?: number | null
          lr_rotor_temp_09_2?: number | null
          lr_rotor_temp_10_2?: number | null
          lr_rotor_temp_11_2?: number | null
          lr_rotor_temp_12_2?: number | null
          lr_rotor_temp_13_2?: number | null
          lr_rotor_temp_14_2?: number | null
          lr_rotor_temp_15_2?: number | null
          lr_rotor_temp_16_2?: number | null
          lr_sensor_temp_2?: number | null
          lr_tire_temp_01?: number | null
          lr_tire_temp_02?: number | null
          lr_tire_temp_03?: number | null
          lr_tire_temp_04?: number | null
          lr_tire_temp_05?: number | null
          lr_tire_temp_06?: number | null
          lr_tire_temp_07?: number | null
          lr_tire_temp_08?: number | null
          lr_tire_temp_09?: number | null
          lr_tire_temp_10?: number | null
          lr_tire_temp_11?: number | null
          lr_tire_temp_12?: number | null
          lr_tire_temp_13?: number | null
          lr_tire_temp_14?: number | null
          lr_tire_temp_15?: number | null
          lr_tire_temp_16?: number | null
          max_straight_speed?: number | null
          min_corner_speed?: number | null
          nitrous_state?: number | null
          odometer?: number | null
          pdm_fault_flag?: number | null
          pdm_input_1_state?: number | null
          pdm_input_1_voltage?: number | null
          pdm_input_11_state?: number | null
          pdm_input_11_voltage?: number | null
          pdm_input_12_state?: number | null
          pdm_input_12_voltage?: number | null
          pdm_input_5_state?: number | null
          pdm_input_5_voltage?: number | null
          pdm_internal_9_5v?: number | null
          pdm_output_1_current?: number | null
          pdm_output_1_load?: number | null
          pdm_output_1_status?: number | null
          pdm_output_1_voltage?: number | null
          pdm_output_10_current?: number | null
          pdm_output_10_load?: number | null
          pdm_output_10_status?: number | null
          pdm_output_10_voltage?: number | null
          pdm_output_11_current?: number | null
          pdm_output_11_load?: number | null
          pdm_output_11_status?: number | null
          pdm_output_11_voltage?: number | null
          pdm_output_12_current?: number | null
          pdm_output_12_load?: number | null
          pdm_output_12_status?: number | null
          pdm_output_12_voltage?: number | null
          pdm_output_13_current?: number | null
          pdm_output_13_load?: number | null
          pdm_output_13_status?: number | null
          pdm_output_13_voltage?: number | null
          pdm_output_14_current?: number | null
          pdm_output_14_load?: number | null
          pdm_output_14_status?: number | null
          pdm_output_14_voltage?: number | null
          pdm_output_15_current?: number | null
          pdm_output_15_load?: number | null
          pdm_output_15_status?: number | null
          pdm_output_15_voltage?: number | null
          pdm_output_2_current?: number | null
          pdm_output_2_load?: number | null
          pdm_output_2_status?: number | null
          pdm_output_2_voltage?: number | null
          pdm_output_3_current?: number | null
          pdm_output_3_load?: number | null
          pdm_output_3_status?: number | null
          pdm_output_3_voltage?: number | null
          pdm_output_4_current?: number | null
          pdm_output_4_load?: number | null
          pdm_output_4_status?: number | null
          pdm_output_4_voltage?: number | null
          pdm_output_9_current?: number | null
          pdm_output_9_load?: number | null
          pdm_output_9_status?: number | null
          pdm_output_9_voltage?: number | null
          pdm_reset_source?: number | null
          pdm_temp?: number | null
          pdm_total_current?: number | null
          pitch_rotational_rate?: number | null
          race_time_reset_switch?: number | null
          reference_lap_time?: number | null
          reference_lap_time_reset?: number | null
          rf_rotor_temp_01_2?: number | null
          rf_rotor_temp_02_2?: number | null
          rf_rotor_temp_03_2?: number | null
          rf_rotor_temp_04_2?: number | null
          rf_rotor_temp_05_2?: number | null
          rf_rotor_temp_06_2?: number | null
          rf_rotor_temp_07_2?: number | null
          rf_rotor_temp_08_2?: number | null
          rf_rotor_temp_09_2?: number | null
          rf_rotor_temp_10_2?: number | null
          rf_rotor_temp_11_2?: number | null
          rf_rotor_temp_12_2?: number | null
          rf_rotor_temp_13_2?: number | null
          rf_rotor_temp_14_2?: number | null
          rf_rotor_temp_15_2?: number | null
          rf_rotor_temp_16_2?: number | null
          rf_sensor_temp_2?: number | null
          rf_tire_temp_01?: number | null
          rf_tire_temp_02?: number | null
          rf_tire_temp_03?: number | null
          rf_tire_temp_04?: number | null
          rf_tire_temp_05?: number | null
          rf_tire_temp_06?: number | null
          rf_tire_temp_07?: number | null
          rf_tire_temp_08?: number | null
          rf_tire_temp_09?: number | null
          rf_tire_temp_10?: number | null
          rf_tire_temp_11?: number | null
          rf_tire_temp_12?: number | null
          rf_tire_temp_13?: number | null
          rf_tire_temp_14?: number | null
          rf_tire_temp_15?: number | null
          rf_tire_temp_16?: number | null
          roll_rotational_rate?: number | null
          rr_rotor_temp_01_2?: number | null
          rr_rotor_temp_02_2?: number | null
          rr_rotor_temp_03_2?: number | null
          rr_rotor_temp_04_2?: number | null
          rr_rotor_temp_05_2?: number | null
          rr_rotor_temp_06_2?: number | null
          rr_rotor_temp_07_2?: number | null
          rr_rotor_temp_08_2?: number | null
          rr_rotor_temp_09_2?: number | null
          rr_rotor_temp_10_2?: number | null
          rr_rotor_temp_11_2?: number | null
          rr_rotor_temp_12_2?: number | null
          rr_rotor_temp_13_2?: number | null
          rr_rotor_temp_14_2?: number | null
          rr_rotor_temp_15_2?: number | null
          rr_rotor_temp_16_2?: number | null
          rr_sensor_temp_2?: number | null
          rr_tire_temp_01?: number | null
          rr_tire_temp_02?: number | null
          rr_tire_temp_03?: number | null
          rr_tire_temp_04?: number | null
          rr_tire_temp_05?: number | null
          rr_tire_temp_06?: number | null
          rr_tire_temp_07?: number | null
          rr_tire_temp_08?: number | null
          rr_tire_temp_09?: number | null
          rr_tire_temp_10?: number | null
          rr_tire_temp_11?: number | null
          rr_tire_temp_12?: number | null
          rr_tire_temp_13?: number | null
          rr_tire_temp_14?: number | null
          rr_tire_temp_15?: number | null
          rr_tire_temp_16?: number | null
          rtc_utc_time?: number | null
          running_lap_time?: number | null
          session_id: string
          session_reset?: number | null
          session_time?: number | null
          shock_displacment_fl?: number | null
          shock_displacment_fr?: number | null
          shock_displacment_rl?: number | null
          shock_displacment_rr?: number | null
          throttle_aim?: number | null
          throttle_aim_state?: number | null
          throttle_limit?: number | null
          throttle_limit_state?: number | null
          throttle_pedal?: number | null
          throttle_pedal_sensor?: number | null
          throttle_pedal_sensor_diagnostic?: number | null
          throttle_pedal_sensor_main_diagnostic?: number | null
          throttle_pedal_sensor_tracking_diagnostic?: number | null
          throttle_position?: number | null
          throttle_position_sensor_diagnostic?: number | null
          throttle_servo_bank_1_diagnostic?: number | null
          throttle_servo_bank_1_position_sensor_diagnostic?: number | null
          throttle_servo_bank_1_position_sensor_main_diagnostic?: number | null
          throttle_servo_bank_1_position_sensor_tracking_diagnostic?:
            | number
            | null
          throttle_servo_bank_2_diagnostic?: number | null
          throttle_servo_bank_2_position_sensor_diagnostic?: number | null
          throttle_servo_bank_2_position_sensor_main_diagnostic?: number | null
          throttle_servo_bank_2_position_sensor_tracking_diagnostic?:
            | number
            | null
          time?: number | null
          trip_distance?: number | null
          vehicle_accel_lateral?: number | null
          vehicle_accel_long?: number | null
          vehicle_accel_vert?: number | null
          vehicle_speed?: number | null
          vehicle_yaw_rate?: number | null
          vertical_acceleration?: number | null
          warning_light?: number | null
          warning_source?: number | null
          wheel_speed_fl?: number | null
          wheel_speed_fr?: number | null
          wheel_speed_rl?: number | null
          wheel_speed_rr?: number | null
          yaw_rotational_rate?: number | null
        }
        Update: {
          "5v_aux_supply"?: number | null
          acceleration_x_axis?: number | null
          acceleration_y_axis?: number | null
          acceleration_z_axis?: number | null
          airbox_temperature?: number | null
          alternative_fuel_conversion_factor?: number | null
          alternative_fuel_pump_pin_diagnostic?: number | null
          ambient_pressure?: number | null
          angular_rate_x_axis?: number | null
          angular_rate_y_axis?: number | null
          angular_rate_z_axis?: number | null
          bat_volts_dash?: number | null
          bat_volts_ecu?: number | null
          boost_pressure?: number | null
          brake_state?: number | null
          brake_temp_fl?: number | null
          brake_temp_fr?: number | null
          brake_temp_rl?: number | null
          brake_temp_rr?: number | null
          can_bus_1_diagnostic?: number | null
          clutch_state?: number | null
          comms_can_1_diag?: number | null
          comms_can_15_diag?: number | null
          comms_can_2_diag?: number | null
          comms_can_20_diag?: number | null
          comms_can_3_diag?: number | null
          comms_rs232_2_diag?: number | null
          comms_rs232_diag?: number | null
          coolant_pressure?: number | null
          coolant_temperature?: number | null
          coolant_temperature_ignition_timing_compensation?: number | null
          coolant_temperature_sensor_diagnostic?: number | null
          coolant_temperature_sensor_voltage_reference?: number | null
          coolant_temperature_warning?: number | null
          cpu_usage?: number | null
          crankcase_pressure_warning?: number | null
          created_at?: string
          dash_temp?: number | null
          device_up_time?: number | null
          drive_speed?: number | null
          driver_switch_6?: number | null
          ecu_acceleration_x?: number | null
          ecu_acceleration_y?: number | null
          ecu_acceleration_z?: number | null
          ecu_battery_diagnostic?: number | null
          ecu_battery_voltage?: number | null
          ecu_cpu_usage?: number | null
          ecu_internal_1v2_diagnostic?: number | null
          ecu_internal_1v5_diagnostic?: number | null
          ecu_internal_1v8_diagnostic?: number | null
          ecu_internal_2v5_diagnostic?: number | null
          ecu_internal_3v3_diagnostic?: number | null
          ecu_internal_7v0_diagnostic?: number | null
          ecu_internal_temperature?: number | null
          ecu_sensor_5v0_a_diagnostic?: number | null
          ecu_sensor_5v0_b_diagnostic?: number | null
          ecu_sensor_5v0_c_diagnostic?: number | null
          ecu_sensor_6v3_diagnostic?: number | null
          ecu_uptime?: number | null
          engine_charge_temperature?: number | null
          engine_crankcase_pressure?: number | null
          engine_efficiency?: number | null
          engine_load?: number | null
          engine_load_average?: number | null
          engine_load_average_ignition_timing_trim?: number | null
          engine_load_normalised?: number | null
          engine_oil_pressure?: number | null
          engine_oil_pressure_sensor?: number | null
          engine_oil_pressure_sensor_diagnostic?: number | null
          engine_oil_temp_warning?: number | null
          engine_oil_temperature?: number | null
          engine_overrun_state?: number | null
          engine_run_hours_total?: number | null
          engine_run_switch?: number | null
          engine_run_time?: number | null
          engine_run_time_total?: number | null
          engine_speed?: number | null
          engine_speed_limit?: number | null
          engine_speed_limit_state?: number | null
          engine_speed_pin_debounce?: number | null
          engine_speed_pin_diagnostic?: number | null
          engine_speed_pin_hysteresis?: number | null
          engine_speed_reference_blank_ratio?: number | null
          engine_speed_reference_cycle_duration?: number | null
          engine_speed_reference_cycle_position?: number | null
          engine_speed_reference_diagnostic?: number | null
          engine_speed_reference_instantaneous?: number | null
          engine_speed_reference_mode?: number | null
          engine_speed_reference_narrow_pitch_threshold?: number | null
          engine_speed_reference_offset?: number | null
          engine_speed_reference_state?: number | null
          engine_speed_reference_test_speed?: number | null
          engine_speed_reference_tooth_count?: number | null
          engine_speed_reference_tooth_index?: number | null
          engine_speed_reference_tooth_period?: number | null
          engine_speed_reference_tooth_pitch?: number | null
          engine_speed_reference_wide_pitch_threshold?: number | null
          engine_speed_voltage?: number | null
          engine_speed_voltage_maximum?: number | null
          engine_speed_voltage_minimum?: number | null
          engine_speed_warning?: number | null
          engine_state?: number | null
          engine_synchronisation_ignore_mode?: number | null
          engine_synchronisation_pin_active_edge?: number | null
          engine_synchronisation_pin_debounce?: number | null
          engine_synchronisation_pin_diagnostic?: number | null
          engine_synchronisation_pin_hysteresis?: number | null
          engine_synchronisation_pin_pullup_control?: number | null
          engine_synchronisation_pin_threshold?: number | null
          engine_synchronisation_position?: number | null
          engine_synchronisation_position_diagnostic?: number | null
          engine_synchronisation_position_edge_ticks?: number | null
          engine_synchronisation_position_tooth_index?: number | null
          engine_synchronisation_state?: number | null
          engine_synchronisation_voltage?: number | null
          engine_synchronisation_voltage_maximum?: number | null
          engine_synchronisation_voltage_minimum?: number | null
          exhaust_camshaft_bank_1_position_diagnostic?: number | null
          exhaust_camshaft_bank_2_position_diagnostic?: number | null
          exhaust_lambda?: number | null
          exhaust_lambda_bank_1?: number | null
          exhaust_temperature?: number | null
          exhaust_temperature_cylinder_11?: number | null
          exhaust_temperature_cylinder_12?: number | null
          file_id?: string
          fuel_cylinder_1_primary_output_diagnostic?: number | null
          fuel_cylinder_1_primary_output_pulse_width_1?: number | null
          fuel_cylinder_1_primary_output_volume?: number | null
          fuel_cylinder_1_primary_pin_diagnostic?: number | null
          fuel_cylinder_1_secondary_output_diagnostic?: number | null
          fuel_cylinder_1_secondary_output_pulse_width_1?: number | null
          fuel_cylinder_1_secondary_output_volume?: number | null
          fuel_cylinder_1_secondary_pin_diagnostic?: number | null
          fuel_inj_primary_duty_cycle?: number | null
          fuel_inj_primary_press?: number | null
          fuel_inj_sec_contribution?: number | null
          fuel_inj_secondary_duty_cycle?: number | null
          fuel_inj_secondary_press?: number | null
          fuel_injector_primary_contribution?: number | null
          fuel_injector_primary_differential_pressure?: number | null
          fuel_injector_primary_duty_cycle?: number | null
          fuel_injector_secondary_differential_pressure?: number | null
          fuel_injector_secondary_duty_cycle?: number | null
          fuel_mixture_aim?: number | null
          fuel_output_cut_average?: number | null
          fuel_output_cut_count?: number | null
          fuel_output_diagnostic?: number | null
          fuel_pres_direct?: number | null
          fuel_pres_direct_aim?: number | null
          fuel_pressure_sensor?: number | null
          fuel_pressure_warning?: number | null
          fuel_pump_pin_diagnostic?: number | null
          fuel_pump_state?: number | null
          fuel_temperature?: number | null
          fuel_timing_primary?: number | null
          fuel_timing_primary_limit?: number | null
          fuel_timing_primary_main?: number | null
          fuel_timing_primary_makeup?: number | null
          fuel_timing_secondary?: number | null
          fuel_timing_secondary_limit?: number | null
          fuel_timing_secondary_main?: number | null
          fuel_timing_secondary_makeup?: number | null
          fuel_used_m1?: number | null
          fuel_volume_compensation?: number | null
          fuel_volume_transient_mode?: number | null
          g_force_lat?: number | null
          g_force_long?: number | null
          g_force_vert?: number | null
          gear?: number | null
          gear_detect_value?: number | null
          gear_estimate_state?: number | null
          gear_shift_diagnostic?: number | null
          gear_shift_mode?: number | null
          gps_altitude?: number | null
          gps_date?: string | null
          gps_dop?: number | null
          gps_hdop?: number | null
          gps_heading?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_quality?: number | null
          gps_sats_used?: number | null
          gps_speed?: number | null
          gps_time?: string | null
          gps_valid?: number | null
          gps_vdop?: number | null
          ground_speed?: number | null
          id?: string
          idle_aim?: number | null
          idle_ignition_timing_limit_advance?: number | null
          idle_ignition_timing_limit_advance_control_error?: number | null
          idle_ignition_timing_limit_advance_control_integral?: number | null
          idle_ignition_timing_limit_advance_control_integral_maximum?:
            | number
            | null
          idle_ignition_timing_limit_advance_control_integral_minimum?:
            | number
            | null
          idle_ignition_timing_limit_advance_control_proportional?:
            | number
            | null
          idle_ignition_timing_limit_advance_target?: number | null
          ignition_coil_charge_time?: number | null
          ignition_coil_charge_time_main?: number | null
          ignition_coil_charge_time_maximum?: number | null
          ignition_coil_charge_time_minimum?: number | null
          ignition_coil_charge_time_restrike?: number | null
          ignition_coil_charge_time_trim?: number | null
          ignition_cut_state?: number | null
          ignition_cyl_1_knock_level?: number | null
          ignition_cyl_1_trim_knock?: number | null
          ignition_cylinder_1_output_diagnostic?: number | null
          ignition_cylinder_1_timing?: number | null
          ignition_output_cut_count?: number | null
          ignition_output_diagnostic?: number | null
          ignition_state?: number | null
          ignition_timing?: number | null
          ignition_timing_compensation?: number | null
          ignition_timing_cranking?: number | null
          ignition_timing_main?: number | null
          ignition_timing_mode?: number | null
          ignition_timing_normal?: number | null
          ignition_timing_state?: number | null
          ignition_timing_trim?: number | null
          imu_temp?: number | null
          inlet_air_temperature?: number | null
          inlet_air_temperature_sensor_diagnostic?: number | null
          inlet_cam_bank1_duty_cycle?: number | null
          inlet_cam_bank2_duty_cycle?: number | null
          inlet_camshaft_aim?: number | null
          inlet_camshaft_bank_1_position_diagnostic?: number | null
          inlet_camshaft_bank_2_position_diagnostic?: number | null
          inlet_camshaft_bank1_position?: number | null
          inlet_camshaft_bank2_position?: number | null
          inlet_manifold_pressure?: number | null
          inlet_manifold_pressure_correction?: number | null
          inlet_manifold_pressure_estimate?: number | null
          inlet_manifold_pressure_estimate_main?: number | null
          inlet_manifold_pressure_estimate_mode?: number | null
          inlet_manifold_pressure_estimate_unfiltered?: number | null
          inlet_manifold_pressure_sensor?: number | null
          inlet_manifold_pressure_sensor_diagnostic?: number | null
          inlet_manifold_pressure_sensor_diagnostic_high?: number | null
          inlet_manifold_pressure_sensor_diagnostic_low?: number | null
          inlet_manifold_pressure_sensor_diagnostic_time?: number | null
          inlet_manifold_pressure_sensor_translation?: number | null
          inlet_manifold_pressure_sensor_voltage?: number | null
          inlet_manifold_pressure_sensor_voltage_absolute?: number | null
          inlet_manifold_pressure_sensor_voltage_filter?: number | null
          inlet_manifold_pressure_sensor_voltage_reference?: number | null
          inlet_mass_flow?: number | null
          keypad_button_1?: number | null
          keypad_button_2?: number | null
          keypad_button_3?: number | null
          keypad_button_4?: number | null
          keypad_button_5?: number | null
          keypad_button_6?: number | null
          keypad_button_7?: number | null
          keypad_button_8?: number | null
          knock_state?: number | null
          knock_threshold?: number | null
          knock_warning?: number | null
          lap_beacon_number?: number | null
          lap_beacon_number_main?: number | null
          lap_beacon_ticks?: number | null
          lap_distance?: number | null
          lap_gain_loss_final?: number | null
          lap_gain_loss_running?: number | null
          lap_number?: number | null
          lap_time?: number | null
          lap_time_predicted?: number | null
          lateral_acceleration?: number | null
          launch_diagnostic?: number | null
          launch_state?: number | null
          launch_switch?: number | null
          lf_rotor_temp_01_2?: number | null
          lf_rotor_temp_02_2?: number | null
          lf_rotor_temp_03_2?: number | null
          lf_rotor_temp_04_2?: number | null
          lf_rotor_temp_05_2?: number | null
          lf_rotor_temp_06_2?: number | null
          lf_rotor_temp_07_2?: number | null
          lf_rotor_temp_08_2?: number | null
          lf_rotor_temp_09_2?: number | null
          lf_rotor_temp_10_2?: number | null
          lf_rotor_temp_11_2?: number | null
          lf_rotor_temp_12_2?: number | null
          lf_rotor_temp_13_2?: number | null
          lf_rotor_temp_14_2?: number | null
          lf_rotor_temp_15_2?: number | null
          lf_rotor_temp_16_2?: number | null
          lf_sensor_temp_2?: number | null
          lf_tire_temp_01?: number | null
          lf_tire_temp_02?: number | null
          lf_tire_temp_03?: number | null
          lf_tire_temp_04?: number | null
          lf_tire_temp_05?: number | null
          lf_tire_temp_06?: number | null
          lf_tire_temp_07?: number | null
          lf_tire_temp_08?: number | null
          lf_tire_temp_09?: number | null
          lf_tire_temp_10?: number | null
          lf_tire_temp_11?: number | null
          lf_tire_temp_12?: number | null
          lf_tire_temp_13?: number | null
          lf_tire_temp_14?: number | null
          lf_tire_temp_15?: number | null
          lf_tire_temp_16?: number | null
          log_data_available?: number | null
          log_memory_busy?: number | null
          log_time_remaining?: number | null
          log_unloading?: number | null
          logging_running?: number | null
          logging_system_1_used?: number | null
          longitudinal_acceleration?: number | null
          lr_rotor_temp_01_2?: number | null
          lr_rotor_temp_02_2?: number | null
          lr_rotor_temp_03_2?: number | null
          lr_rotor_temp_04_2?: number | null
          lr_rotor_temp_05_2?: number | null
          lr_rotor_temp_06_2?: number | null
          lr_rotor_temp_07_2?: number | null
          lr_rotor_temp_08_2?: number | null
          lr_rotor_temp_09_2?: number | null
          lr_rotor_temp_10_2?: number | null
          lr_rotor_temp_11_2?: number | null
          lr_rotor_temp_12_2?: number | null
          lr_rotor_temp_13_2?: number | null
          lr_rotor_temp_14_2?: number | null
          lr_rotor_temp_15_2?: number | null
          lr_rotor_temp_16_2?: number | null
          lr_sensor_temp_2?: number | null
          lr_tire_temp_01?: number | null
          lr_tire_temp_02?: number | null
          lr_tire_temp_03?: number | null
          lr_tire_temp_04?: number | null
          lr_tire_temp_05?: number | null
          lr_tire_temp_06?: number | null
          lr_tire_temp_07?: number | null
          lr_tire_temp_08?: number | null
          lr_tire_temp_09?: number | null
          lr_tire_temp_10?: number | null
          lr_tire_temp_11?: number | null
          lr_tire_temp_12?: number | null
          lr_tire_temp_13?: number | null
          lr_tire_temp_14?: number | null
          lr_tire_temp_15?: number | null
          lr_tire_temp_16?: number | null
          max_straight_speed?: number | null
          min_corner_speed?: number | null
          nitrous_state?: number | null
          odometer?: number | null
          pdm_fault_flag?: number | null
          pdm_input_1_state?: number | null
          pdm_input_1_voltage?: number | null
          pdm_input_11_state?: number | null
          pdm_input_11_voltage?: number | null
          pdm_input_12_state?: number | null
          pdm_input_12_voltage?: number | null
          pdm_input_5_state?: number | null
          pdm_input_5_voltage?: number | null
          pdm_internal_9_5v?: number | null
          pdm_output_1_current?: number | null
          pdm_output_1_load?: number | null
          pdm_output_1_status?: number | null
          pdm_output_1_voltage?: number | null
          pdm_output_10_current?: number | null
          pdm_output_10_load?: number | null
          pdm_output_10_status?: number | null
          pdm_output_10_voltage?: number | null
          pdm_output_11_current?: number | null
          pdm_output_11_load?: number | null
          pdm_output_11_status?: number | null
          pdm_output_11_voltage?: number | null
          pdm_output_12_current?: number | null
          pdm_output_12_load?: number | null
          pdm_output_12_status?: number | null
          pdm_output_12_voltage?: number | null
          pdm_output_13_current?: number | null
          pdm_output_13_load?: number | null
          pdm_output_13_status?: number | null
          pdm_output_13_voltage?: number | null
          pdm_output_14_current?: number | null
          pdm_output_14_load?: number | null
          pdm_output_14_status?: number | null
          pdm_output_14_voltage?: number | null
          pdm_output_15_current?: number | null
          pdm_output_15_load?: number | null
          pdm_output_15_status?: number | null
          pdm_output_15_voltage?: number | null
          pdm_output_2_current?: number | null
          pdm_output_2_load?: number | null
          pdm_output_2_status?: number | null
          pdm_output_2_voltage?: number | null
          pdm_output_3_current?: number | null
          pdm_output_3_load?: number | null
          pdm_output_3_status?: number | null
          pdm_output_3_voltage?: number | null
          pdm_output_4_current?: number | null
          pdm_output_4_load?: number | null
          pdm_output_4_status?: number | null
          pdm_output_4_voltage?: number | null
          pdm_output_9_current?: number | null
          pdm_output_9_load?: number | null
          pdm_output_9_status?: number | null
          pdm_output_9_voltage?: number | null
          pdm_reset_source?: number | null
          pdm_temp?: number | null
          pdm_total_current?: number | null
          pitch_rotational_rate?: number | null
          race_time_reset_switch?: number | null
          reference_lap_time?: number | null
          reference_lap_time_reset?: number | null
          rf_rotor_temp_01_2?: number | null
          rf_rotor_temp_02_2?: number | null
          rf_rotor_temp_03_2?: number | null
          rf_rotor_temp_04_2?: number | null
          rf_rotor_temp_05_2?: number | null
          rf_rotor_temp_06_2?: number | null
          rf_rotor_temp_07_2?: number | null
          rf_rotor_temp_08_2?: number | null
          rf_rotor_temp_09_2?: number | null
          rf_rotor_temp_10_2?: number | null
          rf_rotor_temp_11_2?: number | null
          rf_rotor_temp_12_2?: number | null
          rf_rotor_temp_13_2?: number | null
          rf_rotor_temp_14_2?: number | null
          rf_rotor_temp_15_2?: number | null
          rf_rotor_temp_16_2?: number | null
          rf_sensor_temp_2?: number | null
          rf_tire_temp_01?: number | null
          rf_tire_temp_02?: number | null
          rf_tire_temp_03?: number | null
          rf_tire_temp_04?: number | null
          rf_tire_temp_05?: number | null
          rf_tire_temp_06?: number | null
          rf_tire_temp_07?: number | null
          rf_tire_temp_08?: number | null
          rf_tire_temp_09?: number | null
          rf_tire_temp_10?: number | null
          rf_tire_temp_11?: number | null
          rf_tire_temp_12?: number | null
          rf_tire_temp_13?: number | null
          rf_tire_temp_14?: number | null
          rf_tire_temp_15?: number | null
          rf_tire_temp_16?: number | null
          roll_rotational_rate?: number | null
          rr_rotor_temp_01_2?: number | null
          rr_rotor_temp_02_2?: number | null
          rr_rotor_temp_03_2?: number | null
          rr_rotor_temp_04_2?: number | null
          rr_rotor_temp_05_2?: number | null
          rr_rotor_temp_06_2?: number | null
          rr_rotor_temp_07_2?: number | null
          rr_rotor_temp_08_2?: number | null
          rr_rotor_temp_09_2?: number | null
          rr_rotor_temp_10_2?: number | null
          rr_rotor_temp_11_2?: number | null
          rr_rotor_temp_12_2?: number | null
          rr_rotor_temp_13_2?: number | null
          rr_rotor_temp_14_2?: number | null
          rr_rotor_temp_15_2?: number | null
          rr_rotor_temp_16_2?: number | null
          rr_sensor_temp_2?: number | null
          rr_tire_temp_01?: number | null
          rr_tire_temp_02?: number | null
          rr_tire_temp_03?: number | null
          rr_tire_temp_04?: number | null
          rr_tire_temp_05?: number | null
          rr_tire_temp_06?: number | null
          rr_tire_temp_07?: number | null
          rr_tire_temp_08?: number | null
          rr_tire_temp_09?: number | null
          rr_tire_temp_10?: number | null
          rr_tire_temp_11?: number | null
          rr_tire_temp_12?: number | null
          rr_tire_temp_13?: number | null
          rr_tire_temp_14?: number | null
          rr_tire_temp_15?: number | null
          rr_tire_temp_16?: number | null
          rtc_utc_time?: number | null
          running_lap_time?: number | null
          session_id?: string
          session_reset?: number | null
          session_time?: number | null
          shock_displacment_fl?: number | null
          shock_displacment_fr?: number | null
          shock_displacment_rl?: number | null
          shock_displacment_rr?: number | null
          throttle_aim?: number | null
          throttle_aim_state?: number | null
          throttle_limit?: number | null
          throttle_limit_state?: number | null
          throttle_pedal?: number | null
          throttle_pedal_sensor?: number | null
          throttle_pedal_sensor_diagnostic?: number | null
          throttle_pedal_sensor_main_diagnostic?: number | null
          throttle_pedal_sensor_tracking_diagnostic?: number | null
          throttle_position?: number | null
          throttle_position_sensor_diagnostic?: number | null
          throttle_servo_bank_1_diagnostic?: number | null
          throttle_servo_bank_1_position_sensor_diagnostic?: number | null
          throttle_servo_bank_1_position_sensor_main_diagnostic?: number | null
          throttle_servo_bank_1_position_sensor_tracking_diagnostic?:
            | number
            | null
          throttle_servo_bank_2_diagnostic?: number | null
          throttle_servo_bank_2_position_sensor_diagnostic?: number | null
          throttle_servo_bank_2_position_sensor_main_diagnostic?: number | null
          throttle_servo_bank_2_position_sensor_tracking_diagnostic?:
            | number
            | null
          time?: number | null
          trip_distance?: number | null
          vehicle_accel_lateral?: number | null
          vehicle_accel_long?: number | null
          vehicle_accel_vert?: number | null
          vehicle_speed?: number | null
          vehicle_yaw_rate?: number | null
          vertical_acceleration?: number | null
          warning_light?: number | null
          warning_source?: number | null
          wheel_speed_fl?: number | null
          wheel_speed_fr?: number | null
          wheel_speed_rl?: number | null
          wheel_speed_rr?: number | null
          yaw_rotational_rate?: number | null
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
          processing_progress: number | null
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
          processing_progress?: number | null
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
          processing_progress?: number | null
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
      add_telemetry_column: {
        Args: { column_name: string; column_type?: string }
        Returns: undefined
      }
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
