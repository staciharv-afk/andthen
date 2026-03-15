import { useState, useEffect, useRef, useCallback } from "react";

/* ─────────────────────────────────────────────────────────────
   SUPABASE CLIENT
   ───────────────────────────────────────────────────────────── */
const SUPABASE_URL = "https://zwwlyqcwpqenzpfezohv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3d2x5cWN3cHFlbnpwZmV6b2h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMzc5OTMsImV4cCI6MjA4ODkxMzk5M30.jA4ODcyNzQwMn0.xNMM7y_iFnejlbqCDhrGmw1szp1PAIHJhAqYbaj0IaA";