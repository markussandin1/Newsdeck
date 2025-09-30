import NextAuth from "next-auth"
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
          response_type: "code",
          hd: "bonniernews.se" // Restrict to bonniernews.se domain
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Only allow @bonniernews.se email addresses
      if (user.email && user.email.endsWith("@bonniernews.se")) {
        return true
      }
      return false
    },
    async session({ session, token }) {
      return session
    }
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error"
  },
  secret: process.env.NEXTAUTH_SECRET
})