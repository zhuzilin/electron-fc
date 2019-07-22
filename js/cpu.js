"use strict";
let assert = require('assert');
let { add_hex, disassembly_6502 } =require('./6502');
let {  replaceAt } = require('./util');

let cpu_registers = {
    // 指令计数器 Program Counter
    program_counter: 0,  // uint16
// 状态寄存器 Status Register
    status: 0,  // uint8
// 累加寄存器 Accumulator
    accumulator: 0,  // uint 8
// X 变址寄存器 X Index Register
    x_index: 0,  // uint8
// Y 变址寄存器 Y Index Register
    y_index: 0,  // uint8
// 栈指针  Stack Pointer
    stack_pointer: 0,  // uint8
// 保留对齐用
    unused: 0,  // uin8
};

module.exports.cpu_registers = cpu_registers;

let read_cpu_address = (fc, address) => {
    /*
    CPU address map
    +---------+-------+-------+-----------------------+
    | address | Size  | Tag   |     description       |
    +---------+-------+-------+-----------------------+
    | $0000   | $800  |       | RAM                   |
    | $0800   | $800  | M     | RAM                   |
    | $1000   | $800  | M     | RAM                   |
    | $1800   | $800  | M     | RAM                   |
    | $2000   | 8     |       | PPU Registers         |
    | $2008   | $1FF8 | R     | PPU Registers Mirrors |
    | $4000   | $20   |       | Registers             |
    | $4020   | $1FDF |       | Expansion ROM         |
    | $6000   | $2000 |       | SRAM                  |
    | $8000   | $4000 |       | PRG-ROM               |
    | $C000   | $4000 |       | PRG-ROM               |
    +---------+-------+-------+-----------------------+
    M = $0000 mirror
    R = $2000-2008 8 bytes mirror
            (e.g. $2008=$2000, $2018=$2000, etc.)
    */
    switch (address >> 13)  // 1 << 13 = 0x2000
    {
        case 0:
            // 高三位为0: [$0000, $2000): 系统主内存, 4次镜像
            return fc.main_memory[address & 0x07ff];
        case 1:
            // 高三位为1, [$2000, $4000): PPU寄存器, 8字节步进镜像
            return fc.ppu.read_ppu_register_via_cpu(address);
        case 2:
            // 高三位为2, [$4000, $6000): pAPU寄存器 扩展ROM区
            if (address < 0x4020) {
                return fc.read_cpu_address4020(address);
            }
            else
                assert(false, "NOT IMPL");
            return 0;
        case 3:
            // 高三位为3, [$6000, $8000): 存档 SRAM区
            return fc.save_memory[address & 0x1fff];
        case 4: case 5: case 6: case 7:
        // 高一位为1, [$8000, $10000) 程序PRG-ROM区
        return fc.prg_banks[address >> 13][address & 0x1fff];
        default:
            assert(false, 'Invalid address');
    }
};

let write_cpu_address = (fc, address, data) => {
    switch (address >> 13)  // 1 << 13 = 0x2000
    {
        case 0:
            // 高三位为0: [$0000, $2000): 系统主内存, 4次镜像
            fc.main_memory[address & 0x07ff] = data;
            return;
        case 1:
            // 高三位为1, [$2000, $4000): PPU寄存器, 8字节步进镜像
            fc.ppu.write_ppu_register_via_cpu(address, data);
            return;
        case 2:
            // 高三位为2, [$4000, $6000): pAPU寄存器 扩展ROM区
            // 前0x20字节为APU, I / O寄存器
            if (address < 0x4020) {
                fc.write_cpu_address4020(address, data);
            }
            else
                assert(false, "NOT IMPL");
            return;
        case 3:
            // 高三位为3, [$6000, $8000): 存档 SRAM区
            fc.save_memory[address & 0x1fff] = data;
            return;
        case 4: case 5: case 6: case 7:
        // 高一位为1, [$8000, $10000) 程序PRG-ROM区
            fc.prg_banks[address >> 13][address & 0x1fff] = data;
            return;
        default:
            assert(false, 'Invalid address');
    }
};

module.exports.read_cpu_address = read_cpu_address;

module.exports.write_cpu_address = write_cpu_address;

module.exports.disassembly = (fc, address) => {
    let buf = ' '.repeat(8);
    buf = replaceAt(buf, 0, '$');
    buf = add_hex(buf, 1, address >> 8);
    buf = add_hex(buf, 3, address & 0xff);

    let code = new Uint8Array(4);
    code[0] = read_cpu_address(fc, address);
    code[1] = read_cpu_address(fc, address + 1);
    code[2] = read_cpu_address(fc, address + 2);
    buf += disassembly_6502(code, "");
    return buf;
};