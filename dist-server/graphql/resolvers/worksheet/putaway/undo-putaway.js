"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.undoPutawayResolver = {
    async undoPutaway(_, { worksheetDetailName, palletId }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            await undoPutaway(trxMgr, domain, user, worksheetDetailName, palletId);
        });
    }
};
async function undoPutaway(trxMgr, domain, user, worksheetDetailName, palletId) {
    const worksheetController = new controllers_1.PutawayWorksheetController(trxMgr, domain, user);
    await worksheetController.undoPutaway(worksheetDetailName, palletId);
}
exports.undoPutaway = undoPutaway;
//# sourceMappingURL=undo-putaway.js.map