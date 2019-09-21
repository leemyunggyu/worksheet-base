import { gql } from 'apollo-server-koa'

export const UnloadWorksheetDetail = gql`
  type UnloadWorksheetDetail {
    id: String
    name: String
    remark: String
    description: String
    product: Product
    seq: Int
    batchId: String
    packingType: String
    unit: String
    weight: Float
    packQty: Int
    palletQty: Int
    totalWeight: String
  }
`
