"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.pickingResolver = {
    async picking(_, { worksheetDetailName, palletId, locationName, releaseQty }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            await picking(trxMgr, domain, user, worksheetDetailName, palletId, locationName, releaseQty);
        });
    }
};
async function picking(trxMgr, domain, user, worksheetDetailName, palletId, locationName, releaseQty) {
    const worksheetController = new controllers_1.PickingWorksheetController(trxMgr, domain, user);
    await worksheetController.picking(worksheetDetailName, palletId, locationName, releaseQty);
}
exports.picking = picking;
//# sourceMappingURL=picking.js.map