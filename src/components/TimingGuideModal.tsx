import React from 'react';
import { X, BookOpen, Clock, Zap, Cpu, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface TimingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TimingGuideModal: React.FC<TimingGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      id="timing-guide-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
    >
      <div className="bg-[#161920] border border-[#3A3F4B] rounded-xs shadow-[8px_8px_0px_#000] max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#2A2D35] flex items-center justify-between bg-[#0F1115]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xs bg-[#4ade80] text-black flex items-center justify-center font-bold shadow-[2px_2px_0px_#000]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                AVR Assembly & Óraciklus Időzítési Kisokos
              </h3>
              <p className="text-xs text-[#8A8D98]">
                ATmega328P mikrovezérlő hardveres működése és sebesség-összehasonlítás
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xs text-[#8A8D98] hover:text-white hover:bg-[#1A1D24] border border-transparent hover:border-[#3A3F4B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-[#E0E0E6] custom-scrollbar leading-relaxed">
          {/* Section 1: Core Frequency & Precision */}
          <div className="bg-[#0F1115] p-4 rounded-xs border border-[#2A2D35] space-y-2 shadow-[2px_2px_0px_#000]">
            <div className="flex items-center gap-2 text-[#4ade80] font-bold text-xs uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>1. Az Óraciklus Számítás Alapja (16.000 MHz Crystal)</span>
            </div>
            <p className="text-[#8A8D98]">
              Az Arduino Uno és Nano mikrokontrollere (ATmega328P) egy 16.000.000 Hz frekvenciájú kvarckristállyal üzemel.
              Ez azt jelenti, hogy <strong className="text-white">1 másodperc alatt pontosan 16 000 000 óraciklus</strong> zajlik le:
            </p>
            <div className="bg-[#161920] p-3 rounded-xs code-font text-[#4ade80] text-[11px] border border-[#2A2D35]">
              1 Óraciklus = 1 / 16 000 000 s = 62.5 nanomásodperc (0.0625 µs)
              <br />
              16 Óraciklus = 1 mikroszekundum (1.0 µs)
              <br />
              16 000 Óraciklus = 1 milliszekundum (1.0 ms)
            </div>
          </div>

          {/* Section 2: Why Arduino C is slow vs ASM */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <Zap className="w-4 h-4" />
              <span>2. Miért lassú a standard Arduino C kód? (digitalWrite vs SBI)</span>
            </div>
            <p className="text-[#8A8D98]">
              Amikor a hagyományos Arduino C kódban meghívjuk a <code className="text-orange-300">digitalWrite(13, HIGH);</code> függvényt,
              a fordító nem közvetlen hardveres utasítást generál, hanem egy univerzális függvényt hív meg:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-[#0F1115] border border-rose-500/30 p-3 rounded-xs space-y-1 shadow-[2px_2px_0px_#000]">
                <div className="font-bold text-rose-400 flex items-center gap-1.5 uppercase font-mono text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Standard C: digitalWrite(13, HIGH)</span>
                </div>
                <p className="text-[11px] text-white">
                  Lefutás ideje: <strong className="text-rose-300">~56 óraciklus (3.50 µs)</strong>
                </p>
                <p className="text-[10px] text-[#8A8D98]">
                  Függvényhívási veremmentés, lábszám feloldása tömbökből, portregiszter mutatók kiolvasása, bitmaszkolás, timer PWM lekapcsolás.
                </p>
              </div>

              <div className="bg-[#0F1115] border border-[#4ade80]/40 p-3 rounded-xs space-y-1 shadow-[2px_2px_0px_#000]">
                <div className="font-bold text-[#4ade80] flex items-center gap-1.5 uppercase font-mono text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>AVR Assembly: sbi 0x05, 5</span>
                </div>
                <p className="text-[11px] text-white">
                  Lefutás ideje: <strong className="text-[#4ade80]">pontosan 2 óraciklus (0.125 µs)</strong>
                </p>
                <p className="text-[10px] text-[#8A8D98]">
                  Közvetlen hardveres mikroművelet. 28-szor gyorsabb, determinisztikus és jitter-mentes!
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Instruction Cycle Reference Table */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#4ade80] font-bold text-xs uppercase tracking-wider">
              <Cpu className="w-4 h-4" />
              <span>3. AVR Utasítások Óraciklus Referenciatáblázata</span>
            </div>
            <div className="overflow-x-auto rounded-xs border border-[#2A2D35]">
              <table className="w-full text-[11px] text-left border-collapse">
                <thead className="bg-[#0F1115] text-[#8A8D98] uppercase text-[10px] font-mono">
                  <tr>
                    <th className="p-2 border-b border-[#2A2D35]">Utasítás</th>
                    <th className="p-2 border-b border-[#2A2D35]">Leírás</th>
                    <th className="p-2 border-b border-[#2A2D35]">Ciklus</th>
                    <th className="p-2 border-b border-[#2A2D35]">Időtartam @ 16MHz</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2D35] font-mono bg-[#161920]">
                  <tr>
                    <td className="p-2 text-[#4ade80] font-bold">nop</td>
                    <td className="p-2 font-sans text-[#E0E0E6]">Üres utasítás (No Operation)</td>
                    <td className="p-2 text-amber-300 font-bold">1</td>
                    <td className="p-2 text-[#8A8D98]">62.5 ns</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-[#4ade80] font-bold">sbi / cbi</td>
                    <td className="p-2 font-sans text-[#E0E0E6]">I/O Regiszter Bit beállítás / törlés</td>
                    <td className="p-2 text-amber-300 font-bold">2</td>
                    <td className="p-2 text-[#8A8D98]">125.0 ns</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-[#4ade80] font-bold">in / out</td>
                    <td className="p-2 font-sans text-[#E0E0E6]">8-bites I/O Regiszter olvasás / írás</td>
                    <td className="p-2 text-amber-300 font-bold">1</td>
                    <td className="p-2 text-[#8A8D98]">62.5 ns</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-[#4ade80] font-bold">ldi</td>
                    <td className="p-2 font-sans text-[#E0E0E6]">Konstans szám betöltése munkaregiszterbe (r16-r31)</td>
                    <td className="p-2 text-amber-300 font-bold">1</td>
                    <td className="p-2 text-[#8A8D98]">62.5 ns</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-[#4ade80] font-bold">dec / inc</td>
                    <td className="p-2 font-sans text-[#E0E0E6]">Regiszter csökkentése / növelése 1-gyel</td>
                    <td className="p-2 text-amber-300 font-bold">1</td>
                    <td className="p-2 text-[#8A8D98]">62.5 ns</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-[#4ade80] font-bold">brne / breq</td>
                    <td className="p-2 font-sans text-[#E0E0E6]">Feltételes ugrás (ha nem egyenlő / egyenlő)</td>
                    <td className="p-2 text-amber-300 font-bold">2 (ha ugrik) / 1</td>
                    <td className="p-2 text-[#8A8D98]">125.0 ns / 62.5 ns</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-[#4ade80] font-bold">rjmp</td>
                    <td className="p-2 font-sans text-[#E0E0E6]">Relatív ugrás címkére</td>
                    <td className="p-2 text-amber-300 font-bold">2</td>
                    <td className="p-2 text-[#8A8D98]">125.0 ns</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-[#4ade80] font-bold">sei / cli</td>
                    <td className="p-2 font-sans text-[#E0E0E6]">Globális megszakítások be- / kikapcsolása</td>
                    <td className="p-2 text-amber-300 font-bold">1</td>
                    <td className="p-2 text-[#8A8D98]">62.5 ns</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Hardware Port Mapping */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-orange-400 font-bold text-xs uppercase tracking-wider">
              <Cpu className="w-4 h-4" />
              <span>4. Hardveres Port Regiszterek Térképe (Arduino Uno)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
              <div className="bg-[#0F1115] p-2.5 rounded-xs border border-[#2A2D35] shadow-[2px_2px_0px_#000]">
                <div className="font-bold text-[#4ade80] font-mono">PORTB (D8 - D13)</div>
                <div className="text-[#8A8D98] mt-1 font-mono text-[10px]">DDRB (0x04), PORTB (0x05), PINB (0x03)</div>
                <div className="text-[#8A8D98] text-[10px] mt-0.5">D13 a PB5 lábon (Beépített LED)</div>
              </div>
              <div className="bg-[#0F1115] p-2.5 rounded-xs border border-[#2A2D35] shadow-[2px_2px_0px_#000]">
                <div className="font-bold text-orange-400 font-mono">PORTD (D0 - D7)</div>
                <div className="text-[#8A8D98] mt-1 font-mono text-[10px]">DDRD (0x0A), PORTD (0x0B), PIND (0x09)</div>
                <div className="text-[#8A8D98] text-[10px] mt-0.5">D0/D1: UART RX/TX, D2/D3: INT0/INT1</div>
              </div>
              <div className="bg-[#0F1115] p-2.5 rounded-xs border border-[#2A2D35] shadow-[2px_2px_0px_#000]">
                <div className="font-bold text-amber-400 font-mono">PORTC (A0 - A5)</div>
                <div className="text-[#8A8D98] mt-1 font-mono text-[10px]">DDRC (0x07), PORTC (0x08), PINC (0x06)</div>
                <div className="text-[#8A8D98] text-[10px] mt-0.5">Analóg bemenetek & I2C (A4=SDA, A5=SCL)</div>
              </div>
            </div>
          </div>

          {/* Section 5: Peripherals: ADC, PWM, I2C, SPI */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
              <Zap className="w-4 h-4" />
              <span>5. Perifériák: 10-Bit ADC, Hardveres PWM, I2C (TWI) & SPI</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
              <div className="bg-[#0F1115] p-3 rounded-xs border border-[#2A2D35] space-y-1 shadow-[2px_2px_0px_#000]">
                <div className="font-bold text-amber-400 font-mono flex items-center justify-between">
                  <span>🎛️ ADC & Hardveres PWM</span>
                  <span className="text-[10px] text-[#8A8D98]">10-bit & 8-bit</span>
                </div>
                <p className="text-[#8A8D98] text-[10px]">
                  • <strong>ADC:</strong> ADMUX + ADCSRA (128-as előosztóval 125 kHz órajel, 13 ADC ciklus = ~104 µs konverzió). Eredmény ADCL/ADCH (r25:r24).
                  <br />
                  • <strong>PWM:</strong> Fast PWM Timer0 (D5, D6), Timer1 (D9, D10), Timer2 (D3, D11). OCRxx regiszter írása azonnali kitöltési tényezőt vált.
                </p>
              </div>

              <div className="bg-[#0F1115] p-3 rounded-xs border border-[#2A2D35] space-y-1 shadow-[2px_2px_0px_#000]">
                <div className="font-bold text-cyan-400 font-mono flex items-center justify-between">
                  <span>⚡ SPI & 🌐 I2C (TWI)</span>
                  <span className="text-[10px] text-[#8A8D98]">4 MHz / 400 kHz</span>
                </div>
                <p className="text-[#8A8D98] text-[10px]">
                  • <strong>I2C (TWI):</strong> A4 (SDA), A5 (SCL). TWBR sebességregiszter (100k/400k), TWCR vezérlés (START/STOP), TWDR adatregiszter.
                  <br />
                  • <strong>SPI:</strong> D10 (SS), D11 (MOSI), D12 (MISO), D13 (SCK). SPCR Master engedélyezés (f_osc/4 = 4 MHz). SPDR full-duplex bájtcsere.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#2A2D35] bg-[#0F1115] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#4ade80] hover:bg-[#3ec973] text-black rounded-xs text-xs font-bold uppercase transition-colors shadow-[2px_2px_0px_#000]"
          >
            Értem, bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
