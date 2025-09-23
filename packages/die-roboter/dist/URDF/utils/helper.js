"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.xyzFromString = xyzFromString;
exports.rpyFromString = rpyFromString;
exports.rgbaFromString = rgbaFromString;
exports.numberStringToArray = numberStringToArray;
exports.radToEuler = radToEuler;
exports.numberArrayToColor = numberArrayToColor;
function xyzFromString(child) {
    const arr = numberStringToArray(child, "xyz");
    if (!arr || arr.length != 3) {
        return;
    }
    return arr;
}
function rpyFromString(child) {
    const arr = numberStringToArray(child, "rpy");
    if (!arr || arr.length != 3) {
        return;
    }
    return arr;
}
function rgbaFromString(child) {
    const arr = numberStringToArray(child, "rgba");
    if (!arr || arr.length != 4) {
        return;
    }
    return arr;
}
function numberStringToArray(child, name = "xyz") {
    // parse a list of values from a string
    // (like "1.0 2.2 3.0" into an array like [1, 2.2, 3])
    // used in URDF for position, orientation an color values
    if (child.hasAttribute(name)) {
        const xyzStr = child.getAttribute(name)?.split(" ");
        if (xyzStr) {
            const arr = [];
            for (const nr of xyzStr) {
                arr.push(parseFloat(nr));
            }
            return arr;
        }
    }
}
function radToEuler(rad) {
    return (rad * 180) / Math.PI;
}
function numberArrayToColor([r, g, b]) {
    const toHex = (n) => Math.round(n).toString(16).padStart(2, "0");
    // 0.06, 0.4, 0.1, 1
    return `#${toHex(r * 255)}${toHex(g * 255)}${toHex(b * 255)}`;
}
