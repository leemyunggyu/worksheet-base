"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const activate_unloading_1 = require("./activate-unloading");
const unload_1 = require("./unload");
const undo_unloading_1 = require("./undo-unloading");
const complete_unloading_1 = require("./complete-unloading");
const complete_unloading_partially_1 = require("./complete-unloading-partially");
const preunload_1 = require("./preunload");
const undo_preunload_1 = require("./undo-preunload");
const complete_preunload_1 = require("./complete-preunload");
exports.Mutations = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, activate_unloading_1.activateUnloadingResolver), unload_1.unloadResolver), undo_unloading_1.undoUnloadingResolver), complete_unloading_1.completeUnloadingResolver), complete_unloading_partially_1.completeUnloadingPartiallyResolver), preunload_1.preunloadResolver), undo_preunload_1.undoPreunloadResolver), complete_preunload_1.completePreunloadResolver);
//# sourceMappingURL=index.js.map