"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.unloadResolver = {
    async unload(_, { worksheetDetailName, inventory }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            await unload(trxMgr, domain, user, worksheetDetailName, inventory);
        });
    }
};
async function unload(trxMgr, domain, user, worksheetDetailName, inventory) {
    const { palletId, qty } = inventory;
    const worksheetController = new controllers_1.UnloadingWorksheetController(trxMgr, domain, user);
    await worksheetController.unload(worksheetDetailName, inventory);
}
//# sourceMappingURL=unload.js.map