import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { login, isLoggingIn, identity } = useInternetIdentity();
  // Keep a ref so the effect always has the latest callback without re-firing
  const onLoginSuccessRef = useRef(onLoginSuccess);
  onLoginSuccessRef.current = onLoginSuccess;

  // When identity appears AFTER clicking Login (popup flow), notify parent.
  // This does NOT fire on mount for returning users — they use the button instead.
  useEffect(() => {
    if (identity) {
      onLoginSuccessRef.current?.();
    }
  }, [identity]);

  const handleClick = () => {
    if (identity) {
      // Returning user: already authenticated, skip the II popup
      onLoginSuccess?.();
    } else {
      // New login: open Internet Identity popup
      login();
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-end pb-20 relative overflow-hidden"
      style={{
        backgroundImage: "url('/assets/uploads/images-3--1.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Dark overlay at bottom for readability */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)",
        }}
      />

      {/* Logo / branding at top */}
      <div className="absolute top-10 left-0 right-0 flex flex-col items-center z-10">
        <h1 className="revspace-logo text-5xl font-black text-white drop-shadow-lg">
          Rev<span style={{ color: "oklch(var(--orange))" }}>Space</span>
        </h1>
      </div>

      {/* Login button at bottom */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-6">
        <Button
          onClick={handleClick}
          disabled={isLoggingIn}
          className="w-full h-14 text-lg font-bold rounded-2xl mb-4"
          style={{
            background: "oklch(var(--orange))",
            color: "#000",
            boxShadow: "0 0 40px oklch(var(--orange) / 0.5)",
          }}
        >
          {isLoggingIn ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Connecting...
            </div>
          ) : identity ? (
            "Continue to RevSpace"
          ) : (
            "Login to Site"
          )}
        </Button>
        <p className="text-[11px] text-white/60 text-center">
          Powered by Internet Identity — no passwords, no tracking.
        </p>
      </div>
    </div>
  );
}
