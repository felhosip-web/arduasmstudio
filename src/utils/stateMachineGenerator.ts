/**
 * (c) 2026 AI Studio AVR Visual Studio
 * Enhanced Finite State Machine (FSM) Engine & Dual ASM / C Code Generator
 * Supports Visual Graph Canvas, Interactive Real-time Simulation,
 * Cycle-accurate AVR Assembly (IJMP Jump Table / CPI Branch) & Modern C99 / C++ Code.
 */

import { ProgramBlock, ArduinoPin, VariableDefinition } from '../types';

export type TriggerType =
  | 'timer_timeout'
  | 'pin_digital_read'
  | 'analog_threshold'
  | 'uart_command'
  | 'register_condition'
  | 'flag_event'
  | 'manual_transition';

export type FsmDispatchArch = 'jump_table' | 'cpi_branch' | 'function_pointers';

export interface FsmStateAction {
  id?: string;
  type: 'pin_write' | 'pin_toggle' | 'delay' | 'uart_print' | 'pwm_write' | 'reg_load' | 'asm_snippet';
  pin?: ArduinoPin;
  pinLevel?: 'HIGH' | 'LOW';
  delayMs?: number;
  text?: string;
  pwmDuty?: number;
  reg?: string;
  regValue?: number;
  asmCode?: string;
}

export interface FsmState {
  id: string;
  name: string; // e.g. "STATE_RED"
  label: string; // e.g. "Piros Fázis"
  description: string;
  color: string;
  isInitial?: boolean;
  stateCode: number; // 0, 1, 2, 3...
  actions: FsmStateAction[]; // standard / during actions
  entryActions?: FsmStateAction[];
  exitActions?: FsmStateAction[];
  position?: { x: number; y: number };
}

export interface FsmTransition {
  id: string;
  fromStateId: string;
  toStateId: string;
  label: string;
  triggerType: TriggerType;
  triggerPin?: ArduinoPin;
  triggerLevel?: 'HIGH' | 'LOW';
  timeoutMs?: number;
  thresholdValue?: number;
  analogPin?: string;
  uartChar?: string;
  register?: string;
  regOperator?: '==' | '!=' | '>' | '<' | '>=' | '<=';
  regValue?: number;
  guardCondition?: string;
  actionCode?: string;
  description: string;
}

export interface FsmProject {
  id: string;
  title: string;
  description: string;
  stateVarName: string;
  dispatchArch: FsmDispatchArch;
  states: FsmState[];
  transitions: FsmTransition[];
}

export interface FsmTemplate {
  id: string;
  title: string;
  difficulty: 'Kezdő' | 'Középhaladó' | 'Haladó';
  category: 'Közlekedés' | 'Felhasználói Interfész' | 'Protokoll & Kommunikáció' | 'Motor & Mozgás' | 'Ipar & Biztonság';
  description: string;
  fsm: FsmProject;
}

export interface FsmHistoryEntry {
  fromStateId: string;
  toStateId: string;
  fromStateName: string;
  toStateName: string;
  timestamp: number;
  triggerReason: string;
  cycle: number;
}

export interface FsmSimulationRuntime {
  activeStateId: string;
  stateTimerMs: number;
  totalTimeMs: number;
  elapsedCycles: number;
  isRunning: boolean;
  simulatedPins: Record<string, 0 | 1>;
  simulatedUartLog: string[];
  history: FsmHistoryEntry[];
  lastTriggerReason?: string;
}

// ============================================================================
// 7 REAL-WORLD EMBEDDED FSM PRESET TEMPLATES
// ============================================================================

export const FSM_TEMPLATES: FsmTemplate[] = [
  {
    id: 'traffic_light',
    title: '🚦 Okos Közlekedési Lámpa & Gyalogos Átkelő',
    difficulty: 'Kezdő',
    category: 'Közlekedés',
    description: '4 fázisú közlekedési lámpa (Piros, Piros+Sárga, Zöld, Sárga) nyomógombos gyalogos kéréssel (D2) és sárga villogó éjszakai móddal.',
    fsm: {
      id: 'fsm_traffic',
      title: 'Okos Közlekedési Lámpa Rendszer',
      description: 'Piros (D13), Sárga (D12), Zöld (D11), Gyalogos Gomb (D2)',
      stateVarName: 'fsm_traffic_state',
      dispatchArch: 'jump_table',
      states: [
        {
          id: 's_red',
          name: 'STATE_RED',
          label: 'Piros (Állj)',
          description: 'A járműforgalom áll, D13 Piros LED aktív 3000 ms-ig.',
          color: '#ef4444',
          isInitial: true,
          stateCode: 0,
          position: { x: 120, y: 80 },
          entryActions: [
            { type: 'pin_write', pin: '13', pinLevel: 'HIGH' },
            { type: 'pin_write', pin: '12', pinLevel: 'LOW' },
            { type: 'pin_write', pin: '11', pinLevel: 'LOW' },
            { type: 'uart_print', text: '[FSM] STATE: RED (Stop)\r\n' },
          ],
          actions: [
            { type: 'pin_write', pin: '13', pinLevel: 'HIGH' },
          ],
        },
        {
          id: 's_red_yellow',
          name: 'STATE_RED_YELLOW',
          label: 'Piros + Sárga (Készülj)',
          description: 'D13 és D12 egyszerre világít 1000 ms-ig felkészüléshez.',
          color: '#f59e0b',
          stateCode: 1,
          position: { x: 420, y: 80 },
          entryActions: [
            { type: 'pin_write', pin: '13', pinLevel: 'HIGH' },
            { type: 'pin_write', pin: '12', pinLevel: 'HIGH' },
            { type: 'pin_write', pin: '11', pinLevel: 'LOW' },
            { type: 'uart_print', text: '[FSM] STATE: RED+YELLOW (Get Ready)\r\n' },
          ],
          actions: [
            { type: 'pin_write', pin: '13', pinLevel: 'HIGH' },
            { type: 'pin_write', pin: '12', pinLevel: 'HIGH' },
          ],
        },
        {
          id: 's_green',
          name: 'STATE_GREEN',
          label: 'Zöld (Szabad Út)',
          description: 'D11 Zöld LED világít 4000 ms-ig. D2 gyalogos gomb sürgeti a váltást.',
          color: '#10b981',
          stateCode: 2,
          position: { x: 420, y: 320 },
          entryActions: [
            { type: 'pin_write', pin: '13', pinLevel: 'LOW' },
            { type: 'pin_write', pin: '12', pinLevel: 'LOW' },
            { type: 'pin_write', pin: '11', pinLevel: 'HIGH' },
            { type: 'uart_print', text: '[FSM] STATE: GREEN (Go)\r\n' },
          ],
          actions: [
            { type: 'pin_write', pin: '11', pinLevel: 'HIGH' },
          ],
        },
        {
          id: 's_yellow',
          name: 'STATE_YELLOW',
          label: 'Sárga (Megállás)',
          description: 'D12 Sárga LED világít 1500 ms-ig a visszaváltás előtt.',
          color: '#eab308',
          stateCode: 3,
          position: { x: 120, y: 320 },
          entryActions: [
            { type: 'pin_write', pin: '13', pinLevel: 'LOW' },
            { type: 'pin_write', pin: '12', pinLevel: 'HIGH' },
            { type: 'pin_write', pin: '11', pinLevel: 'LOW' },
            { type: 'uart_print', text: '[FSM] STATE: YELLOW (Caution)\r\n' },
          ],
          actions: [
            { type: 'pin_write', pin: '12', pinLevel: 'HIGH' },
          ],
        },
      ],
      transitions: [
        {
          id: 'tr_1',
          fromStateId: 's_red',
          toStateId: 's_red_yellow',
          label: 'Időzítés: 3000 ms',
          triggerType: 'timer_timeout',
          timeoutMs: 3000,
          description: 'Piros szakasz letelt -> Váltás Piros-Sárgára',
        },
        {
          id: 'tr_2',
          fromStateId: 's_red_yellow',
          toStateId: 's_green',
          label: 'Időzítés: 1000 ms',
          triggerType: 'timer_timeout',
          timeoutMs: 1000,
          description: 'Felkészülési fázis letelt -> Váltás Zöldre',
        },
        {
          id: 'tr_3',
          fromStateId: 's_green',
          toStateId: 's_yellow',
          label: 'Időzítés: 4000 ms',
          triggerType: 'timer_timeout',
          timeoutMs: 4000,
          description: 'Szabad jelzés időzítő letelt -> Váltás Sárgára',
        },
        {
          id: 'tr_ped',
          fromStateId: 's_green',
          toStateId: 's_yellow',
          label: 'Gyalogos Kérés (D2 LOW)',
          triggerType: 'pin_digital_read',
          triggerPin: '2',
          triggerLevel: 'LOW',
          description: 'Gyalogos átkelő gomb megnyomva -> Azonnali sárgára váltás',
        },
        {
          id: 'tr_4',
          fromStateId: 's_yellow',
          toStateId: 's_red',
          label: 'Időzítés: 1500 ms',
          triggerType: 'timer_timeout',
          timeoutMs: 1500,
          description: 'Sárga szakasz letelt -> Visszatérés Pirosra',
        },
      ],
    },
  },
  {
    id: 'button_debouncer',
    title: '🔘 Nem-blokkoló Gomb Pergésmentesítő & Dupla/Hosszú Nyomás',
    difficulty: 'Középhaladó',
    category: 'Felhasználói Interfész',
    description: 'Ipari beágyazott gombkezelő FSM: Érzékelés -> Pergésmentesítő szűrő (50 ms) -> Rövid nyomás -> Hosszú nyomás (1000 ms) detektálás.',
    fsm: {
      id: 'fsm_button',
      title: 'Non-Blocking Button Debounce & Hold FSM',
      description: 'Bemenet: D2 (Gomb INPUT_PULLUP), Kimenetek: D13 (Rövid), D12 (Hosszú)',
      stateVarName: 'fsm_button_state',
      dispatchArch: 'cpi_branch',
      states: [
        {
          id: 's_btn_idle',
          name: 'BTN_STATE_IDLE',
          label: 'Nyugalmi (Felengedve)',
          description: 'Gomb felengedve (D2 HIGH a felhúzó ellenállás miatt).',
          color: '#64748b',
          isInitial: true,
          stateCode: 0,
          position: { x: 100, y: 100 },
          actions: [],
        },
        {
          id: 's_btn_debounce',
          name: 'BTN_STATE_DEBOUNCING',
          label: 'Pergésmentesítés',
          description: '50 ms stabilizáció a mechanikus kapcsolási tüskék kiszűrésére.',
          color: '#f59e0b',
          stateCode: 1,
          position: { x: 380, y: 100 },
          actions: [],
        },
        {
          id: 's_btn_pressed',
          name: 'BTN_STATE_PRESSED',
          label: 'Lenyomva (Rövid)',
          description: 'Gomb biztosan lenyomva. D13 LED felkapcsol.',
          color: '#3b82f6',
          stateCode: 2,
          position: { x: 380, y: 320 },
          entryActions: [
            { type: 'pin_write', pin: '13', pinLevel: 'HIGH' },
            { type: 'uart_print', text: '[BTN] Short Press Event!\r\n' },
          ],
          actions: [],
        },
        {
          id: 's_btn_long_press',
          name: 'BTN_STATE_LONG_PRESS',
          label: 'Hosszú Nyomás (>1s)',
          description: '1000 ms túllépve lenyomott állapotban. D12 másodlagos LED kigyullad.',
          color: '#a855f7',
          stateCode: 3,
          position: { x: 100, y: 320 },
          entryActions: [
            { type: 'pin_write', pin: '12', pinLevel: 'HIGH' },
            { type: 'uart_print', text: '[BTN] LONG PRESS DETECTED (>1000ms)!\r\n' },
          ],
          actions: [],
        },
      ],
      transitions: [
        {
          id: 'tr_b1',
          fromStateId: 's_btn_idle',
          toStateId: 's_btn_debounce',
          label: 'Gomb Lenyomva (D2 LOW)',
          triggerType: 'pin_digital_read',
          triggerPin: '2',
          triggerLevel: 'LOW',
          description: 'Első lefutó él észlelve -> Indul a szűrő időzítő',
        },
        {
          id: 'tr_b2',
          fromStateId: 's_btn_debounce',
          toStateId: 's_btn_pressed',
          label: '50 ms szűrés letelt',
          triggerType: 'timer_timeout',
          timeoutMs: 50,
          description: 'Jel stabil maradt -> Állapot validálva',
        },
        {
          id: 'tr_b_glitch',
          fromStateId: 's_btn_debounce',
          toStateId: 's_btn_idle',
          label: 'Tüske / Felengedve (D2 HIGH)',
          triggerType: 'pin_digital_read',
          triggerPin: '2',
          triggerLevel: 'HIGH',
          description: 'Hamis kontaktus -> Vissza nyugalmi állapotba',
        },
        {
          id: 'tr_b3',
          fromStateId: 's_btn_pressed',
          toStateId: 's_btn_long_press',
          label: 'Hold Időzítés: 1000 ms',
          triggerType: 'timer_timeout',
          timeoutMs: 1000,
          description: 'Folyamatosan nyomva tartva 1 másodpercig',
        },
        {
          id: 'tr_b4',
          fromStateId: 's_btn_pressed',
          toStateId: 's_btn_idle',
          label: 'Felengedve (D2 HIGH)',
          triggerType: 'pin_digital_read',
          triggerPin: '2',
          triggerLevel: 'HIGH',
          description: 'Rövid nyomás után felengedve -> D13 lekapcsol',
        },
        {
          id: 'tr_b5',
          fromStateId: 's_btn_long_press',
          toStateId: 's_btn_idle',
          label: 'Felengedve (D2 HIGH)',
          triggerType: 'pin_digital_read',
          triggerPin: '2',
          triggerLevel: 'HIGH',
          description: 'Hosszú nyomás után felengedve -> LED-ek lekapcsolnak',
        },
      ],
    },
  },
  {
    id: 'uart_parser',
    title: '📡 UART Csomag & Protokoll Elemző (SOF/Payload/Checksum/EOF)',
    difficulty: 'Haladó',
    category: 'Protokoll & Kommunikáció',
    description: 'Robusztus bájtszintű protokoll értelmező FSM: Kezdőbájt ($) -> Parancsazonosító -> Adatbájtok -> Ellenőrzőösszeg (*) -> Lezárás (\n).',
    fsm: {
      id: 'fsm_uart',
      title: 'UART Frame Protocol Parser',
      description: 'Strukturált csomagfogadás RX interrupt / polling alapon',
      stateVarName: 'fsm_parser_state',
      dispatchArch: 'jump_table',
      states: [
        {
          id: 's_wait_sof',
          name: 'UART_STATE_WAIT_SOF',
          label: 'Kezdőbájt Várás ($)',
          description: 'Várakozás a csomagindító 0x24 ($) bájtra.',
          color: '#64748b',
          isInitial: true,
          stateCode: 0,
          position: { x: 80, y: 80 },
          actions: [],
        },
        {
          id: 's_read_cmd',
          name: 'UART_STATE_READ_CMD',
          label: 'Parancskód Olvasás',
          description: 'Parancsbájt fogadása (pl. "L"=LED, "M"=Motor, "S"=Status).',
          color: '#3b82f6',
          stateCode: 1,
          position: { x: 340, y: 80 },
          actions: [],
        },
        {
          id: 's_read_data',
          name: 'UART_STATE_READ_DATA',
          label: 'Adatbájtok Fogadása',
          description: 'Paraméterbájtok pufferelése a RAM-ba.',
          color: '#10b981',
          stateCode: 2,
          position: { x: 340, y: 280 },
          actions: [],
        },
        {
          id: 's_exec_cmd',
          name: 'UART_STATE_EXECUTE',
          label: 'Végrehajtás & ACK',
          description: 'Csomag érvényes, művelet elvégzése és válasz küldése.',
          color: '#8b5cf6',
          stateCode: 3,
          position: { x: 80, y: 280 },
          entryActions: [
            { type: 'pin_toggle', pin: '13' },
            { type: 'uart_print', text: '$ACK,OK*42\r\n' },
          ],
          actions: [],
        },
      ],
      transitions: [
        {
          id: 'tr_u1',
          fromStateId: 's_wait_sof',
          toStateId: 's_read_cmd',
          label: 'RX == \'$\' (0x24)',
          triggerType: 'uart_command',
          uartChar: '$',
          description: 'Érvényes fejléc észlelve',
        },
        {
          id: 'tr_u2',
          fromStateId: 's_read_cmd',
          toStateId: 's_read_data',
          label: 'RX Bájt Fogadva',
          triggerType: 'manual_transition',
          description: 'Parancskód eltárolva',
        },
        {
          id: 'tr_u3',
          fromStateId: 's_read_data',
          toStateId: 's_exec_cmd',
          label: 'RX == \'\\n\' (0x0A)',
          triggerType: 'uart_command',
          uartChar: '\n',
          description: 'Lezáró karakter érkezett -> Parancs feldolgozása',
        },
        {
          id: 'tr_u_timeout',
          fromStateId: 's_read_data',
          toStateId: 's_wait_sof',
          label: 'Timeout: 200 ms',
          triggerType: 'timer_timeout',
          timeoutMs: 200,
          description: 'Megszakadt csomag -> Puffer ürítése',
        },
        {
          id: 'tr_u4',
          fromStateId: 's_exec_cmd',
          toStateId: 's_wait_sof',
          label: 'Azonnali Kész',
          triggerType: 'timer_timeout',
          timeoutMs: 10,
          description: 'Visszatérés készenlétbe',
        },
      ],
    },
  },
  {
    id: 'stepper_motor',
    title: '🔄 Léptetőmotor 4-Fázisú Hullám- & Teljes Lépés Vezérlő',
    difficulty: 'Középhaladó',
    category: 'Motor & Mozgás',
    description: 'ULN2003 / H-Híd 4 fázisú tekercsvezérlő állapotgép (IN1=D8, IN2=D9, IN3=D10, IN4=D11) fordulatszám és irányváltással.',
    fsm: {
      id: 'fsm_stepper',
      title: '4-Phase Stepper Motor Commutation FSM',
      description: 'Léptetési sebesség: 10 ms fázisonként, Forgásirány: D2 gomb',
      stateVarName: 'fsm_stepper_phase',
      dispatchArch: 'jump_table',
      states: [
        {
          id: 's_step_1',
          name: 'STEPPER_PHASE_A',
          label: 'Fázis 1 (1000)',
          description: 'IN1=HIGH, IN2=LOW, IN3=LOW, IN4=LOW',
          color: '#ef4444',
          isInitial: true,
          stateCode: 0,
          position: { x: 100, y: 80 },
          entryActions: [
            { type: 'pin_write', pin: '8', pinLevel: 'HIGH' },
            { type: 'pin_write', pin: '9', pinLevel: 'LOW' },
            { type: 'pin_write', pin: '10', pinLevel: 'LOW' },
            { type: 'pin_write', pin: '11', pinLevel: 'LOW' },
          ],
          actions: [],
        },
        {
          id: 's_step_2',
          name: 'STEPPER_PHASE_B',
          label: 'Fázis 2 (0100)',
          description: 'IN1=LOW, IN2=HIGH, IN3=LOW, IN4=LOW',
          color: '#f59e0b',
          stateCode: 1,
          position: { x: 380, y: 80 },
          entryActions: [
            { type: 'pin_write', pin: '8', pinLevel: 'LOW' },
            { type: 'pin_write', pin: '9', pinLevel: 'HIGH' },
            { type: 'pin_write', pin: '10', pinLevel: 'LOW' },
            { type: 'pin_write', pin: '11', pinLevel: 'LOW' },
          ],
          actions: [],
        },
        {
          id: 's_step_3',
          name: 'STEPPER_PHASE_C',
          label: 'Fázis 3 (0010)',
          description: 'IN1=LOW, IN2=LOW, IN3=HIGH, IN4=LOW',
          color: '#10b981',
          stateCode: 2,
          position: { x: 380, y: 300 },
          entryActions: [
            { type: 'pin_write', pin: '8', pinLevel: 'LOW' },
            { type: 'pin_write', pin: '9', pinLevel: 'LOW' },
            { type: 'pin_write', pin: '10', pinLevel: 'HIGH' },
            { type: 'pin_write', pin: '11', pinLevel: 'LOW' },
          ],
          actions: [],
        },
        {
          id: 's_step_4',
          name: 'STEPPER_PHASE_D',
          label: 'Fázis 4 (0001)',
          description: 'IN1=LOW, IN2=LOW, IN3=LOW, IN4=HIGH',
          color: '#3b82f6',
          stateCode: 3,
          position: { x: 100, y: 300 },
          entryActions: [
            { type: 'pin_write', pin: '8', pinLevel: 'LOW' },
            { type: 'pin_write', pin: '9', pinLevel: 'LOW' },
            { type: 'pin_write', pin: '10', pinLevel: 'LOW' },
            { type: 'pin_write', pin: '11', pinLevel: 'HIGH' },
          ],
          actions: [],
        },
      ],
      transitions: [
        {
          id: 'tr_st1',
          fromStateId: 's_step_1',
          toStateId: 's_step_2',
          label: '10 ms Léptetés',
          triggerType: 'timer_timeout',
          timeoutMs: 10,
          description: 'Következő tekercs fázis',
        },
        {
          id: 'tr_st2',
          fromStateId: 's_step_2',
          toStateId: 's_step_3',
          label: '10 ms Léptetés',
          triggerType: 'timer_timeout',
          timeoutMs: 10,
          description: 'Következő tekercs fázis',
        },
        {
          id: 'tr_st3',
          fromStateId: 's_step_3',
          toStateId: 's_step_4',
          label: '10 ms Léptetés',
          triggerType: 'timer_timeout',
          timeoutMs: 10,
          description: 'Következő tekercs fázis',
        },
        {
          id: 'tr_st4',
          fromStateId: 's_step_4',
          toStateId: 's_step_1',
          label: '10 ms Léptetés',
          triggerType: 'timer_timeout',
          timeoutMs: 10,
          description: 'Ciklus zárás -> Vissza Fázis 1-re',
        },
      ],
    },
  },
  {
    id: 'thermostat_hysteresis',
    title: '🌡️ Hibrid Termosztát & Hiszterézis Hőmérséklet Szabályozó',
    difficulty: 'Középhaladó',
    category: 'Ipar & Biztonság',
    description: 'Pontos hiszterézises hőfokszabályozó (Készenlét -> Fűtés be D7 -> Hűtés be D8 -> Túlmelegedés Vészleállítás D13).',
    fsm: {
      id: 'fsm_thermo',
      title: 'Hysteresis Bang-Bang Temperature FSM',
      description: 'Bemenet: ADC A0, Fűtés Relé: D7, Hűtő Ventilátor: D8, Riasztás: D13',
      stateVarName: 'fsm_thermo_state',
      dispatchArch: 'cpi_branch',
      states: [
        {
          id: 's_temp_idle',
          name: 'TEMP_STATE_IDLE',
          label: 'Optimális Hőfok (Készenlét)',
          description: 'Hőmérséklet a beállított sávban (20°C - 24°C). Relék nyitva.',
          color: '#10b981',
          isInitial: true,
          stateCode: 0,
          position: { x: 260, y: 60 },
          entryActions: [
            { type: 'pin_write', pin: '7', pinLevel: 'LOW' },
            { type: 'pin_write', pin: '8', pinLevel: 'LOW' },
            { type: 'pin_write', pin: '13', pinLevel: 'LOW' },
          ],
          actions: [],
        },
        {
          id: 's_temp_heating',
          name: 'TEMP_STATE_HEATING',
          label: 'Fűtés Aktív (D7 Relé)',
          description: 'Hőfok < 20°C. Fűtőszál bekapcsolva.',
          color: '#f97316',
          stateCode: 1,
          position: { x: 80, y: 260 },
          entryActions: [
            { type: 'pin_write', pin: '7', pinLevel: 'HIGH' },
            { type: 'pin_write', pin: '8', pinLevel: 'LOW' },
          ],
          actions: [],
        },
        {
          id: 's_temp_cooling',
          name: 'TEMP_STATE_COOLING',
          label: 'Hűtés Aktív (D8 Ventilátor)',
          description: 'Hőfok > 26°C. Hűtőventilátor bekapcsolva.',
          color: '#06b6d4',
          stateCode: 2,
          position: { x: 440, y: 260 },
          entryActions: [
            { type: 'pin_write', pin: '7', pinLevel: 'LOW' },
            { type: 'pin_write', pin: '8', pinLevel: 'HIGH' },
          ],
          actions: [],
        },
      ],
      transitions: [
        {
          id: 'tr_th1',
          fromStateId: 's_temp_idle',
          toStateId: 's_temp_heating',
          label: 'ADC < 400 (<20°C)',
          triggerType: 'analog_threshold',
          analogPin: 'A0',
          thresholdValue: 400,
          description: 'Hőmérséklet alsó hiszterézis határ alá esett',
        },
        {
          id: 'tr_th2',
          fromStateId: 's_temp_heating',
          toStateId: 's_temp_idle',
          label: 'ADC >= 512 (>=22°C)',
          triggerType: 'analog_threshold',
          analogPin: 'A0',
          thresholdValue: 512,
          description: 'Elérte a célhőmérsékletet -> Fűtés kikapcsolása',
        },
        {
          id: 'tr_th3',
          fromStateId: 's_temp_idle',
          toStateId: 's_temp_cooling',
          label: 'ADC > 650 (>26°C)',
          triggerType: 'analog_threshold',
          analogPin: 'A0',
          thresholdValue: 650,
          description: 'Hőmérséklet felső hiszterézis határ fölé emelkedett',
        },
        {
          id: 'tr_th4',
          fromStateId: 's_temp_cooling',
          toStateId: 's_temp_idle',
          label: 'ADC <= 512 (<=22°C)',
          triggerType: 'analog_threshold',
          analogPin: 'A0',
          thresholdValue: 512,
          description: 'Visszahűlt normál szintre -> Ventilátor leállítása',
        },
      ],
    },
  },
  {
    id: 'security_alarm',
    title: '🚨 Ipari Riasztó & Behatolásvédelmi Rendszer',
    difficulty: 'Haladó',
    category: 'Ipar & Biztonság',
    description: 'Biztonsági állapotgép: Hatástalanítva -> Élesítési visszaszámlálás -> Élesítve -> Behatolás észlelve -> Sziréna riasztás (D13 + D9).',
    fsm: {
      id: 'fsm_alarm',
      title: 'Ipari Riasztó & Behatolásvédelmi Rendszer',
      description: 'PIR mozgásérzékelő (D2), Élesítő kulcs (D3), Sziréna (D13), Hangjelző (D9)',
      stateVarName: 'fsm_alarm_state',
      dispatchArch: 'jump_table',
      states: [
        {
          id: 's_disarmed',
          name: 'STATE_DISARMED',
          label: 'Hatástalanítva (Zöld)',
          description: 'Rendszer inaktív, épület szabadon látogatható.',
          color: '#10b981',
          isInitial: true,
          stateCode: 0,
          position: { x: 80, y: 100 },
          entryActions: [
            { type: 'pin_write', pin: '13', pinLevel: 'LOW' },
            { type: 'pin_write', pin: '9', pinLevel: 'LOW' },
          ],
          actions: [],
        },
        {
          id: 's_arming_delay',
          name: 'STATE_ARMING_DELAY',
          label: 'Élesítés (Késleltetés)',
          description: '5000 ms visszaszámlálás a helyiség elhagyására.',
          color: '#f59e0b',
          stateCode: 1,
          position: { x: 380, y: 100 },
          entryActions: [
            { type: 'uart_print', text: '[ALARM] Arming in 5 seconds...\r\n' },
          ],
          actions: [],
        },
        {
          id: 's_armed',
          name: 'STATE_ARMED_ACTIVE',
          label: 'Élesítve (Aktív Védelem)',
          description: 'A rendszer figyel a mozgásérzékelőre (D2 HIGH).',
          color: '#6366f1',
          stateCode: 2,
          position: { x: 380, y: 320 },
          entryActions: [
            { type: 'pin_write', pin: '13', pinLevel: 'LOW' },
            { type: 'uart_print', text: '[ALARM] ARMED & SECURED\r\n' },
          ],
          actions: [],
        },
        {
          id: 's_alarm',
          name: 'STATE_ALARM_SIREN',
          label: 'RIASZTÁS! Sziréna & Villogó',
          description: 'Behatolás történik: D13 sziréna és D9 csipogó maximális erővel riaszt.',
          color: '#ef4444',
          stateCode: 3,
          position: { x: 80, y: 320 },
          entryActions: [
            { type: 'pin_write', pin: '13', pinLevel: 'HIGH' },
            { type: 'pin_write', pin: '9', pinLevel: 'HIGH' },
            { type: 'uart_print', text: '[ALARM] INTRUSION DETECTED! SIREN ACTIVE!\r\n' },
          ],
          actions: [],
        },
      ],
      transitions: [
        {
          id: 'tr_a1',
          fromStateId: 's_disarmed',
          toStateId: 's_arming_delay',
          label: 'Élesítő Gomb (D3 LOW)',
          triggerType: 'pin_digital_read',
          triggerPin: '3',
          triggerLevel: 'LOW',
          description: 'Élesítési folyamat indítása',
        },
        {
          id: 'tr_a2',
          fromStateId: 's_arming_delay',
          toStateId: 's_armed',
          label: '5000 ms Időzítés letelt',
          triggerType: 'timer_timeout',
          timeoutMs: 5000,
          description: 'Helyiség elhagyva -> Rendszer élesítve',
        },
        {
          id: 'tr_a3',
          fromStateId: 's_armed',
          toStateId: 's_alarm',
          label: 'Mozgásérzékelő (D2 HIGH)',
          triggerType: 'pin_digital_read',
          triggerPin: '2',
          triggerLevel: 'HIGH',
          description: 'Illetéktelen behatolás észlelve -> Riasztás!',
        },
        {
          id: 'tr_a4',
          fromStateId: 's_alarm',
          toStateId: 's_disarmed',
          label: 'Kulcs / Kikapcsolás (D3 LOW)',
          triggerType: 'pin_digital_read',
          triggerPin: '3',
          triggerLevel: 'LOW',
          description: 'Riasztás feloldása biztonsági kulccsal',
        },
        {
          id: 'tr_a5',
          fromStateId: 's_arming_delay',
          toStateId: 's_disarmed',
          label: 'Megszakítás (D3 LOW)',
          triggerType: 'pin_digital_read',
          triggerPin: '3',
          triggerLevel: 'LOW',
          description: 'Élesítés visszavonása még az időzítés alatt',
        },
      ],
    },
  },
  {
    id: 'microwave_timer',
    title: '⏱️ Mikrohullámú Sütő & Időzítő Állapotgép',
    difficulty: 'Középhaladó',
    category: 'Felhasználói Interfész',
    description: 'Klasszikus beágyazott háztartási gép vezérlő: Készenlét -> Melegítés (D7 Relé) -> Ajtónyitás / Szünet (D2) -> Befejezés (D8 Csipogó).',
    fsm: {
      id: 'fsm_microwave',
      title: 'Mikrohullámú Sütő Vezérlő Állapotgép',
      description: 'Fűtőrelé: D7, Ajtókapcsoló: D2, Csipogó: D8, Start: D3',
      stateVarName: 'fsm_oven_state',
      dispatchArch: 'jump_table',
      states: [
        {
          id: 's_standby',
          name: 'STATE_STANDBY',
          label: 'Készenlét (Standby)',
          description: 'Fűtés kikapcsolva, vár a start gombra (D3 LOW).',
          color: '#64748b',
          isInitial: true,
          stateCode: 0,
          position: { x: 100, y: 100 },
          entryActions: [
            { type: 'pin_write', pin: '7', pinLevel: 'LOW' },
            { type: 'pin_write', pin: '8', pinLevel: 'LOW' },
          ],
          actions: [],
        },
        {
          id: 's_heating',
          name: 'STATE_HEATING',
          label: 'Melegítés (D7 Relé)',
          description: 'D7 Fűtőrelé behúzva, magnetron aktív 5000 ms-ig.',
          color: '#f97316',
          stateCode: 1,
          position: { x: 380, y: 100 },
          entryActions: [
            { type: 'pin_write', pin: '7', pinLevel: 'HIGH' },
            { type: 'pin_write', pin: '8', pinLevel: 'LOW' },
          ],
          actions: [],
        },
        {
          id: 's_paused',
          name: 'STATE_DOOR_PAUSED',
          label: 'Szünet (Ajtó Nyitva)',
          description: 'Biztonsági leállítás: D7 relé lekapcsol, időzítő befagy.',
          color: '#eab308',
          stateCode: 2,
          position: { x: 380, y: 320 },
          entryActions: [
            { type: 'pin_write', pin: '7', pinLevel: 'LOW' },
          ],
          actions: [],
        },
        {
          id: 's_done',
          name: 'STATE_DONE_BEEP',
          label: 'Kész (Hangjelzés)',
          description: 'Melegítés sikeresen befejeződött, D8 zümmer sípol 1500 ms-ig.',
          color: '#3b82f6',
          stateCode: 3,
          position: { x: 100, y: 320 },
          entryActions: [
            { type: 'pin_write', pin: '7', pinLevel: 'LOW' },
            { type: 'pin_write', pin: '8', pinLevel: 'HIGH' },
          ],
          actions: [],
        },
      ],
      transitions: [
        {
          id: 'tr_m1',
          fromStateId: 's_standby',
          toStateId: 's_heating',
          label: 'Start Gomb (D3 LOW)',
          triggerType: 'pin_digital_read',
          triggerPin: '3',
          triggerLevel: 'LOW',
          description: 'Melegítési ciklus indítása',
        },
        {
          id: 'tr_m_door',
          fromStateId: 's_heating',
          toStateId: 's_paused',
          label: 'Ajtó Nyitva (D2 HIGH)',
          triggerType: 'pin_digital_read',
          triggerPin: '2',
          triggerLevel: 'HIGH',
          description: 'Biztonsági azonnali lekapcsolás ajtónyitásra',
        },
        {
          id: 'tr_m_resume',
          fromStateId: 's_paused',
          toStateId: 's_heating',
          label: 'Ajtó Csukva & Start (D3 LOW)',
          triggerType: 'pin_digital_read',
          triggerPin: '3',
          triggerLevel: 'LOW',
          description: 'Folytatás',
        },
        {
          id: 'tr_m2',
          fromStateId: 's_heating',
          toStateId: 's_done',
          label: 'Időzítés: 5000 ms',
          triggerType: 'timer_timeout',
          timeoutMs: 5000,
          description: 'Programidő letelt -> Csipogás',
        },
        {
          id: 'tr_m3',
          fromStateId: 's_done',
          toStateId: 's_standby',
          label: 'Időzítés: 1500 ms',
          triggerType: 'timer_timeout',
          timeoutMs: 1500,
          description: 'Hangjelzés vége -> Vissza készenlétbe',
        },
      ],
    },
  },
];

// ============================================================================
// AVR ASSEMBLY CODE GENERATOR (CYCLE-ACCURATE & MULTI-ARCH)
// ============================================================================

export interface GeneratedCodeResult {
  asmCode: string;
  cCode: string;
  flashBytes: number;
  sramBytes: number;
  maxDispatchCycles: number;
  minDispatchCycles: number;
}

export function generateFsmCode(fsm: FsmProject): GeneratedCodeResult {
  const arch = fsm.dispatchArch || 'jump_table';
  const stateVar = fsm.stateVarName || 'fsm_state';

  // Generate ASM
  let asm = `; ============================================================================\n`;
  asm += `; (c) 2026 AI Studio AVR Visual Studio - High Performance State Machine\n`;
  asm += `; Project: ${fsm.title}\n`;
  asm += `; MCU: ATmega328P @ 16.000 MHz (1 clock cycle = 62.5 ns)\n`;
  asm += `; Dispatch Architecture: ${arch === 'jump_table' ? 'O(1) Flash Jump Table (IJMP)' : arch === 'cpi_branch' ? 'Structured CPI/BREQ Switch' : 'Indirect Function Pointer'}\n`;
  asm += `; ============================================================================\n\n`;

  asm += `.include "m328Pdef.inc"\n\n`;
  asm += `; --- Regiszter Kiosztás (Register Allocation) ---\n`;
  asm += `.def state_reg   = r16    ; Aktuális állapot index (0..${fsm.states.length - 1})\n`;
  asm += `.def temp        = r17    ; Általános munkaregiszter\n`;
  asm += `.def flag_reg    = r18    ; Esemény- és állapotjelző bitek\n`;
  asm += `.def timer_l     = r24    ; 16-bites szoftveres állapot időzítő (L)\n`;
  asm += `.def timer_h     = r25    ; 16-bites szoftveres állapot időzítő (H)\n\n`;

  asm += `; --- Állapot Konstansok (.equ) ---\n`;
  fsm.states.forEach((s) => {
    asm += `.equ ${s.name.padEnd(24)} = 0x${s.stateCode.toString(16).padStart(2, '0')} ; ${s.label}\n`;
  });
  asm += `\n`;

  asm += `.cseg\n`;
  asm += `.org 0x0000\n`;
  asm += `    rjmp RESET_HANDLER      ; [2c] Reset vektor\n\n`;

  asm += `; ============================================================================\n`;
  asm += `; HARDVER INICIALIZÁLÁS (SETUP)\n`;
  asm += `; ============================================================================\n`;
  asm += `RESET_HANDLER:\n`;
  asm += `    ; Stack Pointer inicializálása (RAMEND = 0x08FF)\n`;
  asm += `    ldi temp, low(RAMEND)   ; [1c]\n`;
  asm += `    out SPL, temp           ; [1c]\n`;
  asm += `    ldi temp, high(RAMEND)  ; [1c]\n`;
  asm += `    out SPH, temp           ; [1c]\n\n`;

  // Collect IO directions
  const usedPins = new Set<string>();
  fsm.states.forEach((s) => {
    [...(s.entryActions || []), ...s.actions].forEach((a) => {
      if (a.pin) usedPins.add(a.pin);
    });
  });

  asm += `    ; I/O Portok konfigurálása (DDRB, DDRC, DDRD)\n`;
  asm += `    ldi temp, 0b00111111    ; [1c] PB0..PB5 kimenetek (D8..D13)\n`;
  asm += `    out DDRB, temp          ; [1c]\n`;
  asm += `    ldi temp, 0b00000000    ; [1c] PD2..PD3 gombok (INPUT_PULLUP)\n`;
  asm += `    out DDRD, temp          ; [1c]\n`;
  asm += `    ldi temp, 0b00001100    ; [1c] PD2, PD3 felhúzó ellenállások bekapcsolása\n`;
  asm += `    out PORTD, temp         ; [1c]\n\n`;

  const initial = fsm.states.find((s) => s.isInitial) || fsm.states[0];
  asm += `    ; Kezdőállapot betöltése (${initial?.name || 'STATE_0'})\n`;
  asm += `    ldi state_reg, ${initial?.name || '0'} ; [1c]\n`;
  asm += `    clr timer_l             ; [1c] Időzítő nullázása\n`;
  asm += `    clr timer_h             ; [1c]\n`;
  asm += `    rcall ENTRY_${initial?.name || 'STATE_0'} ; [3c] Belépési akciók azonnali lefutása\n\n`;

  asm += `; ============================================================================\n`;
  asm += `; FSM FŐCIKLUS & DISPATCHER (MAIN DISPATCH ENGINE)\n`;
  asm += `; ============================================================================\n`;
  asm += `FSM_MAIN_LOOP:\n`;

  if (arch === 'jump_table') {
    asm += `    ; --- 1. O(1) Ugrótáblás Dispatcher (IJMP) ---\n`;
    asm += `    ldi ZL, low(FSM_JUMP_TABLE * 2) ; [1c] Program memória bájtcím betöltése\n`;
    asm += `    ldi ZH, high(FSM_JUMP_TABLE * 2); [1c]\n`;
    asm += `    mov temp, state_reg     ; [1c] Állapot index másolása\n`;
    asm += `    lsl temp                ; [1c] * 2 szó-eltolás számítás\n`;
    asm += `    add ZL, temp            ; [1c] Z mutató növelése\n`;
    asm += `    adc ZH, __zero_reg__    ; [1c]\n`;
    asm += `    lpm r0, Z+              ; [3c] Alacsony címbájt olvasása Flashből\n`;
    asm += `    lpm r1, Z               ; [3c] Magas címbájt olvasása Flashből\n`;
    asm += `    movw ZL, r0             ; [1c] Z = Cél rutin címe\n`;
    asm += `    ijmp                    ; [2c] Közvetett ugrás az aktív állapotra!\n\n`;

    asm += `; --- Flash Ugrótábla (Program Memory Jump Table) ---\n`;
    asm += `.align 2\n`;
    asm += `FSM_JUMP_TABLE:\n`;
    fsm.states.forEach((s) => {
      asm += `    .dw HANDLER_${s.name.padEnd(20)} ; [State ${s.stateCode}] -> ${s.label}\n`;
    });
    asm += `\n`;
  } else {
    asm += `    ; --- 2. CPI / BREQ Switch-Case Dispatcher ---\n`;
    fsm.states.forEach((s) => {
      asm += `    cpi state_reg, ${s.name.padEnd(20)} ; [1c] Is state == ${s.name}?\n`;
      asm += `    breq HANDLER_${s.name.padEnd(19)} ; [1c false / 2c true] -> Ugrás kezelőre\n`;
    });
    asm += `    ; Ismeretlen állapot védelem (Safety fallback)\n`;
    asm += `    ldi state_reg, 0        ; [1c] Visszaállás 0-s állapotra\n`;
    asm += `    rjmp FSM_MAIN_LOOP      ; [2c]\n\n`;
  }

  asm += `; ============================================================================\n`;
  asm += `; ÁLLAPOT KEZELŐK & ÁTMENET LOGIKA (STATE HANDLERS & TRANSITIONS)\n`;
  asm += `; ============================================================================\n\n`;

  fsm.states.forEach((state) => {
    asm += `; ----------------------------------------------------------------------------\n`;
    asm += `; ÁLLAPOT: ${state.label} (${state.name} = ${state.stateCode})\n`;
    asm += `; ----------------------------------------------------------------------------\n`;
    asm += `HANDLER_${state.name}:\n`;

    // State periodic actions
    if (state.actions.length > 0) {
      state.actions.forEach((a) => {
        if (a.type === 'pin_write' && a.pin) {
          const pinNum = parseInt(a.pin, 10);
          if (pinNum >= 8 && pinNum <= 13) {
            const bit = pinNum - 8;
            asm += `    ${a.pinLevel === 'HIGH' ? 'sbi' : 'cbi'} PORTB, ${bit}       ; [2c] Pin ${a.pin} = ${a.pinLevel}\n`;
          }
        }
      });
    }

    // Transitions from this state
    const outgoing = fsm.transitions.filter((t) => t.fromStateId === state.id);
    if (outgoing.length === 0) {
      asm += `    rjmp FSM_MAIN_LOOP      ; [2c] Ciklus ismétlése (Trap/Halt state)\n\n`;
    } else {
      outgoing.forEach((trans, idx) => {
        const targetState = fsm.states.find((s) => s.id === trans.toStateId) || fsm.states[0];

        asm += `    ; Átmenet #${idx + 1}: ${trans.label} -> ${targetState.name}\n`;
        if (trans.triggerType === 'timer_timeout' && trans.timeoutMs) {
          const loops = Math.max(1, Math.round(trans.timeoutMs / 10));
          asm += `    adiw timer_l, 1         ; [2c] Állapot időzítő növelése (10ms tick)\n`;
          asm += `    cpi timer_l, low(${loops}) ; [1c] Időzítés határérték ellenőrzés (${trans.timeoutMs} ms)\n`;
          asm += `    ldi temp, high(${loops}) ; [1c]\n`;
          asm += `    cpc timer_h, temp       ; [1c]\n`;
          asm += `    brcs SKIP_TR_${trans.id}  ; [1c false / 2c true] Ha még nem telt le -> tovább\n`;
          asm += `    ; --- ÁTMENET VÉGREHAJTÁSA ---\n`;
          if (state.exitActions && state.exitActions.length > 0) {
            asm += `    rcall EXIT_${state.name}   ; [3c] Kilépési akciók\n`;
          }
          asm += `    ldi state_reg, ${targetState.name} ; [1c] Új állapot beállítása\n`;
          asm += `    clr timer_l             ; [1c] Időzítő nullázása\n`;
          asm += `    clr timer_h             ; [1c]\n`;
          if (targetState.entryActions && targetState.entryActions.length > 0) {
            asm += `    rcall ENTRY_${targetState.name} ; [3c] Belépési akciók futtatása\n`;
          }
          asm += `    rjmp FSM_MAIN_LOOP      ; [2c]\n`;
          asm += `SKIP_TR_${trans.id}:\n`;
        } else if (trans.triggerType === 'pin_digital_read' && trans.triggerPin) {
          const pinNum = parseInt(trans.triggerPin, 10);
          if (pinNum >= 0 && pinNum <= 7) {
            const bit = pinNum;
            asm += `    ${trans.triggerLevel === 'LOW' ? 'sbic' : 'sbis'} PIND, ${bit}       ; [1c/2c] Gombnyomás vizsgálat (D${pinNum})\n`;
            asm += `    rjmp SKIP_TR_${trans.id}  ; [2c] Nincs lenyomva -> átugrás\n`;
            asm += `    ; --- ÁTMENET VÉGREHAJTÁSA ---\n`;
            if (state.exitActions && state.exitActions.length > 0) {
              asm += `    rcall EXIT_${state.name}   ; [3c] Kilépési akciók\n`;
            }
            asm += `    ldi state_reg, ${targetState.name} ; [1c]\n`;
            asm += `    clr timer_l             ; [1c]\n`;
            asm += `    clr timer_h             ; [1c]\n`;
            if (targetState.entryActions && targetState.entryActions.length > 0) {
              asm += `    rcall ENTRY_${targetState.name} ; [3c]\n`;
            }
            asm += `    rjmp FSM_MAIN_LOOP      ; [2c]\n`;
            asm += `SKIP_TR_${trans.id}:\n`;
          }
        }
      });
      asm += `    rjmp FSM_MAIN_LOOP      ; [2c] Ciklus zárása\n\n`;
    }

    // Generate ENTRY and EXIT Subroutines for this state
    asm += `ENTRY_${state.name}:\n`;
    if (state.entryActions && state.entryActions.length > 0) {
      state.entryActions.forEach((a) => {
        if (a.type === 'pin_write' && a.pin) {
          const pinNum = parseInt(a.pin, 10);
          if (pinNum >= 8 && pinNum <= 13) {
            const bit = pinNum - 8;
            asm += `    ${a.pinLevel === 'HIGH' ? 'sbi' : 'cbi'} PORTB, ${bit}       ; [2c] Pin ${a.pin} = ${a.pinLevel}\n`;
          }
        }
      });
    } else {
      asm += `    nop                     ; [1c] Nincs külön belépési feladat\n`;
    }
    asm += `    ret                     ; [4c]\n\n`;

    asm += `EXIT_${state.name}:\n`;
    if (state.exitActions && state.exitActions.length > 0) {
      state.exitActions.forEach((a) => {
        if (a.type === 'pin_write' && a.pin) {
          const pinNum = parseInt(a.pin, 10);
          if (pinNum >= 8 && pinNum <= 13) {
            const bit = pinNum - 8;
            asm += `    ${a.pinLevel === 'HIGH' ? 'sbi' : 'cbi'} PORTB, ${bit}       ; [2c] Pin ${a.pin} = ${a.pinLevel}\n`;
          }
        }
      });
    } else {
      asm += `    nop                     ; [1c]\n`;
    }
    asm += `    ret                     ; [4c]\n\n`;
  });

  // Generate Modern C / Arduino equivalent code
  let c = `/**\n`;
  c += ` * (c) 2026 AI Studio AVR Visual Studio - Modern C / Arduino FSM Code\n`;
  c += ` * Project: ${fsm.title}\n`;
  c += ` * Architecture: Non-blocking millis() state dispatcher\n`;
  c += ` */\n\n`;
  c += `#include <Arduino.h>\n\n`;

  c += `// --- Állapot Definíciók (State Enum) ---\n`;
  c += `typedef enum {\n`;
  fsm.states.forEach((s) => {
    c += `  ${s.name.padEnd(24)} = ${s.stateCode}, // ${s.label}\n`;
  });
  c += `} fsm_state_t;\n\n`;

  c += `// --- Globális Állapotváltozók ---\n`;
  c += `volatile fsm_state_t ${stateVar} = ${initial?.name || 'STATE_0'};\n`;
  c += `unsigned long state_entry_time = 0;\n\n`;

  c += `// --- Függvény Prototípusok ---\n`;
  fsm.states.forEach((s) => {
    c += `void on_entry_${s.name.toLowerCase()}(void);\n`;
    c += `void on_exit_${s.name.toLowerCase()}(void);\n`;
  });
  c += `void transition_to(fsm_state_t next_state);\n\n`;

  c += `void setup() {\n`;
  c += `  Serial.begin(115200);\n`;
  c += `  Serial.println(F("[FSM] ${fsm.title} Initializing..."));\n\n`;
  c += `  // I/O Lábak beállítása\n`;
  c += `  DDRB |= 0b00111111; // D8..D13 OUTPUT\n`;
  c += `  pinMode(2, INPUT_PULLUP);\n`;
  c += `  pinMode(3, INPUT_PULLUP);\n\n`;
  c += `  state_entry_time = millis();\n`;
  c += `  on_entry_${initial?.name.toLowerCase()}();\n`;
  c += `}\n\n`;

  c += `void loop() {\n`;
  c += `  unsigned long elapsed = millis() - state_entry_time;\n\n`;
  c += `  switch (${stateVar}) {\n`;
  fsm.states.forEach((state) => {
    c += `    case ${state.name}: {\n`;
    const outgoing = fsm.transitions.filter((t) => t.fromStateId === state.id);
    outgoing.forEach((trans) => {
      const target = fsm.states.find((s) => s.id === trans.toStateId) || fsm.states[0];
      if (trans.triggerType === 'timer_timeout' && trans.timeoutMs) {
        c += `      // ${trans.label}\n`;
        c += `      if (elapsed >= ${trans.timeoutMs}) {\n`;
        c += `        transition_to(${target.name});\n`;
        c += `      }\n`;
      } else if (trans.triggerType === 'pin_digital_read' && trans.triggerPin) {
        c += `      // ${trans.label}\n`;
        c += `      if (digitalRead(${trans.triggerPin}) == ${trans.triggerLevel}) {\n`;
        c += `        transition_to(${target.name});\n`;
        c += `      }\n`;
      }
    });
    c += `      break;\n`;
    c += `    }\n`;
  });
  c += `    default:\n`;
  c += `      transition_to(${initial?.name || '0'});\n`;
  c += `      break;\n`;
  c += `  }\n`;
  c += `}\n\n`;

  c += `// --- Állapotváltó Segédfüggvény ---\n`;
  c += `void transition_to(fsm_state_t next_state) {\n`;
  c += `  // Kilépési akciók az előző állapotból\n`;
  c += `  switch (${stateVar}) {\n`;
  fsm.states.forEach((s) => {
    c += `    case ${s.name}: on_exit_${s.name.toLowerCase()}(); break;\n`;
  });
  c += `  }\n\n`;
  c += `  ${stateVar} = next_state;\n`;
  c += `  state_entry_time = millis();\n\n`;
  c += `  // Belépési akciók az új állapotban\n`;
  c += `  switch (${stateVar}) {\n`;
  fsm.states.forEach((s) => {
    c += `    case ${s.name}: on_entry_${s.name.toLowerCase()}(); break;\n`;
  });
  c += `  }\n`;
  c += `}\n\n`;

  // State subroutines
  fsm.states.forEach((s) => {
    c += `void on_entry_${s.name.toLowerCase()}() {\n`;
    (s.entryActions || []).forEach((a) => {
      if (a.type === 'pin_write' && a.pin) {
        c += `  digitalWrite(${a.pin}, ${a.pinLevel});\n`;
      } else if (a.type === 'uart_print' && a.text) {
        c += `  Serial.print(F(${JSON.stringify(a.text)}));\n`;
      }
    });
    c += `}\n\n`;

    c += `void on_exit_${s.name.toLowerCase()}() {\n`;
    (s.exitActions || []).forEach((a) => {
      if (a.type === 'pin_write' && a.pin) {
        c += `  digitalWrite(${a.pin}, ${a.pinLevel});\n`;
      }
    });
    c += `}\n\n`;
  });

  const flashBytes = 128 + fsm.states.length * 24 + fsm.transitions.length * 16;
  const sramBytes = 4 + fsm.states.length * 2;
  const maxDispatchCycles = arch === 'jump_table' ? 14 : fsm.states.length * 3 + 2;
  const minDispatchCycles = arch === 'jump_table' ? 14 : 3;

  return {
    asmCode: asm,
    cCode: c,
    flashBytes,
    sramBytes,
    maxDispatchCycles,
    minDispatchCycles,
  };
}

// ============================================================================
// REAL-TIME FSM SIMULATION ENGINE (STEPPING & EVENT INJECTION)
// ============================================================================

export function createInitialFsmRuntime(fsm: FsmProject): FsmSimulationRuntime {
  const initial = fsm.states.find((s) => s.isInitial) || fsm.states[0];
  const initialPins: Record<string, 0 | 1> = {
    '2': 1, // D2 INPUT_PULLUP
    '3': 1, // D3 INPUT_PULLUP
    '8': 0,
    '9': 0,
    '10': 0,
    '11': 0,
    '12': 0,
    '13': 0,
  };

  // Apply initial entry actions
  if (initial?.entryActions) {
    initial.entryActions.forEach((a) => {
      if (a.pin && a.pinLevel) {
        initialPins[a.pin] = a.pinLevel === 'HIGH' ? 1 : 0;
      }
    });
  }

  return {
    activeStateId: initial?.id || '',
    stateTimerMs: 0,
    totalTimeMs: 0,
    elapsedCycles: 0,
    isRunning: false,
    simulatedPins: initialPins,
    simulatedUartLog: initial ? [`[FSM INIT] State set to ${initial.name} (${initial.label})`] : [],
    history: [],
  };
}

export function stepFsmSimulation(
  fsm: FsmProject,
  runtime: FsmSimulationRuntime,
  deltaMs: number = 50,
  forcedTrigger?: { type: TriggerType; pin?: string; uartChar?: string }
): FsmSimulationRuntime {
  const next = { ...runtime, simulatedPins: { ...runtime.simulatedPins } };
  const currentState = fsm.states.find((s) => s.id === next.activeStateId) || fsm.states[0];
  if (!currentState) return next;

  next.stateTimerMs += deltaMs;
  next.totalTimeMs += deltaMs;
  next.elapsedCycles += deltaMs * 16000; // 16 MHz clock

  const outgoing = fsm.transitions.filter((t) => t.fromStateId === currentState.id);
  let firedTransition: FsmTransition | undefined;
  let reason = '';

  // Check manual/forced trigger first
  if (forcedTrigger) {
    firedTransition = outgoing.find((t) => {
      if (t.triggerType === forcedTrigger.type) {
        if (forcedTrigger.type === 'pin_digital_read' && t.triggerPin === forcedTrigger.pin) return true;
        if (forcedTrigger.type === 'uart_command' && t.uartChar === forcedTrigger.uartChar) return true;
        if (forcedTrigger.type === 'manual_transition') return true;
      }
      return false;
    });
    if (firedTransition) {
      reason = `Forced Event: ${firedTransition.label}`;
    }
  }

  // Check normal automatic triggers if not already fired
  if (!firedTransition) {
    for (const tr of outgoing) {
      if (tr.triggerType === 'timer_timeout' && tr.timeoutMs && next.stateTimerMs >= tr.timeoutMs) {
        firedTransition = tr;
        reason = `Timer Timeout (${tr.timeoutMs} ms reached)`;
        break;
      }
      if (tr.triggerType === 'pin_digital_read' && tr.triggerPin) {
        const currentPinVal = next.simulatedPins[tr.triggerPin] ?? 1;
        const targetVal = tr.triggerLevel === 'HIGH' ? 1 : 0;
        if (currentPinVal === targetVal) {
          firedTransition = tr;
          reason = `Pin D${tr.triggerPin} == ${tr.triggerLevel}`;
          break;
        }
      }
    }
  }

  // Execute State Transition
  if (firedTransition) {
    const targetState = fsm.states.find((s) => s.id === firedTransition.toStateId);
    if (targetState) {
      // 1. Exit Actions of current state
      if (currentState.exitActions) {
        currentState.exitActions.forEach((act) => {
          if (act.pin && act.pinLevel) {
            next.simulatedPins[act.pin] = act.pinLevel === 'HIGH' ? 1 : 0;
          }
        });
      }

      // 2. Switch active state & reset timer
      next.activeStateId = targetState.id;
      next.stateTimerMs = 0;
      next.lastTriggerReason = reason;

      // 3. Entry Actions of target state
      if (targetState.entryActions) {
        targetState.entryActions.forEach((act) => {
          if (act.pin && act.pinLevel) {
            next.simulatedPins[act.pin] = act.pinLevel === 'HIGH' ? 1 : 0;
          }
          if (act.type === 'uart_print' && act.text) {
            next.simulatedUartLog = [...next.simulatedUartLog.slice(-40), act.text.trim()];
          }
        });
      }

      // 4. Log History
      const historyEntry: FsmHistoryEntry = {
        fromStateId: currentState.id,
        toStateId: targetState.id,
        fromStateName: currentState.name,
        toStateName: targetState.name,
        timestamp: next.totalTimeMs,
        triggerReason: reason,
        cycle: next.elapsedCycles,
      };

      next.history = [historyEntry, ...next.history].slice(0, 50);
      next.simulatedUartLog = [
        ...next.simulatedUartLog.slice(-40),
        `[FSM TR] ${currentState.name} -> ${targetState.name} (${reason})`,
      ];
    }
  }

  return next;
}

// ============================================================================
// COMPILE FSM TO CANVAS PROGRAM BLOCKS
// ============================================================================

export function compileFsmToBlocks(fsm: FsmProject): {
  blocks: ProgramBlock[];
  variable: VariableDefinition;
} {
  const blocks: ProgramBlock[] = [];
  const now = Date.now();

  const outputPins = new Set<ArduinoPin>();
  const inputPullupPins = new Set<ArduinoPin>();

  fsm.states.forEach((s) => {
    [...(s.entryActions || []), ...s.actions].forEach((a) => {
      if (a.pin) outputPins.add(a.pin);
    });
  });

  fsm.transitions.forEach((t) => {
    if (t.triggerType === 'pin_digital_read' && t.triggerPin) {
      inputPullupPins.add(t.triggerPin);
    }
  });

  // Setup I/O
  outputPins.forEach((pin) => {
    blocks.push({
      id: `fsm_setup_out_${pin}_${now}`,
      type: 'io_pin_mode',
      scope: 'setup',
      params: { pin, mode: 'OUTPUT' },
      enabled: true,
      comment: `FSM Kimenet: Pin ${pin}`,
    });
  });

  inputPullupPins.forEach((pin) => {
    blocks.push({
      id: `fsm_setup_in_${pin}_${now}`,
      type: 'io_pin_mode',
      scope: 'setup',
      params: { pin, mode: 'INPUT_PULLUP' },
      enabled: true,
      comment: `FSM Bemenet: Pin ${pin}`,
    });
  });

  // Initial state setup
  const initial = fsm.states.find((s) => s.isInitial) || fsm.states[0];
  blocks.push({
    id: `fsm_setup_init_var_${now}`,
    type: 'math_reg_load',
    scope: 'setup',
    params: { reg: 'r16', value: initial ? initial.stateCode : 0 },
    enabled: true,
    comment: `FSM Kezdőállapot: ${initial?.name || 'State 0'}`,
  });

  // Main Loop Dispatcher
  blocks.push({
    id: `fsm_lbl_main_loop_${now}`,
    type: 'flow_label',
    scope: 'loop',
    params: { labelName: 'FSM_MAIN_LOOP' },
    enabled: true,
    comment: 'FSM Központi Dispatcher',
  });

  fsm.states.forEach((state) => {
    const stateLabel = `LABEL_${state.name}`;

    blocks.push({
      id: `fsm_lbl_${state.id}_${now}`,
      type: 'flow_label',
      scope: 'loop',
      params: { labelName: stateLabel },
      enabled: true,
      comment: `=== ÁLLAPOT: ${state.label} (${state.name}) ===`,
    });

    // Actions
    [...(state.entryActions || []), ...state.actions].forEach((act, actIdx) => {
      if (act.type === 'pin_write' && act.pin) {
        blocks.push({
          id: `fsm_act_write_${state.id}_${actIdx}_${now}`,
          type: 'io_pin_write',
          scope: 'loop',
          params: { pin: act.pin, value: act.pinLevel === 'HIGH' ? 1 : 0 },
          enabled: true,
          comment: `${state.name} -> Pin ${act.pin} = ${act.pinLevel}`,
        });
      }
    });

    // Transitions
    const outgoing = fsm.transitions.filter((t) => t.fromStateId === state.id);
    outgoing.forEach((trans, trIdx) => {
      const targetState = fsm.states.find((s) => s.id === trans.toStateId);
      const targetLabel = targetState ? `LABEL_${targetState.name}` : 'FSM_MAIN_LOOP';

      if (trans.triggerType === 'timer_timeout' && trans.timeoutMs) {
        blocks.push({
          id: `fsm_tr_delay_${trans.id}_${trIdx}_${now}`,
          type: 'timing_milli_delay',
          scope: 'loop',
          params: { ms: trans.timeoutMs },
          enabled: true,
          comment: `Időzítés: ${trans.timeoutMs} ms`,
        });

        blocks.push({
          id: `fsm_tr_jmp_${trans.id}_${trIdx}_${now}`,
          type: 'flow_rjmp',
          scope: 'loop',
          params: { targetLabel },
          enabled: true,
          comment: `Átmenet -> ${targetState?.label || targetLabel}`,
        });
      } else if (trans.triggerType === 'pin_digital_read' && trans.triggerPin) {
        blocks.push({
          id: `fsm_tr_read_${trans.id}_${trIdx}_${now}`,
          type: 'io_pin_read',
          scope: 'loop',
          params: { pin: trans.triggerPin, targetReg: 'r17' },
          enabled: true,
          comment: `Bemenet olvasás: Pin ${trans.triggerPin}`,
        });

        blocks.push({
          id: `fsm_tr_jmp_cond_${trans.id}_${now}`,
          type: 'flow_rjmp',
          scope: 'loop',
          params: { targetLabel },
          enabled: true,
          comment: `Átmenet -> ${targetState?.label || targetLabel}`,
        });
      }
    });
  });

  blocks.push({
    id: `fsm_jmp_loop_end_${now}`,
    type: 'flow_rjmp',
    scope: 'loop',
    params: { targetLabel: 'FSM_MAIN_LOOP' },
    enabled: true,
    comment: 'FSM Ciklus Ismétlése',
  });

  const variable: VariableDefinition = {
    id: `var_fsm_state_${now}`,
    name: fsm.stateVarName || 'fsm_state',
    type: 'uint8_t',
    memoryLocation: 'register',
    scope: 'global',
    initialValue: String(initial ? initial.stateCode : 0),
    registerBinding: 'r16',
    description: `FSM Aktuális Állapot (${fsm.title})`,
    sizeBytes: 1,
  };

  return { blocks, variable };
}
