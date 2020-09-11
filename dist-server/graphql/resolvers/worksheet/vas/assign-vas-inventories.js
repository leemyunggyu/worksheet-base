"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.assignVasInventoriesResolver = {
    async assignVasInventories(_, { worksheetDetailIds, inventories }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            await assignVasInventories(trxMgr, domain, user, worksheetDetailIds, inventories);
        });
    }
};
async function assignVasInventories(trxMgr, domain, user, worksheetDetailIds, inventories) {
    const worksheetController = new controllers_1.VasWorksheetController(trxMgr, domain, user);
    await worksheetController.assignInventories(worksheetDetailIds, inventories);
}
exports.assignVasInventories = assignVasInventories;
//# sourceMappingURL=assign-vas-inventories.js.map