"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generate_worksheet_1 = require("./generate-worksheet");
const inspecting_1 = require("./inspecting");
const loading_1 = require("./loading");
const picking_1 = require("./picking");
const putaway_1 = require("./putaway");
const returning_1 = require("./returning");
const unloading_1 = require("./unloading");
const vas_1 = require("./vas");
const confirm_cancellation_release_order_1 = require("./confirm-cancellation-release-order");
const create_worksheet_1 = require("./create-worksheet");
const cross_dock_picking_1 = require("./cross-dock-picking");
const cycle_count_adjustment_1 = require("./cycle-count-adjustment");
const cycle_count_worksheet_1 = require("./cycle-count-worksheet");
const delete_worksheet_1 = require("./delete-worksheet");
const delivery_order_by_worksheet_1 = require("./delivery-order-by-worksheet");
const edit_batch_no_1 = require("./edit-batch-no");
const having_vas_1 = require("./having-vas");
const inventories_by_pallet_1 = require("./inventories-by-pallet");
const loaded_inventories_1 = require("./loaded-inventories");
const loading_worksheet_1 = require("./loading-worksheet");
const pending_cancellation_release_order_1 = require("./pending-cancellation-release-order");
const picking_worksheet_1 = require("./picking-worksheet");
const preunload_worksheet_1 = require("./preunload-worksheet");
const proceed_edited_batch_1 = require("./proceed-edited-batch");
const proceed_extra_products_1 = require("./proceed-extra-products");
const putaway_worksheet_1 = require("./putaway-worksheet");
const reject_cancellation_release_order_1 = require("./reject-cancellation-release-order");
const replace_picking_pallets_1 = require("./replace-picking-pallets");
const return_worksheet_1 = require("./return-worksheet");
const submit_adjustment_for_approval_1 = require("./submit-adjustment-for-approval");
const transfer_1 = require("./transfer");
const unloaded_inventories_1 = require("./unloaded-inventories");
const unloading_worksheet_1 = require("./unloading-worksheet");
const update_worksheet_1 = require("./update-worksheet");
const vas_candidates_1 = require("./vas-candidates");
const vas_transactions_1 = require("./vas-transactions");
const vas_worksheet_1 = require("./vas-worksheet");
const worksheet_1 = require("./worksheet");
const worksheet_by_order_no_1 = require("./worksheet-by-order-no");
const worksheets_1 = require("./worksheets");
exports.Query = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, worksheets_1.worksheetsResolver), worksheet_1.worksheetResolver), unloading_worksheet_1.unloadingWorksheetResolver), preunload_worksheet_1.preunloadWorksheetResolver), delivery_order_by_worksheet_1.deliveryOrderByWorksheetResolver), putaway_worksheet_1.putawayWorksheetResolver), return_worksheet_1.returnWorksheetResolver), picking_worksheet_1.pickingWorksheetResolver), cycle_count_worksheet_1.cycleCountWorksheetResolver), vas_worksheet_1.vasWorksheetResolver), loading_worksheet_1.loadingWorksheetResolver), unloaded_inventories_1.unloadedInventories), loaded_inventories_1.loadedInventories), vas_candidates_1.vasCandidatesResolver), inventories_by_pallet_1.inventoriesByPalletResolver), vas_transactions_1.checkRelabelableResolver), having_vas_1.havingVasResolver), worksheet_by_order_no_1.worksheetByOrderNoResolver);
exports.Mutation = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, generate_worksheet_1.Mutations), unloading_1.Mutations), putaway_1.Mutations), vas_1.Mutations), picking_1.Mutations), loading_1.Mutations), returning_1.Mutations), inspecting_1.Mutations), update_worksheet_1.updateWorksheet), create_worksheet_1.createWorksheet), cycle_count_adjustment_1.cycleCountAdjustment), delete_worksheet_1.deleteWorksheet), edit_batch_no_1.editBatchNo), proceed_edited_batch_1.proceedEditedBatchResolver), transfer_1.transfer), proceed_extra_products_1.proceedExtraProductsResolver), replace_picking_pallets_1.replacePickingPalletsResolver), pending_cancellation_release_order_1.pendingCancellationReleaseOrder), confirm_cancellation_release_order_1.confirmCancellationReleaseOrder), reject_cancellation_release_order_1.rejectCancellationReleaseOrder), submit_adjustment_for_approval_1.submitAdjustmentForApprovalResolver), vas_transactions_1.repalletizingResolver), vas_transactions_1.undoRepalletizingResolver), vas_transactions_1.repackagingResolver), vas_transactions_1.undoRepackagingResolver), vas_transactions_1.relabelingResolver), vas_transactions_1.undoRelabelingResolver), cross_dock_picking_1.crossDockPickingResolver);
//# sourceMappingURL=index.js.map