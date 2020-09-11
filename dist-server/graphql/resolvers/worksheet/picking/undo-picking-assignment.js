"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.undoPickingAssigmentResolver = {
    async undoPickingAssigment(_, { worksheetNo, batchId, productId, packingType }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            await undoPickingAssigment(trxMgr, domain, user, worksheetNo, batchId, productId, packingType);
        });
    }
};
async function undoPickingAssigment(trxMgr, domain, user, worksheetNo, batchId, productId, packingType) {
    const worksheetController = new controllers_1.PickingWorksheetController(trxMgr, domain, user);
    await worksheetController.undoPickingAssigment(worksheetNo, batchId, productId, packingType);
}
exports.undoPickingAssigment = undoPickingAssigment;
//# sourceMappingURL=undo-picking-assignment.js.map