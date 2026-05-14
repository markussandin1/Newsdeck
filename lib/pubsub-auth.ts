import { OAuth2Client } from 'google-auth-library'
import { logger } from '@/lib/logger'

const oauthClient = new OAuth2Client()

/**
 * Verify the OIDC token attached by Google Cloud Pub/Sub to push messages.
 *
 * The push subscription must be configured with an authentication service
 * account; GCP signs each request with an OIDC token in the Authorization
 * header. We verify the token and (optionally) check the service-account
 * email against PUBSUB_PUSH_SERVICE_ACCOUNT.
 *
 * Returns true on success. On failure, the route handler should reject the
 * request with 401.
 */
export async function verifyPubsubOidc(authorization: string | null): Promise<boolean> {
  if (!authorization?.startsWith('Bearer ')) {
    logger.warn('pubsub.auth.missingBearer')
    return false
  }

  const token = authorization.slice('Bearer '.length).trim()
  if (!token) {
    logger.warn('pubsub.auth.emptyToken')
    return false
  }

  const audience = process.env.PUBSUB_PUSH_AUDIENCE
  if (!audience) {
    logger.error('pubsub.auth.missingAudienceEnv')
    return false
  }

  try {
    const ticket = await oauthClient.verifyIdToken({ idToken: token, audience })
    const payload = ticket.getPayload()
    if (!payload) {
      logger.warn('pubsub.auth.emptyPayload')
      return false
    }

    const allowedSa = process.env.PUBSUB_PUSH_SERVICE_ACCOUNT
    if (allowedSa && payload.email !== allowedSa) {
      logger.warn('pubsub.auth.unexpectedServiceAccount', {
        email: payload.email,
        expected: allowedSa,
      })
      return false
    }

    return true
  } catch (error) {
    logger.warn('pubsub.auth.verifyFailed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}
