import { randomString } from '@twake/crypto'
import type IdentityServerDb from '../db'
import {
  epoch,
  jsonContent,
  send,
  validateParameters,
  type expressAppHandler
} from '../utils'
import { errMsg } from '../utils/errors'
import validateMatrixToken from '../utils/validateMatrixToken'

const schema = {
  access_token: true,
  expires_in: true,
  matrix_server_name: true,
  token_type: true
}

type registerArgs = Record<keyof typeof schema, string>

export interface tokenContent {
  sub: string
  epoch: number
}

const Register = (db: IdentityServerDb): expressAppHandler => {
  return (req, res) => {
    jsonContent(req, res, db.logger, (obj) => {
      validateParameters(res, schema, obj, db.logger, (obj) => {
        validateMatrixToken(
          (obj as registerArgs).matrix_server_name,
          (obj as registerArgs).access_token
        )
          .then((sub) => {
            const data: tokenContent = {
              sub,
              epoch: epoch()
            }
            const token = randomString(64)
            db.insert('accessTokens', {
              id: token,
              data: JSON.stringify(data)
            })
              .then(() => {
                send(res, 200, { token })
              })
              .catch((e) => {
                /* istanbul ignore next */
                db.logger.error('Unable to create session', e)
                /* istanbul ignore next */
                send(res, 500, errMsg('unknown', 'Unable to create session'))
              })
          })
          .catch((e) => {
            send(res, 400, errMsg('unknown', e))
          })
      })
    })
  }
}

export default Register
