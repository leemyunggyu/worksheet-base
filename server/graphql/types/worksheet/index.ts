import { ArrivalNoticeWorksheet } from './arrival-notice-worksheet'
import { NewWorksheet } from './new-worksheet'
import { Worksheet } from './worksheet'
import { WorksheetDetailInfo } from './worksheet-detail-info'
import { WorksheetInfo } from './worksheet-info'
import { WorksheetList } from './worksheet-list'
import { WorksheetPatch } from './worksheet-patch'
import { ExecutingWorksheet } from './executing-worksheet'

export const Mutation = `
  createWorksheet (
    worksheet: NewWorksheet!
  ): Worksheet

  updateWorksheet (
    name: String!
    patch: WorksheetPatch!
  ): Worksheet

  deleteWorksheet (
    name: String!
  ): Boolean

  generateArrivalNoticeWorksheet (
    arrivalNoticeNo: String!
    bufferLocation: ObjectRef!
  ): ArrivalNoticeWorksheet

  activateUnloading (
    name: String!
    unloadingWorksheetDetails: [WorksheetDetailPatch]
  ): Worksheet

  activateVas (
    name: String!
    vasWorksheetDetails: [WorksheetDetailPatch]
  ): Worksheet

  completeUnloading (
    arrivalNoticeNo: String!
    unloadingWorksheetDetails: [WorksheetDetailPatch]!
  ): Worksheet
`

export const Query = `
  worksheets(filters: [Filter], pagination: Pagination, sortings: [Sorting]): WorksheetList
  worksheet(name: String!): Worksheet
  executingWorksheet(orderNo: String!): ExecutingWorksheet
`

export const Types = [
  Worksheet,
  NewWorksheet,
  WorksheetPatch,
  WorksheetList,
  ArrivalNoticeWorksheet,
  WorksheetInfo,
  WorksheetDetailInfo,
  ExecutingWorksheet
]
