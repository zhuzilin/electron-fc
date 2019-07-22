'use strict';
let assert = require('assert');
let fs = require('fs');
let util = require('./util');
let { ERROR_OK,
      ERROR_FAILED,
      ERROR_FILE_NOT_FOUND,
      ERROR_ILLEGAL_FILE,
      ERROR_OUT_OF_MEMORY } = require('./ecode');
let { rom_info, nes_header,
    NES_TRAINER,
    NES_4SCREEN,
    NES_SAVERAM,
    NES_VMIRROR,
    NES_VS_UNISYSTEM,
    NES_Playchoice10 } = require('./rom');
let { load_mapper } = require('./mapper');
let { read_cpu_address,
    write_cpu_address,
    disassembly,
    cpu_registers, } = require('./cpu');
let { VECTOR_RESET,
    FLAG_R, } = require('./const');
let { cpu_execute_one } = require('./6502');
let { ppu, main_render } = require('./ppu');
let { user_input, read_cpu_address4020, write_cpu_address4020 } = require('./addr4020');
let { CONFIG_PAL, CONFIG_NTSC } = require('./config');


/*
 * Load ROM
 */
let load_default_rom = function (arg, info) {
    assert(info.data_prgrom === null, "didn't free the rom before loading");
    let data = fs.readFileSync('C:\\Zilin\\electron\\electron-fc\\test\\sm.nes');
    let rom_data = new Uint8Array(data);
    let i = 0;  // offset
    i = nes_header.init(rom_data, i);
    if (!util.cmp_uint32_uint8(nes_header.id, util.str2uint8('NES\x1A')))
        return ERROR_ILLEGAL_FILE;
    const size1 = 16 * 1024 * nes_header.count_prgrom16kb;
    const size2 =  8 * 1024 * nes_header.count_chrrom_8kb;
    if (nes_header.control1 & NES_TRAINER) {
        let trainer = rom_data.slice(i, i + 512);
        i += 512;
    }
    let prgrom = rom_data.slice(i, i + size1);
    i += size1;
    let chrrom = rom_data.slice(i, i + size2);
    i += size2;
    info.data_prgrom = prgrom;
    info.data_chrrom = chrrom;
    info.count_prgrom16kb = nes_header.count_prgrom16kb;
    info.count_chrrom_8kb = nes_header.count_chrrom_8kb;
    info.mapper_number   = (nes_header.control1 >> 4) | (nes_header.control2 & 0xF0);
    info.vmirroring      = (nes_header.control1 & NES_VMIRROR) > 0;
    info.four_screen     = (nes_header.control1 & NES_4SCREEN) > 0;
    info.save_ram        = (nes_header.control1 & NES_SAVERAM) > 0;
    assert(!(nes_header.control1 & NES_TRAINER), "unsupported");
    assert(!(nes_header.control2 & NES_VS_UNISYSTEM), "unsupported");
    assert(!(nes_header.control2 & NES_Playchoice10), "unsupported");
    return ERROR_OK;
};

let free_default_rom = function (arg, info) {
    // js 有gc所以不用管
    return ERROR_OK;
};

let before_execute = () => {};

let load_new_rom = function(fc) {
    let ecode = fc.interfaces.free_rom(fc.arguments, fc.rom_info);
    fc.rom_info.reset();
    if (ecode === ERROR_OK) {
        ecode = fc.interfaces.load_rom(fc.arguments, fc.rom_info);
    }
    if (ecode === ERROR_OK) {
        ecode = fc.load_mapper(fc.rom_info.mapper_number);
    }
    if (ecode === ERROR_OK) {
        fc.reset();
    }
    return ERROR_OK
};

let famicom = {
    // 参数
    argument: null,
    // 配置信息
    config: null,
    // 扩展接口
    interfaces: null,
    // Mapper接口
    mapper: null,
    // CPU registers
    registers: null,
    // CPU 周期计数
    cpu_cycle_count: 0,
    // PPU
    ppu: null,
    // ROM信息
    rom_info: null,
    // 手柄序列状态#1
    button_index_1: 0,  // uint16_t
    // 手柄序列状态#2
    button_index_2: 0,  // uint16_t
    // 手柄序列状态
    button_index_mask: 0,  // uint16_t
    // 手柄按钮状态
    button_states: new Uint8Array(16),
    // 程序内存仓库(Bank)/窗口(Window)
    prg_banks: new Array(0x10000 >> 13),
    // 工作(work)/保存(save)内存
    save_memory: new Uint8Array(8 * 1024),
    // 显存
    video_memory: new Uint8Array(2 * 1024),
    // 4屏用额外显存
    video_memory_ex: new Uint8Array(2 * 1024),
    // 主内存
    main_memory: new Uint8Array(2 * 1024),
};

famicom.init = (argument, interfaces) => {
    famicom.argument = argument;
    famicom.interfaces = interfaces;
    if (famicom.interfaces === null) {
        // default interface
        famicom.interfaces = { load_rom: load_default_rom,
                               free_rom: free_default_rom,
                               before_execute: before_execute,}
    }
    // registers
    famicom.registers = cpu_registers;
    // ppu
    famicom.ppu = ppu;
    // 初步BANK
    famicom.prg_banks[0] = famicom.main_memory;
    famicom.prg_banks[3] = famicom.save_memory;
    // config: 默认为NTSC
    famicom.config = CONFIG_NTSC;
    // rom_info
    famicom.rom_info = rom_info;
    famicom.rom_info.reset();
    // load rom
    return load_new_rom(famicom);
};

famicom.uninit = () => {
    return famicom.interfaces.free_rom(famicom.argument)
};

famicom.load_mapper = (id) => load_mapper(famicom, id);

famicom.read_cpu_address = (address) => read_cpu_address(famicom, address);

famicom.write_cpu_address = (address, data) => write_cpu_address(famicom, address, data);

famicom.disassembly = (address) => disassembly(famicom, address);

famicom.cpu_execute_one = () => cpu_execute_one(famicom);

famicom.reset = () => {
    let code = famicom.mapper.reset(famicom);
    if (code !== ERROR_OK)
        return code;
    // cpu registers initialization
    // https://wiki.nesdev.com/w/index.php/CPU_power_up_state
    const pcl = famicom.read_cpu_address(VECTOR_RESET + 0);
    const pch = famicom.read_cpu_address(VECTOR_RESET + 1);
    famicom.registers.program_counter = pcl | (pch << 8);
    famicom.registers.accumulator = 0;
    famicom.registers.x_index = 0;
    famicom.registers.y_index = 0;
    famicom.registers.stack_pointer = 0xfd;
    famicom.registers.status = 0x34 | FLAG_R;    //  一直为1
    // ppu
    famicom.setup_nametable_bank();
    famicom.ppu.banks[0xc] = famicom.ppu.banks[0x8];
    famicom.ppu.banks[0xd] = famicom.ppu.banks[0x9];
    famicom.ppu.banks[0xe] = famicom.ppu.banks[0xa];
    famicom.ppu.banks[0xf] = famicom.ppu.banks[0xb];

    /*
    if (1)
    // 测试指令ROM(nestest.nes)
        famicom.registers.program_counter = 0xC000;
    */
    return ERROR_OK;
};

famicom.setup_nametable_bank = () => {
    // 4屏
    if (famicom.rom_info.four_screen) {
        famicom.ppu.banks[0x8] = famicom.video_memory.slice(0x400 * 0, 0x400 * 1);
        famicom.ppu.banks[0x9] = famicom.video_memory.slice(0x400 * 1, 0x400 * 2);
        famicom.ppu.banks[0xa] = famicom.video_memory_ex.slice(0x400 * 0, 0x400 * 1);
        famicom.ppu.banks[0xb] = famicom.video_memory_ex.slice(0x400 * 1, 0x400 * 2);
    }
    // 横版
    else if (famicom.rom_info.vmirroring) {
        famicom.ppu.banks[0x8] = famicom.video_memory.slice(0x400 * 0, 0x400 * 1);
        famicom.ppu.banks[0x9] = famicom.video_memory.slice(0x400 * 1, 0x400 * 2);
        famicom.ppu.banks[0xa] = famicom.video_memory.slice(0x400 * 0, 0x400 * 1);
        famicom.ppu.banks[0xb] = famicom.video_memory.slice(0x400 * 1, 0x400 * 2);
    }
    // 纵版
    else {
        famicom.ppu.banks[0x8] = famicom.video_memory.slice(0x400 * 0, 0x400 * 1);
        famicom.ppu.banks[0x9] = famicom.video_memory.slice(0x400 * 0, 0x400 * 1);
        famicom.ppu.banks[0xa] = famicom.video_memory.slice(0x400 * 1, 0x400 * 2);
        famicom.ppu.banks[0xb] = famicom.video_memory.slice(0x400 * 1, 0x400 * 2);
    }
};

famicom.main_render = () => main_render(famicom);

famicom.read_cpu_address4020 = (address) => read_cpu_address4020(famicom, address);

famicom.write_cpu_address4020 = (address, data) => write_cpu_address4020(famicom, address, data);

famicom.user_input = (index, data) => user_input(famicom, index, data);

module.exports.famicom = famicom;