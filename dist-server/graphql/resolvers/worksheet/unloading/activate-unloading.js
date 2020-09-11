"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const constants_1 = require("../../../../constants");
const controllers_1 = require("../../../../controllers");
const entities_1 = require("../../../../entities");
const activate_picking_1 = require("../picking/activate-picking");
const worksheet_by_order_no_1 = require("../worksheet-by-order-no");
exports.activateUnloadingResolver = {
    async activateUnloading(_, { worksheetNo, unloadingWorksheetDetails }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            var _a, _b;
            const { domain, user } = context.state;
            let unloadingWS = await activateUnloading(trxMgr, domain, user, worksheetNo, unloadingWorksheetDetails);
            if (((_b = (_a = unloadingWS) === null || _a === void 0 ? void 0 : _a.arrivalNotice) === null || _b === void 0 ? void 0 : _b.crossDocking) === undefined) {
                unloadingWS = await trxMgr.getRepository(entities_1.Worksheet).findOne(unloadingWS.id, {
                    relations: ['arrivalNotice', 'arrivalNotice.releaseGood']
                });
            }
            const crossDocking = unloadingWS.arrivalNotice.crossDocking;
            if (crossDocking) {
                const { name: pickingWorksheetNo } = await worksheet_by_order_no_1.worksheetByOrderNo(context.state.domain, unloadingWS.arrivalNotice.releaseGood.name, constants_1.WORKSHEET_TYPE.PICKING, trxMgr);
                await activate_picking_1.activatePicking(trxMgr, pickingWorksheetNo, context.state.domain, context.state.user);
            }
            return unloadingWS;
        });
    }
};
async function activateUnloading(trxMgr, domain, user, worksheetNo, unloadingWorksheetDetails) {
    const worksheetController = new controllers_1.UnloadingWorksheetController(trxMgr, domain, user);
    return await worksheetController.activateUnloading(worksheetNo, unloadingWorksheetDetails);
}
exports.activateUnloading = activateUnloading;
//# sourceMappingURL=activate-unloading.js.map