"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJointSliders = exports.SO101 = void 0;
const SO101_1 = require("./robots/SO101");
Object.defineProperty(exports, "SO101", { enumerable: true, get: function () { return SO101_1.SO101; } });
const createJointSliders_1 = __importDefault(require("./utils/createJointSliders"));
exports.createJointSliders = createJointSliders_1.default;
