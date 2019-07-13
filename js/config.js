"use strict";
/*
 * https://wiki.nesdev.com/w/index.php/Cycle_reference_chart
 */

/// NTSC制式 配置信息
const CONFIG_NTSC = {
    // CPU 主频 Hz
    cpu_clock: 1789773.,  // float
    // 屏幕刷新率
    refresh_rate: 60,  // uint16
    // 每条扫描线周期 Master-Clock
    master_cycle_per_scanline: 1364,  // uint16
    // 每条扫描线渲染周期 Master-Clock
    master_cycle_per_drawline: 1024,  // uint16
    // 每条扫描线水平空白周期 Master-Clock
    master_cycle_per_hblank: 340,  // uint16
    // 可见扫描线
    visible_scanline: 240,  // uint16
    // 垂直空白扫描线
    vblank_scanline: 20,  // uint16

};

const CONFIG_PAL = {
    // CPU 主频 Hz
    cpu_clock: 1662607.,  // float
    // 屏幕刷新率
    refresh_rate: 50,  // uint16
    // 每条扫描线周期 Master-Clock
    master_cycle_per_scanline: 1364,  // uint16
    // 每条扫描线渲染周期 Master-Clock
    master_cycle_per_drawline: 1024,  // uint16
    // 每条扫描线水平空白周期 Master-Clock
    master_cycle_per_hblank: 338,  // uint16
    // 可见扫描线
    visible_scanline: 312,  // uint16
    // 垂直空白扫描线
    vblank_scanline: 70,  // uint16

};

module.exports.CONFIG_NTSC = CONFIG_NTSC;
module.exports.CONFIG_PAL = CONFIG_PAL;