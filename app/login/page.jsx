"use client";
import { ensureProfileExists } from "@/lib/createProfile";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function LoginPage() {
  const router = useRouter;

  const [user, setUser] = useState(null);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: 
          typeof window !== "undefined" && window.location.origin + "/auth/callback",
      },
    });
    if (error) console.log("Login error:", error);
  };

  useEffect(() => {
    async function loadUser() {
    supabase.auth.getUser().then(async ({ data }) => {
      if(data?.user) {
        await ensureProfileExists(data.user)
        setUser(data.user);
        router.push("/chat");
      }
    })
  }
  loadUser();
  }, [router]);


  return (
    <div style={{ padding: 40 }}>
      <h2>Login</h2>
      <button onClick={signInWithGoogle} style={{ padding: 10 }}>
        Login with Google
      </button>
    </div>
  );
}
