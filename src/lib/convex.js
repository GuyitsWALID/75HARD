import { ConvexClient } from "convex/browser";
import { readable, writable } from "svelte/store";
import { api } from "../../convex/_generated/api.js";
import { authClient } from "./auth-client.js";

export { api };

const convexUrl = import.meta.env.VITE_CONVEX_URL ?? "";

export const client = new ConvexClient(convexUrl, { expectAuth: true });

export const auth = writable({ isLoading: true, isAuthenticated: false });

let cachedToken = null;
let currentSessionId;
let authenticated = false;

async function fetchAccessToken({ forceRefreshToken } = {}) {
  if (cachedToken && !forceRefreshToken) {
    return cachedToken;
  }

  try {
    const { data } = await authClient.convex.token({
      fetchOptions: { throw: false },
    });
    cachedToken = data?.token ?? null;
  } catch {
    cachedToken = null;
  }

  return cachedToken;
}

const session = authClient.useSession();

session.subscribe((value) => {
  if (value.isPending) {
    auth.set({ isLoading: true, isAuthenticated: false });
    return;
  }

  const sessionId = value.data?.session?.id ?? null;
  if (sessionId === currentSessionId && authenticated === Boolean(sessionId)) {
    return;
  }

  currentSessionId = sessionId;
  cachedToken = null;

  client.setAuth(fetchAccessToken, (isAuthenticated) => {
    authenticated = isAuthenticated;
    auth.set({ isLoading: false, isAuthenticated });
  });
});

export function query(reference) {
  return readable(undefined, (set) => {
    const subscription = client.onUpdate(
      reference,
      {},
      set,
      () => set(undefined),
    );

    return () => subscription.unsubscribe();
  });
}

export function mutate(reference, args = {}) {
  return client.mutation(reference, args);
}
