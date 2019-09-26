import { gql } from 'apollo-server-koa'

export const NewWorksheetDetail = gql`
  input NewWorksheetDetail {
    name: String
    description: String
    type: String!
    worksheet: ObjectRef
    worker: ObjectRef
    targetProduct: ObjectRef
    targetVas: ObjectRef
    remark: String
    issue: String
  }
`
