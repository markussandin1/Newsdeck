import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

const googleClientId = process.env.GOOGLE_CLIENT_ID ?? process.env.OAUTH_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? process.env.OAUTH_CLIENT_SECRET
const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build"

if (!googleClientId || !googleClientSecret) {
  const message = "Missing Google OAuth credentials. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the environment."

  if (isProductionBuild) {
    console.warn(message)
  } else {
    throw new Error(message)
  }
}

const resolvedGoogleClientId = googleClientId ?? ""
const resolvedGoogleClientSecret = googleClientSecret ?? ""

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: resolvedGoogleClientId,
      clientSecret: resolvedGoogleClientSecret,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code"
          // hd parameter removed to allow multiple domains
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days (default)
    updateAge: 24 * 60 * 60,    // Update session every 24 hours
  },
  callbacks: {
    async signIn({ user, profile }) {
      if (!user.email) {
        console.warn("Login rejected: missing email on Google user")
        return false
      }

      const allowedDomains = ["bonniernews.se", "expressen.se", "di.se", "dn.se"]
      const allowedDomainSet = new Set(allowedDomains)

      const normalize = (value: string | undefined | null) =>
        value?.trim().toLowerCase() ?? undefined

      const isAllowedDomain = (value: string | undefined) => {
        if (!value) return false
        const normalized = normalize(value)
        if (!normalized) return false

        if (allowedDomainSet.has(normalized)) {
          return true
        }

        return allowedDomains.some(domain =>
          normalized.endsWith(`.${domain}`)
        )
      }

      const email = user.email.trim()
      const maskedEmail = email.replace(/^[^@]+/, "***")
      const emailParts = email.split("@")
      if (emailParts.length !== 2) {
        console.warn("Login rejected: malformed email", { maskedEmail })
        return false
      }

      const emailDomain = normalize(emailParts[1])

      // Ensure Google reports the email as verified whenever the field is present
      if (profile && "email_verified" in profile) {
        const rawEmailVerified = (profile as Record<string, unknown>).email_verified
        let verifiedValue: boolean | undefined

        if (typeof rawEmailVerified === "boolean") {
          verifiedValue = rawEmailVerified
        } else if (typeof rawEmailVerified === "string") {
          verifiedValue = rawEmailVerified.toLowerCase() === "true"
        }

        if (verifiedValue === false) {
          console.warn("Login rejected: email not verified", {
            domain: emailDomain,
            maskedEmail
          })
          return false
        }
      }

      const hostedDomain = normalize(
        typeof profile?.hd === "string" ? profile.hd : undefined
      )

      const emailDomainAllowed = isAllowedDomain(emailDomain)
      const hostedDomainAllowed = isAllowedDomain(hostedDomain)

      if (emailDomainAllowed || hostedDomainAllowed) {
        console.info("Login granted", {
          maskedEmail,
          emailDomain,
          hostedDomain,
          used: emailDomainAllowed ? "email" : "hostedDomain"
        })
        return true
      }

      console.warn("Login rejected: domain not allowed", {
        maskedEmail,
        emailDomain,
        hostedDomain
      })
      return false
    },
    async session({ session }) {
      return session
    }
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error"
  },
  secret: process.env.NEXTAUTH_SECRET
} satisfies NextAuthConfig)
