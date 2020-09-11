"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.inspectingResolver = {
    async inspecting(_, { worksheetDetailName, palletId, locationName, inspectedQty }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            await executeInspection(trxMgr, domain, user, worksheetDetailName, palletId, locationName, inspectedQty);
        });
    }
};
async function executeInspection(trxMgr, domain, user, worksheetDetailName, palletId, locationName, inspectedQty) {
    const worksheetController = new controllers_1.CycleCountWorksheetController(trxMgr, domain, user);
    await worksheetController.inspecting(worksheetDetailName, palletId, locationName, inspectedQty);
}
exports.executeInspection = executeInspection;
//# sourceMappingURL=inspecting.js.map