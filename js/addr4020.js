
let key_map = {
    'j': 0,  // A
    'k': 1,  // B
    'u': 2,  // Select
    'i': 3,  // Start
    'w': 4,  // Up
    's': 5,  // Down
    'a': 6,  // Left
    'd': 7,  // Right
};

module.exports.key_map = key_map;

function user_input(fc, index, data) {
    fc.button_states[index] = data;
}

module.exports.user_input = user_input;

function read_cpu_address4020(fc, address) {
    let data = 0;
    switch (address & 0x1f)
    {
    case 0x16:
        // 手柄端口#1
        data = fc.button_states[fc.button_index_1 & fc.button_index_mask];
        ++fc.button_index_1;
        break;
    case 0x17:
        // 手柄端口#2
        data = fc.button_states[8 + fc.button_index_2 & fc.button_index_mask];
        ++fc.button_index_2;
        break;
    }
        return data;
}

function get_dma_address(fc, data, len) {
    const offset = ((data & 0x07) << 8);  // 最大1792
    switch (data >> 5)
    {
        default:
        case 1:
            // PPU寄存器
            assert(false, "PPU REG!");
        case 2:
            // 扩展区
            assert(false, "TODO");
        case 0:
            // 系统内存
            if(len) {
                for(let i=0; i<len; i++) {
                    fc.ppu.sprites[i] = fc.main_memory[offset + len + i]
                }
                for(let i=0; i<256-len; i++) {
                    fc.ppu.sprites[len + i] = fc.main_memory[offset + i]
                }
            }
            else {
                for (let i=0; i<256; i++) {
                    fc.ppu.sprites[i] = fc.main_memory[offset + i];
                }
            }
            return;
        case 3:
            // 存档 SRAM区
            if(len) {
                for(let i=0; i<len; i++) {
                    fc.ppu.sprites[i] = fc.save_memory[offset + len + i]
                }
                for(let i=0; i<256-len; i++) {
                    fc.ppu.sprites[len + i] = fc.save_memory[offset + i]
                }
            }
            else {
                for (let i=0; i<256; i++) {
                    fc.ppu.sprites[i] = fc.save_memory[offset + i];
                }
            }
            return;
        case 4: case 5: case 6: case 7:
        // 高一位为1, [$8000, $10000) 程序PRG-ROM区
            if(len) {
                for(let i=0; i<len; i++) {
                    fc.ppu.sprites[i] = fc.prg_banks[data >> 5 + Math.floor((offset + len + i) / 1024)][(offset + len + i) % 1024]
                }
                for(let i=0; i<256-len; i++) {
                    fc.ppu.sprites[len + i] = fc.prg_banks[data >> 5 + Math.floor((offset + i) / 1024)][(offset + i) % 1024]
                }
            }
            else {
                for (let i=0; i<256; i++) {
                    fc.ppu.sprites[i] = fc.prg_banks[data >> 5 + Math.floor((offset + i) / 1024)][(offset + i) % 1024];
                }
            }
            return;
    }
}

function write_cpu_address4020(fc, address, data) {
    switch (address & 0x1f)
    {
        case 0x14:
            // https://wiki.nesdev.com/w/index.php?title=PPU_registers&redirect=no#OAMADDR
            get_dma_address(fc, data, fc.ppu.oamaddr);
            fc.cpu_cycle_count += 513;
            fc.cpu_cycle_count += fc.cpu_cycle_count & 1;
            break;
        case 0x16:
            // 手柄端口
            fc.button_index_mask = (data & 1) ? 0x0 : 0x7;
            if (data & 1) {
                fc.button_index_1 = 0;
                fc.button_index_2 = 0;
            }
            break;
        }
}

module.exports.read_cpu_address4020 = read_cpu_address4020;
module.exports.write_cpu_address4020 = write_cpu_address4020;