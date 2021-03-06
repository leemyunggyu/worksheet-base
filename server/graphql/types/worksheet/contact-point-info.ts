import { gql } from 'apollo-server-koa'

export const ContactPointInfo = gql`
  type ContactPointInfo {
    id: String
    address: String
    email: String
    fax: String
    phone: String
    contactName: String
  }
`
