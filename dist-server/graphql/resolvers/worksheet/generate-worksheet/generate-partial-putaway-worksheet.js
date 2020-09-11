"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const warehouse_base_1 = require("@things-factory/warehouse-base");
const typeorm_1 = require("typeorm");
const constants_1 = require("../../../../constants");
const controllers_1 = require("../../../../controllers");
const entities_1 = require("../../../../entities");
exports.generatePartialPutawayWorksheetResolver = {
    async generatePartialPutawayWorksheet(_, { arrivalNoticeNo, inventories }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            var _a, _b;
            const { domain, user } = context.state;
            let worksheet = await generatePartialPutawayWorksheet(trxMgr, domain, user, arrivalNoticeNo, inventories);
            if (!((_b = (_a = worksheet) === null || _a === void 0 ? void 0 : _a.arrivalNotice) === null || _b === void 0 ? void 0 : _b.id)) {
                worksheet = await trxMgr.getRepository(entities_1.Worksheet).findOne({
                    where: { id: worksheet.id },
                    relations: ['arrivalNotice']
                });
            }
            const arrivalNotice = worksheet.arrivalNotice;
            const unloadingWorksheet = await trxMgr.getRepository(entities_1.Worksheet).findOne({
                where: { arrivalNotice, type: constants_1.WORKSHEET_TYPE.UNLOADING },
                relations: [
                    'worksheetDetails',
                    'worksheetDetails.targetInventory',
                    'worksheetDetails.targetInventory.inventory'
                ]
            });
            const remainPalletCnt = await trxMgr.getRepository(warehouse_base_1.Inventory).count({
                where: {
                    domain: context.state.domain,
                    refOrderId: arrivalNotice.id,
                    status: constants_1.WORKSHEET_STATUS.PARTIALLY_UNLOADED
                }
            });
            const wsdStatus = remainPalletCnt >= 0 ? constants_1.WORKSHEET_STATUS.PARTIALLY_UNLOADED : constants_1.WORKSHEET_STATUS.EXECUTING;
            const worksheetDetails = unloadingWorksheet.worksheetDetails;
            const nonStartedWorksheetDetails = worksheetDetails
                .filter((wsd) => { var _a, _b; return ((_b = (_a = wsd.targetInventory) === null || _a === void 0 ? void 0 : _a.inventory) === null || _b === void 0 ? void 0 : _b.status) !== warehouse_base_1.INVENTORY_STATUS.PARTIALLY_UNLOADED; })
                .map((wsd) => {
                wsd.status = wsdStatus;
                wsd.updater = user;
                return wsd;
            });
            await trxMgr.getRepository(entities_1.WorksheetDetail).save(nonStartedWorksheetDetails);
        });
    }
};
async function generatePartialPutawayWorksheet(trxMgr, domain, user, arrivalNoticeNo, inventories) {
    const worksheetController = new controllers_1.PutawayWorksheetController(trxMgr, domain, user);
    return await worksheetController.generatePutawayWorksheet(arrivalNoticeNo, inventories);
}
exports.generatePartialPutawayWorksheet = generatePartialPutawayWorksheet;
//# sourceMappingURL=generate-partial-putaway-worksheet.js.map