"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.preunloadResolver = {
    async preunload(_, { worksheetDetailName, adjustedBatchId, adjustedPalletQty, palletQty }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            await preunload(trxMgr, domain, user, worksheetDetailName, adjustedBatchId, adjustedPalletQty, palletQty);
        });
    }
};
async function preunload(trxMgr, domain, user, worksheetDetailName, adjustedBatchId, adjustedPalletQty, palletQty) {
    const worksheetController = new controllers_1.UnloadingWorksheetController(trxMgr, domain, user);
    await worksheetController.preunload(worksheetDetailName, adjustedBatchId, adjustedPalletQty, palletQty);
}
exports.preunload = preunload;
//# sourceMappingURL=preunload.js.map