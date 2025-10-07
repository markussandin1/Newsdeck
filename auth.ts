import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.OAUTH_CLIENT_ID!,
      clientSecret: process.env.OAUTH_CLIENT_SECRET!,
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
    async signIn({ user, account }) {
      // Verify email is confirmed by Google
      if (!user.email || !account?.email_verified) {
        return false
      }

      // Extract domain properly (everything after @)
      const emailParts = user.email.split('@')
      if (emailParts.length !== 2) {
        return false
      }

      const domain = emailParts[1].toLowerCase()
      const allowedDomains = ["bonniernews.se", "expressen.se", "di.se", "dn.se"]

      return allowedDomains.includes(domain)
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