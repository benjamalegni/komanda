"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const AUTO_REFRESH_INTERVAL_MS = 3000;
const MAX_AUTO_REFRESH_ATTEMPTS = 20;

export default function PaymentConfirmationAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let attempts = 0;
    const refreshTimer = window.setInterval(() => {
      attempts += 1;
      router.refresh();

      if (attempts >= MAX_AUTO_REFRESH_ATTEMPTS) {
        window.clearInterval(refreshTimer);
      }
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(refreshTimer);
    };
  }, [router]);

  return null;
}
