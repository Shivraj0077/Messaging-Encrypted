"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function OAuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function finishOAuth() {
      // Extract the URL hash: #access_token=...
      const hash = window.location.hash;

      if (!hash) {
        console.error("No hash params found");
        router.push("/login");
        return;
      }

      // Convert hash fragment to object
      const params = Object.fromEntries(
        hash
          .substring(1)
          .split("&")
          .map((x) => x.split("="))
      );

      const { access_token, refresh_token } = params;

      if (!access_token) {
        console.error("No access token found");
        router.push("/login");
        return;
      }

      // Set the session MANUALLY (required!)
      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        console.error("Error setting session:", error);
        router.push("/login");
        return;
      }

      // Clean the URL
      window.location.hash = "";

      // Redirect to chat
      router.replace("/chat");
    }

    finishOAuth();
  }, [router]);

  return <div style={{ padding: 40 }}>Logging you in…</div>;
}
