"use strict";
// rom 信息
let rom_info = {
    data_prgrom: null,
    data_chrrom: null,
    count_prgrom16kb: 0,
    mapper_number: 0,
    vmirroring: 0,
    four_screen: 0,
    save_ram: 0,
    reserved: new Uint8Array(4),
};

rom_info.reset = function() {
    rom_info.data_prgrom = null; // uint8
    rom_info.data_chrrom = null;  // uint8
    rom_info.count_prgrom16kb = 0;  // uint32
    rom_info.count_chrrom_8kb = 0;  // uint32
    rom_info.mapper_number = 0;  // uint8
    rom_info.vmirroring = 0;  // uint8
    rom_info.four_screen = 0;  // uint8
    rom_info.save_ram = 0;  // uint8
    rom_info.reserved = new Uint8Array(4);
};

// NES 文件头
let nes_header = {
    id: 0,  // uint32
    count_prgrom16kb: 0,  // uint8
    control1: 0,  // uint8
    control2: 0,  // uint8
    reserved: new Uint8Array(8),  // uint8
};

// rom_data is a Uint8Array
// i is the offset
nes_header.init = function (rom_data, i) {
    let dataview = new DataView(rom_data.buffer);
    nes_header.id = dataview.getUint32(i, true);
    i += 4;
    nes_header.count_prgrom16kb = rom_data[i];
    i += 1;
    nes_header.count_chrrom_8kb = rom_data[i];
    i += 1;
    nes_header.control1 = rom_data[i];
    i += 1;
    nes_header.control2 = rom_data[i];
    i+= 1;
    for (let tmp = 0; tmp < 8; tmp ++) {
        nes_header.reserved[i] = rom_data[i];
        i += 1;
    }
    return i;
};

// ROM control 字节 #1
const NES_VMIRROR = 0x01;
const NES_SAVERAM = 0x02;
const NES_TRAINER = 0x04;
const NES_4SCREEN = 0x08;

// ROM control 字节 #2
const NES_VS_UNISYSTEM  = 0x01;
const NES_Playchoice10 = 0x02;

module.exports.rom_info = rom_info;
module.exports.nes_header = nes_header;

module.exports.NES_VMIRROR = NES_VMIRROR;
module.exports.NES_SAVERAM = NES_SAVERAM;
module.exports.NES_TRAINER = NES_TRAINER;
module.exports.NES_4SCREEN = NES_4SCREEN;

module.exports.NES_VS_UNISYSTEM = NES_VS_UNISYSTEM;
module.exports.NES_Playchoice10 = NES_Playchoice10;