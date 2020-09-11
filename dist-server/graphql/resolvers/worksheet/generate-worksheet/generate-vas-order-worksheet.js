"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sales_base_1 = require("@things-factory/sales-base");
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers/");
exports.generateVasOrderWorksheetResolver = {
    async generateVasOrderWorksheet(_, { vasNo }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            const foundVasOrder = await trxMgr.getRepository(sales_base_1.VasOrder).findOne({
                where: { domain, name: vasNo, status: sales_base_1.ORDER_STATUS.PENDING_RECEIVE }
            });
            return await generateVasOrderWorksheet(trxMgr, domain, user, foundVasOrder);
        });
    }
};
async function generateVasOrderWorksheet(trxMgr, domain, user, vasOrder) {
    const worksheetController = new controllers_1.VasWorksheetController(trxMgr, domain, user);
    return await worksheetController.generateVasWorksheet(vasOrder);
}
exports.generateVasOrderWorksheet = generateVasOrderWorksheet;
//# sourceMappingURL=generate-vas-order-worksheet.js.map