import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN ?? "alan.eu";

export const devBypass = process.env.AUTH_DEV_BYPASS === "true";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          // Hint Google to only offer workspace accounts; enforced in signIn below.
          hd: allowedDomain,
          prompt: "select_account",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    signIn({ profile }) {
      return Boolean(profile?.email?.endsWith(`@${allowedDomain}`) && profile?.email_verified);
    },
  },
  pages: { signIn: "/signin" },
});

export type SessionUser = { email: string; name: string };

/** Resolve the current user, honoring the dev bypass. Returns null when unauthenticated. */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (devBypass) return { email: "dev@alan.eu", name: "Dev User" };
  const session = await auth();
  if (!session?.user?.email) return null;
  return { email: session.user.email, name: session.user.name ?? session.user.email };
}

/** Like getSessionUser but throws — for server actions and API routes. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
