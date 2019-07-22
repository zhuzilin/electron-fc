let { famicom } = require('./famicom');
let Mousetrap = require('mousetrap');
let { key_map } = require('./addr4020');

function main() {
    let e = famicom.init(null, null);
    if (e)
        throw e;
    console.log(`ROM: PRG-ROM: ${famicom.rom_info.count_prgrom16kb} x 16kb`);
    console.log(`     CHR-ROM: ${famicom.rom_info.count_chrrom_8kb} x 8kb`);
    console.log(`     Mapper: ${famicom.rom_info.mapper_number}`);
    for (let k in key_map) {
        Mousetrap.bind(k, () => {
            famicom.user_input(key_map[k], 1)
        }, 'keydown');
        Mousetrap.bind(k, () => {
            famicom.user_input(key_map[k], 0)
        }, 'keyup');
    }
    famicom.main_render();
}

main();