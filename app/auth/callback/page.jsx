"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function OAuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function finishOAuth() {
      try {
        // Supabase handles the callback automatically with detectSessionInUrl
        // But we can also manually handle it for more control
        const hash = window.location.hash;
        const searchParams = new URLSearchParams(window.location.search);
        
        // Check if we have hash params (PKCE flow)
        if (hash && hash.includes("access_token")) {
          // Convert hash fragment to object
          const params = Object.fromEntries(
            hash
              .substring(1)
              .split("&")
              .map((x) => {
                const [key, ...values] = x.split("=");
                return [key, decodeURIComponent(values.join("="))];
              })
          );

          const { access_token, refresh_token } = params;

          if (access_token) {
            // Set the session
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
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );

            // Redirect to chat
            router.replace("/chat");
            return;
          }
        }

        // Check if we have query params (alternative flow)
        const code = searchParams.get("code");
        if (code) {
          // Exchange code for session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error("Error exchanging code:", error);
            router.push("/login");
            return;
          }

          // Clean the URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );

          // Redirect to chat
          router.replace("/chat");
          return;
        }

        // Try to get existing session (in case Supabase auto-handled it)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session && !sessionError) {
          // Session exists, redirect to chat
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
          router.replace("/chat");
          return;
        }

        // No valid auth found
        console.error("No valid authentication found");
        router.push("/login");
      } catch (error) {
        console.error("OAuth callback error:", error);
        router.push("/login");
      }
    }

    finishOAuth();
  }, [router]);

  return <div style={{ padding: 40 }}>Logging you in…</div>;
}
