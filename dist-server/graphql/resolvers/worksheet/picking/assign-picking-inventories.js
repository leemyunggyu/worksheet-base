"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.assignPickingInventoriesResolver = {
    async assignPickingInventories(_, { worksheetNo, batchId, productId, packingType, worksheetDetails }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            await assignPickingInventories(trxMgr, domain, user, worksheetNo, batchId, productId, packingType, worksheetDetails);
        });
    }
};
async function assignPickingInventories(trxMgr, domain, user, worksheetNo, batchId, productId, packingType, worksheetDetails) {
    const worksheetController = new controllers_1.PickingWorksheetController(trxMgr, domain, user);
    await worksheetController.assignPikcingInventories(worksheetNo, batchId, productId, packingType, worksheetDetails);
}
exports.assignPickingInventories = assignPickingInventories;
//# sourceMappingURL=assign-picking-inventories.js.map