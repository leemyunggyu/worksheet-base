"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const warehouse_base_1 = require("@things-factory/warehouse-base");
const typeorm_1 = require("typeorm");
const constants_1 = require("../../../../constants");
const controllers_1 = require("../../../../controllers");
const entities_1 = require("../../../../entities");
exports.generatePutawayWorksheetResolver = {
    async generatePutawayWorksheet(_, { arrivalNoticeNo, inventories }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            var _a;
            const { domain, user } = context.state;
            let worksheet = await generatePutawayWorksheet(trxMgr, domain, user, arrivalNoticeNo, inventories);
            if (!((_a = worksheet.arrivalNotice) === null || _a === void 0 ? void 0 : _a.id)) {
                worksheet = await trxMgr.getRepository(entities_1.Worksheet).findOne({
                    where: { id: worksheet.id },
                    relations: ['arrivalNotice']
                });
            }
            // Find whether there's partially unloaded and not started inventories
            // to execute it automatically.
            const arrivalNotice = worksheet.arrivalNotice;
            const unloadingWorksheet = await trxMgr.getRepository(entities_1.Worksheet).findOne({
                where: { arrivalNotice, type: constants_1.WORKSHEET_TYPE.UNLOADING },
                relations: [
                    'worksheetDetails',
                    'worksheetDetails.targetInventory',
                    'worksheetDetails.targetInventory.inventory'
                ]
            });
            const worksheetDetails = unloadingWorksheet.worksheetDetails;
            const nonStartedWorksheetDetails = worksheetDetails
                .filter((wsd) => { var _a, _b; return ((_b = (_a = wsd.targetInventory) === null || _a === void 0 ? void 0 : _a.inventory) === null || _b === void 0 ? void 0 : _b.status) !== warehouse_base_1.INVENTORY_STATUS.PARTIALLY_UNLOADED; })
                .map((wsd) => {
                wsd.status = constants_1.WORKSHEET_STATUS.EXECUTING;
                wsd.updater = user;
                return wsd;
            });
            await trxMgr.getRepository(entities_1.WorksheetDetail).save(nonStartedWorksheetDetails);
        });
    }
};
async function generatePutawayWorksheet(trxMgr, domain, user, arrivalNoticeNo, inventories) {
    const worksheetController = new controllers_1.PutawayWorksheetController(trxMgr, domain, user);
    return await worksheetController.generatePutawayWorksheet(arrivalNoticeNo, inventories);
}
exports.generatePutawayWorksheet = generatePutawayWorksheet;
//# sourceMappingURL=generate-putaway-worksheet.js.map