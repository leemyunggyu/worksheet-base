"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.undoInspectionResolver = {
    async undoInspection(_, { worksheetDetailName }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
        });
    }
};
async function undoInspection(trxMgr, domain, user, worksheetDetailName) {
    const worksheetController = new controllers_1.CycleCountWorksheetController(trxMgr, domain, user);
    await worksheetController.undoInspection(worksheetDetailName);
}
exports.undoInspection = undoInspection;
//# sourceMappingURL=undo-inspection.js.map