"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
const worksheet_controller_1 = require("../../../../controllers/worksheet-controller");
exports.completeReturnResolver = {
    async completeReturn(_, { releaseGoodNo }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            var _a;
            const { domain, user } = context.state;
            let worksheet = await completeReturn(trxMgr, domain, user, releaseGoodNo);
            const worksheetController = new worksheet_controller_1.WorksheetController(trxMgr, domain, user);
            if (!((_a = worksheet.bizplace) === null || _a === void 0 ? void 0 : _a.id)) {
                worksheet = await worksheetController.findWorksheetById(worksheet.id, ['bizplace']);
            }
            const bizplace = worksheet.bizplace;
            await worksheetController.notifyToCustomer(bizplace, {
                title: `Stock has been returned to storage`,
                message: `${releaseGoodNo} is done`,
                url: context.header.referer
            });
        });
    }
};
async function completeReturn(trxMgr, domain, user, releaseGoodNo) {
    const worksheetController = new controllers_1.ReturningWorksheetController(trxMgr, domain, user);
    return await worksheetController.completeReturning(releaseGoodNo);
}
exports.completeReturn = completeReturn;
//# sourceMappingURL=complete-return.js.map