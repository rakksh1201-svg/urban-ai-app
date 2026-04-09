// Supabase authentication utility
import { supabase } from "../supabase/client";

type SignInOptions = {
  redirectTo?: string;
};

export const auth = {
  signInWithOAuth: async (provider: "google" | "apple" | "microsoft", opts?: SignInOptions) => {
    return supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: opts?.redirectTo || window.location.origin,
      },
    });
  },
};
