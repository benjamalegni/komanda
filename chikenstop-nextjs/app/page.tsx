"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const message = "CHIKEN LOVER?";
  const router = useRouter();

  return (
    <main className="bg-[var(--color-accent-primary)] min-h-screen">
      <header>
        <nav>
          <ul>
            <li>
              <Link href="/">Home</Link>
            </li>
          </ul>
        </nav>
      </header>

      <h1 className="text-4xl font-bold text-center">{message}</h1>
      <div className="flex justify-center gap-4">
      <button className="bg-[var(--color-accent-secondary)] hover:bg-[var(--color-accent-primary)] text-white p-2 rounded-4xl"
      onClick={() => router.push("/order")}
      >
        ORDENA
      </button>
      <button className="bg-[var(--color-accent-secondary)] hover:bg-[var(--color-accent-primary)] text-white p-2 rounded-4xl">
        MENU ONLINE
      </button>
      </div>
    </main>
  );
}
