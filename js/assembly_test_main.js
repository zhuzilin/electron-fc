"use strict";
let { famicom } = require('./famicom');

let line = 0;

function log_exec(arg, fc) {
    line++;
    const pc = fc.registers.program_counter;
    let buf = fc.disassembly(pc);
    console.log(
        `${line.toString().padStart(4)} - ${buf}   ` +
        `A:${famicom.registers.accumulator.toString(16).padStart(2, '0')} ` +
        `X:${famicom.registers.x_index.toString(16).padStart(2, '0')} ` +
        `Y:${famicom.registers.y_index.toString(16).padStart(2, '0')} ` +
        `P:${famicom.registers.status.toString(16).padStart(2, '0')} ` +
        `SP:${famicom.registers.stack_pointer.toString(16).padStart(2, '0')}`);
}

function main() {
    let e = famicom.init(null, null);
    if (e)
        throw e;
    famicom.interfaces.before_execute = log_exec;
    console.log(`ROM: PRG-ROM: ${famicom.rom_info.count_prgrom16kb} x 16kb`);
    console.log(`     CHR-ROM: ${famicom.rom_info.count_chrrom_8kb} x 8kb`);
    console.log(`     Mapper: ${famicom.rom_info.mapper_number}`);

    for (let i = 0; i != 10000; i++) {
        famicom.cpu_execute_one();
    }
    famicom.uninit();
}

main();