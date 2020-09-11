"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sales_base_1 = require("@things-factory/sales-base");
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.generateCycleCountWorksheetResolver = {
    async generateCycleCountWorksheet(_, { selectedInventory, executionDate }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            const createdCycleOrder = await sales_base_1.generateCycleCount(sales_base_1.OrderNoGenerator.cycleCount(), executionDate, sales_base_1.ORDER_TYPES.CYCLE_COUNT, context.state.domain, context.state.user, trxMgr);
            const cycleCountWorksheet = await generateCycleCountWorksheet(trxMgr, domain, user, createdCycleOrder.name, selectedInventory);
            return { cycleCountWorksheet };
        });
    }
};
async function generateCycleCountWorksheet(trxMgr, domain, user, cycleCountNo, inventories) {
    const worksheetController = new controllers_1.CycleCountWorksheetController(trxMgr, domain, user);
    return await worksheetController.generateCycleCountWorksheet(cycleCountNo, inventories);
}
exports.generateCycleCountWorksheet = generateCycleCountWorksheet;
//# sourceMappingURL=generate-cycle-count-worksheet.js.map