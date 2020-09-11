"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.completeUnloadingPartiallyResolver = {
    async completeUnloadingPartially(_, { arrivalNoticeNo, worksheetDetail }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            await completeUnloadingPartially(trxMgr, domain, user, arrivalNoticeNo, worksheetDetail);
        });
    }
};
async function completeUnloadingPartially(trxMgr, domain, user, arrivalNoticeNo, unloadingWorksheetDetail) {
    const worksheetController = new controllers_1.UnloadingWorksheetController(trxMgr, domain, user);
    await worksheetController.completeUnloadingPartially(arrivalNoticeNo, unloadingWorksheetDetail);
}
exports.completeUnloadingPartially = completeUnloadingPartially;
//# sourceMappingURL=complete-unloading-partially.js.map