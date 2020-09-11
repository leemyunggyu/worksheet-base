"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.activatePickingResolver = {
    async activatePicking(_, { worksheetNo }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            return await activatePicking(trxMgr, domain, user, worksheetNo);
        });
    }
};
async function activatePicking(trxMgr, domain, user, worksheetNo) {
    const worksheetController = new controllers_1.PickingWorksheetController(trxMgr, domain, user);
    return await worksheetController.activatePicking(worksheetNo);
}
exports.activatePicking = activatePicking;
//# sourceMappingURL=activate-picking.js.map