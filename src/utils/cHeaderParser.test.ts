import { describe, it, expect } from 'bun:test';
import { parseCHeader, generateCWrapper, generateAsmCallBlock } from './cHeaderParser';

describe('cHeaderParser', () => {
    it('should parse simple 8-bit arguments', () => {
        const header = `void asm_i2c_write_byte(uint8_t addr, uint8_t data);`;
        const result = parseCHeader(header);

        expect(result.length).toBe(1);
        expect(result[0].name).toBe('asm_i2c_write_byte');
        expect(result[0].args.length).toBe(2);

        expect(result[0].args[0].assignedRegister).toBe('r24');
        expect(result[0].args[1].assignedRegister).toBe('r22');
    });

    it('should parse mixed arguments correctly (16-bit and 8-bit)', () => {
        const header = `void do_something(int16_t x, uint8_t y);`;
        const result = parseCHeader(header);

        expect(result[0].args[0].assignedRegister).toBe('r25:r24');
        expect(result[0].args[1].assignedRegister).toBe('r22');
    });

    it('should generate valid C wrapper', () => {
        const func = {
            name: 'printChar',
            returnType: 'void',
            args: [{ type: 'char', name: 'c', sizeBytes: 1, assignedRegister: 'r24' }]
        };
        const wrapper = generateCWrapper(func, 'LiquidCrystal', 'lcd');
        expect(wrapper).toContain('extern "C"');
        expect(wrapper).toContain('lcd.printChar(c);');
    });
});

    it('should handle const and volatile modifiers', () => {
        const header = `void write(const uint8_t data);`;
        const result = parseCHeader(header);
        expect(result[0].args[0].sizeBytes).toBe(1);
        expect(result[0].args[0].assignedRegister).toBe('r24');
    });
