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
    async signIn({ user }) {
      // Only allow @bonniernews.se and @expressen.se email addresses
      if (user.email && (user.email.endsWith("@bonniernews.se") || user.email.endsWith("@expressen.se"))) {
        return true
      }
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