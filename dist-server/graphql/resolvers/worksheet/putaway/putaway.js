"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.putawayResolver = {
    async putaway(_, { worksheetDetailName, palletId, toLocation }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            await putaway(trxMgr, domain, user, worksheetDetailName, palletId, toLocation);
        });
    }
};
async function putaway(trxMgr, domain, user, worksheetDetailName, palletId, locationName) {
    const worksheetController = new controllers_1.PutawayWorksheetController(trxMgr, domain, user);
    await worksheetController.putaway(worksheetDetailName, palletId, locationName);
}
//# sourceMappingURL=putaway.js.map