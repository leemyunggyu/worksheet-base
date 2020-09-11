"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.completePreunloadResolver = {
    async completePreunload(_, { arrivalNoticeNo }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            await completePreunload(trxMgr, domain, user, arrivalNoticeNo);
            const worksheetController = new controllers_1.WorksheetController(trxMgr, domain, user);
            worksheetController.notifyToOfficeAdmin({
                title: `Pending Adjustment for ${arrivalNoticeNo}`,
                message: `Pending process for batch id adjustments`,
                url: context.header.referer
            });
        });
    }
};
async function completePreunload(trxMgr, domain, user, arrivalNoticeNo) {
    const worksheetController = new controllers_1.UnloadingWorksheetController(trxMgr, domain, user);
    return await worksheetController.completePreunloading(arrivalNoticeNo);
}
exports.completePreunload = completePreunload;
//# sourceMappingURL=complete-preunload.js.map