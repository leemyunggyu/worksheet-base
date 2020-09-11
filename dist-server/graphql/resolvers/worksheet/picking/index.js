"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assign_picking_inventories_1 = require("./assign-picking-inventories");
const undo_picking_assignment_1 = require("./undo-picking-assignment");
const activate_picking_1 = require("./activate-picking");
const picking_1 = require("./picking");
const complete_picking_1 = require("./complete-picking");
exports.Mutations = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, assign_picking_inventories_1.assignPickingInventoriesResolver), undo_picking_assignment_1.undoPickingAssigmentResolver), activate_picking_1.activatePickingResolver), picking_1.pickingResolver), complete_picking_1.completePickingResolver);
//# sourceMappingURL=index.js.map