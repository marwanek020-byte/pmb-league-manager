"use client";

import { useCallback, useEffect, useState } from "react";
import { ToastState } from "@/components/Toast";

export function useToast(autoDismissMs = 4000) {
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), autoDismissMs);
    return () => clearTimeout(timer);
  }, [toast, autoDismissMs]);

  const showSuccess = useCallback((message: string) => setToast({ type: "success", message }), []);
  const showError = useCallback((message: string) => setToast({ type: "error", message }), []);
  const dismiss = useCallback(() => setToast(null), []);

  return { toast, showSuccess, showError, dismiss };
}
