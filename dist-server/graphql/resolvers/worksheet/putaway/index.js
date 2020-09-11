"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const activate_putaway_1 = require("./activate-putaway");
const putaway_1 = require("./putaway");
const undo_putaway_1 = require("./undo-putaway");
const complete_putaway_1 = require("./complete-putaway");
exports.Mutations = Object.assign(Object.assign(Object.assign(Object.assign({}, activate_putaway_1.activatePutawayResolver), putaway_1.putawayResolver), undo_putaway_1.undoPutawayResolver), complete_putaway_1.completePutawayResolver);
//# sourceMappingURL=index.js.map