"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.executeVasResolver = {
    async executeVas(_, { worksheetDetail, palletId }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            /**
             * @description If pallet id param is exists.
             * Meaning, the VAS order have been requested with Arrival Notice or Release Order
             * Those types of VAS doesn't have flow to assign specific vas target inventory
             * Assignment should be done within executeVas transaction.
             */
            await executeVas(trxMgr, domain, user, worksheetDetail, palletId);
        });
    }
};
async function executeVas(trxMgr, domain, user, worksheetDetail, palletId) {
    const worksheetController = new controllers_1.VasWorksheetController(trxMgr, domain, user);
    await worksheetController.excuteVAS(worksheetDetail, palletId);
}
exports.executeVas = executeVas;
//# sourceMappingURL=execute-vas.js.map