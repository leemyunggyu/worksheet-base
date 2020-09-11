"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sales_base_1 = require("@things-factory/sales-base");
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
const entities_1 = require("../../../../entities");
exports.generateArrivalNoticeWorksheetResolver = {
    async generateArrivalNoticeWorksheet(_, { arrivalNoticeNo, bufferLocation }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            var _a;
            const { domain, user } = context.state;
            let unloadingWorksheet = await generateUnloadingWorksheet(trxMgr, domain, user, arrivalNoticeNo, bufferLocation);
            if (!((_a = unloadingWorksheet.arrivalNotice) === null || _a === void 0 ? void 0 : _a.id)) {
                unloadingWorksheet = await trxMgr.getRepository(entities_1.Worksheet).findOne({
                    where: unloadingWorksheet,
                    relations: ['arrivalNotice']
                });
            }
            let arrivalNotice = unloadingWorksheet.arrivalNotice;
            const crossDocking = unloadingWorksheet.arrivalNotice.crossDocking;
            if (crossDocking) {
                arrivalNotice = await trxMgr
                    .getRepository(sales_base_1.ArrivalNotice)
                    .findOne({ where: { domain: context.state.domain, name: arrivalNoticeNo }, relations: ['releaseGood'] });
                const releaseGoodNo = arrivalNotice.releaseGood.name;
                const pickingWSCtrl = new controllers_1.PickingWorksheetController(trxMgr, domain, user);
                await pickingWSCtrl.generatePickingWorksheet(releaseGoodNo);
            }
            const vasWorksheet = await trxMgr.getRepository(entities_1.Worksheet).findOne({
                where: { domain: context.state.domain, arrivalNotice }
            });
            return { unloadingWorksheet, vasWorksheet };
        });
    }
};
async function generateUnloadingWorksheet(trxMgr, domain, user, arrivalNoticeNo, bufferLocation) {
    const worksheetController = new controllers_1.UnloadingWorksheetController(trxMgr, domain, user);
    return await worksheetController.generateUnloadingWorksheet(arrivalNoticeNo, bufferLocation.id);
}
//# sourceMappingURL=generate-arrival-notice-worksheet.js.map