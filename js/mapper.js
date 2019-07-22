"use strict";
let assert = require('assert');
let { ERROR_OK } = require('./ecode');

// --------------------------------------- MAPPER 000 NROM
let mapper_00_reset = function(fc) {
    // NROM only works for prgrom 16k or 32k
    assert(fc.rom_info.count_prgrom16kb &&
           fc.rom_info.count_prgrom16kb <= 2, 'error prgrom size for mapper');
    if (fc.rom_info.count_prgrom16kb === 1) { // 16KB: 载入 $8000-$BFFF, $C000-$FFFF 为镜像
        fc.prg_banks[4 + 0] = fc.rom_info.data_prgrom.slice(0 * 8 * 1024, 1 * 8 * 1024);
        fc.prg_banks[4 + 1] = fc.rom_info.data_prgrom.slice(1 * 8 * 1024, 2 * 8 * 1024);
        fc.prg_banks[4 + 2] = fc.rom_info.data_prgrom.slice(0 * 8 * 1024, 1 * 8 * 1024);
        fc.prg_banks[4 + 3] = fc.rom_info.data_prgrom.slice(1 * 8 * 1024, 2 * 8 * 1024);
    } else {
        fc.prg_banks[4 + 0] = fc.rom_info.data_prgrom.slice(0 * 8 * 1024, 1 * 8 * 1024);
        fc.prg_banks[4 + 1] = fc.rom_info.data_prgrom.slice(1 * 8 * 1024, 2 * 8 * 1024);
        fc.prg_banks[4 + 2] = fc.rom_info.data_prgrom.slice(2 * 8 * 1024, 3 * 8 * 1024);
        fc.prg_banks[4 + 3] = fc.rom_info.data_prgrom.slice(3 * 8 * 1024, 4 * 8 * 1024);
    }
    // chrrom
    for (let i=0; i<8; i++) {
        fc.ppu.banks[i] = fc.rom_info.data_chrrom.slice(1024 * i, 1024 * (i + 1));
    }
    return ERROR_OK;
};

// --------------------------------------- MAPPER 000 NROM

module.exports.load_mapper = (fc, id) => {
    switch (id) {
        case 0x00:
            fc.mapper = {
                reset: mapper_00_reset
            };
            break;
        default:
            break;
    }
    return ERROR_OK;
};


