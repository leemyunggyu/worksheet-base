"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.activateReturnResolver = {
    async activateReturn(_, { worksheetNo, returnWorksheetDetails }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            return await activateReturn(trxMgr, domain, user, worksheetNo, returnWorksheetDetails);
        });
    }
};
async function activateReturn(trxMgr, domain, user, worksheetNo, returningWorksheetDetails) {
    const worksheetController = new controllers_1.ReturningWorksheetController(trxMgr, domain, user);
    return await worksheetController.activateReturning(worksheetNo, returningWorksheetDetails);
}
exports.activateReturn = activateReturn;
//# sourceMappingURL=activate-return.js.map