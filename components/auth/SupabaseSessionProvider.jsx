"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

const SESSION_SYNC_EVENTS = new Set(["SIGNED_IN", "SIGNED_OUT", "TOKEN_REFRESHED"]);

async function syncSessionWithServer(event, session) {
  try {
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ event, session }),
    });
  } catch (err) {
    console.error("Failed to sync Supabase session", err);
  }
}

export default function SupabaseSessionProvider() {
  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active || !session) return;
      await syncSessionWithServer("SIGNED_IN", session);
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!SESSION_SYNC_EVENTS.has(event)) return;
      await syncSessionWithServer(event, session);
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  return null;
}
