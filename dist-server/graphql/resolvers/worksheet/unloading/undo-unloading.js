"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.undoUnloadingResolver = {
    async undoUnloading(_, { worksheetDetailName, palletId }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            await undoUnloading(trxMgr, domain, user, worksheetDetailName, palletId);
        });
    }
};
async function undoUnloading(trxMgr, domain, user, worksheetDetailName, palletId) {
    const worksheetController = new controllers_1.UnloadingWorksheetController(trxMgr, domain, user);
    await worksheetController.undoUnload(worksheetDetailName, palletId);
}
//# sourceMappingURL=undo-unloading.js.map