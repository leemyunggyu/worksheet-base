"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const activate_cycle_count_1 = require("./activate-cycle-count");
const inspecting_1 = require("./inspecting");
const undo_inspection_1 = require("./undo-inspection");
const complete_inspection_1 = require("./complete-inspection");
exports.Mutations = Object.assign(Object.assign(Object.assign(Object.assign({}, activate_cycle_count_1.activateCycleCountResolver), inspecting_1.inspectingResolver), undo_inspection_1.undoInspectionResolver), complete_inspection_1.completeInspectionResolver);
//# sourceMappingURL=index.js.map