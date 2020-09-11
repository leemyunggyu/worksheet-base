"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assign_vas_inventories_1 = require("./assign-vas-inventories");
const activate_vas_1 = require("./activate-vas");
const execute_vas_1 = require("./execute-vas");
const undo_vas_1 = require("./undo-vas");
const complete_vas_1 = require("./complete-vas");
exports.Mutations = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, assign_vas_inventories_1.assignVasInventoriesResolver), activate_vas_1.activateVasResolver), execute_vas_1.executeVasResolver), undo_vas_1.undoVasResolver), complete_vas_1.completeVasResolver);
//# sourceMappingURL=index.js.map