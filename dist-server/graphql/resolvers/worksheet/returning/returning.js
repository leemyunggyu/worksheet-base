"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.returningResolver = {
    async returning(_, { worksheetDetailName, palletId, toLocation }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            await returning(trxMgr, domain, user, worksheetDetailName, palletId, toLocation);
        });
    }
};
async function returning(trxMgr, domain, user, worksheetDetailName, palletId, toLocationName) {
    const worksheetController = new controllers_1.ReturningWorksheetController(trxMgr, domain, user);
    await worksheetController.returning(worksheetDetailName, palletId, toLocationName);
}
exports.returning = returning;
//# sourceMappingURL=returning.js.map