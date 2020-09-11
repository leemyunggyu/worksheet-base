"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generate_arrival_notice_worksheet_1 = require("./generate-arrival-notice-worksheet");
const generate_cycle_count_worksheet_1 = require("./generate-cycle-count-worksheet");
const generate_partial_putaway_worksheet_1 = require("./generate-partial-putaway-worksheet");
const generate_putaway_worksheet_1 = require("./generate-putaway-worksheet");
const generate_release_good_worksheet_1 = require("./generate-release-good-worksheet");
const generate_vas_order_worksheet_1 = require("./generate-vas-order-worksheet");
exports.Mutations = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, generate_arrival_notice_worksheet_1.generateArrivalNoticeWorksheetResolver), generate_cycle_count_worksheet_1.generateCycleCountWorksheetResolver), generate_partial_putaway_worksheet_1.generatePartialPutawayWorksheetResolver), generate_putaway_worksheet_1.generatePutawayWorksheetResolver), generate_release_good_worksheet_1.generateReleaseGoodWorksheetResolver), generate_vas_order_worksheet_1.generateVasOrderWorksheetResolver);
//# sourceMappingURL=index.js.map