"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.undoLoadingResolver = {
    async undoLoading(_, { deliveryOrder, palletIds }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            await undoLoading(trxMgr, domain, user, deliveryOrder, palletIds);
        });
    }
};
async function undoLoading(trxMgr, domain, user, deliveryOrder, palletIds) {
    const worksheetController = new controllers_1.LoadingWorksheetController(trxMgr, domain, user);
    await worksheetController.undoLoading(deliveryOrder, palletIds);
}
exports.undoLoading = undoLoading;
//# sourceMappingURL=undo-loading.js.map