import { redirect } from "next/navigation";
import { devBypass, signIn } from "@/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  if (devBypass) redirect("/library");
  const { callbackUrl } = await searchParams;
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: callbackUrl ?? "/library" });
        }}
        className="w-80 rounded-lg border border-neutral-200 bg-white p-6 text-center shadow-sm"
      >
        <h1 className="text-lg font-bold">Ad Library</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Internal tool for the Ad Creative Lab. Sign in with your Alan account.
        </p>
        <button
          type="submit"
          className="mt-4 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Continue with Google
        </button>
      </form>
    </div>
  );
}
