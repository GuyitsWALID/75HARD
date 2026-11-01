import { createAuthClient } from "better-auth/svelte";
import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";

const convexUrl = import.meta.env.VITE_CONVEX_URL ?? "";
const convexSiteUrl =
  import.meta.env.VITE_CONVEX_SITE_URL ??
  convexUrl.replace(".convex.cloud", ".convex.site");

export const authClient = createAuthClient({
  baseURL: convexSiteUrl,
  plugins: [convexClient(), crossDomainClient()],
});

export const session = authClient.useSession();
