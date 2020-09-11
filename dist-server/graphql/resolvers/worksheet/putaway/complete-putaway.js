"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sales_base_1 = require("@things-factory/sales-base");
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
const entities_1 = require("../../../../entities");
exports.completePutawayResolver = {
    async completePutaway(_, { arrivalNoticeNo }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            await completePutaway(trxMgr, domain, user, arrivalNoticeNo);
        });
    }
};
async function completePutaway(trxMgr, domain, user, arrivalNoticeNo) {
    var _a, _b;
    const worksheetController = new controllers_1.PutawayWorksheetController(trxMgr, domain, user);
    let worksheet = await worksheetController.completePutaway(arrivalNoticeNo);
    /**
     * 4. Generate the Goods Received Note straight away
     */
    if (!((_a = worksheet.arrivalNotice) === null || _a === void 0 ? void 0 : _a.name) || !((_b = worksheet.bizplace) === null || _b === void 0 ? void 0 : _b.id)) {
        worksheet = await trxMgr.getRepository(entities_1.Worksheet).findOne(worksheet.id, {
            relations: ['bizplace', 'arrivalNotice']
        });
    }
    const arrivalNotice = worksheet.arrivalNotice;
    await sales_base_1.generateGoodsReceivalNote({ refNo: arrivalNotice.name, customer: worksheet.bizplace.id }, domain, user, trxMgr);
}
exports.completePutaway = completePutaway;
//# sourceMappingURL=complete-putaway.js.map