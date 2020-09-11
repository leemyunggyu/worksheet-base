"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const activate_loading_1 = require("./activate-loading");
const loading_1 = require("./loading");
const undo_loading_1 = require("./undo-loading");
const complete_loading_1 = require("./complete-loading");
exports.Mutations = Object.assign(Object.assign(Object.assign(Object.assign({}, activate_loading_1.activateLoadingResolver), loading_1.loadingResolver), undo_loading_1.undoLoadingResolver), complete_loading_1.completeLoadingResolver);
//# sourceMappingURL=index.js.map