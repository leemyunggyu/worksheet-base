"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const constants_1 = require("../../../../constants");
const controllers_1 = require("../../../../controllers");
const entities_1 = require("../../../../entities");
exports.activatePutawayResolver = {
    async activatePutaway(_, { worksheetNo, putawayWorksheetDetails }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            const foundWorksheet = await trxMgr.getRepository(entities_1.Worksheet).findOne({
                where: {
                    domain,
                    name: worksheetNo,
                    status: constants_1.WORKSHEET_STATUS.DEACTIVATED,
                    type: constants_1.WORKSHEET_TYPE.PUTAWAY
                },
                relations: ['bizplace', 'arrivalNotice', 'worksheetDetails', 'worksheetDetails.targetInventory']
            });
            if (!foundWorksheet)
                throw new Error(`Worksheet doesn't exists`);
            const relatedWorksheetCnt = await trxMgr.getRepository(entities_1.Worksheet).count({
                where: {
                    domain,
                    arrivalNotice: foundWorksheet.arrivalNotice,
                    type: constants_1.WORKSHEET_TYPE.VAS,
                    status: typeorm_1.Not(typeorm_1.Equal(constants_1.WORKSHEET_STATUS.DONE))
                }
            });
            if (relatedWorksheetCnt) {
                throw new Error(`Related VAS order with GAN: ${foundWorksheet.arrivalNotice.name} is still under processing.`);
            }
            return await activatePutaway(trxMgr, domain, user, worksheetNo, putawayWorksheetDetails);
        });
    }
};
async function activatePutaway(trxMgr, domain, user, worksheetNo, putawayWorksheetDetails) {
    const worksheetController = new controllers_1.PutawayWorksheetController(trxMgr, domain, user);
    worksheetController.activatePutaway(worksheetNo, putawayWorksheetDetails);
}
exports.activatePutaway = activatePutaway;
//# sourceMappingURL=activate-putaway.js.map