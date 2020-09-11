"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.activateCycleCountResolver = {
    async activateCycleCount(_, { worksheetNo }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            return await activateCycleCount(trxMgr, domain, user, worksheetNo);
        });
    }
};
async function activateCycleCount(trxMgr, domain, user, worksheetNo) {
    const worksheetController = new controllers_1.CycleCountWorksheetController(trxMgr, domain, user);
    return await worksheetController.activateCycleCount(worksheetNo);
}
exports.activateCycleCount = activateCycleCount;
//# sourceMappingURL=activate-cycle-count.js.map