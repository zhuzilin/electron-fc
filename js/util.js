"use strict";

let { TextEncoder } = require('util');

let enc = new TextEncoder();

module.exports.str2uint8 = (s) => {
    return enc.encode(s);
};

module.exports.cmp_uint32_uint8 = (x, ys) => {
    let dataview = new DataView(ys.buffer);
    // in C, the default encoding is littleEndian
    let y = dataview.getUint32(0, true);
    return x === y;
};

module.exports.replaceAt = function (string, index, replace) {
    return string.substring(0, index) + replace + string.substring(index + 1);
};