import { gql } from 'apollo-server-koa'

export const WorksheetInfo = gql`
  type WorksheetInfo {
    name: String
    status: String
    bufferLocation: Location
    startedAt: String
    bizplace: Bizplace
  }
`
