"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.completeUnloadingResolver = {
    async completeUnloading(_, { arrivalNoticeNo, worksheetDetails }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            await completeUnloading(trxMgr, domain, user, arrivalNoticeNo, worksheetDetails);
            const worksheetController = new controllers_1.UnloadingWorksheetController(trxMgr, domain, user);
            worksheetController.notifyToOfficeAdmin({
                title: `Unloading Completed`,
                message: `${arrivalNoticeNo} is ready for putaway`,
                url: context.header.referer
            });
        });
    }
};
async function completeUnloading(trxMgr, domain, user, arrivalNoticeNo, unloadingWorksheetDetails) {
    const worksheetController = new controllers_1.UnloadingWorksheetController(trxMgr, domain, user);
    await worksheetController.completeUnloading(arrivalNoticeNo, unloadingWorksheetDetails);
}
exports.completeUnloading = completeUnloading;
//# sourceMappingURL=complete-unloading.js.map