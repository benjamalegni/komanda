import Image from "next/image";
import { MenuItem } from "@/types/types";

async function handleAddItem(item: MenuItem) {
}

export default function ProductCard({ item }: { item: MenuItem }) {
    return (
        <div className="menu-page__item relative flex h-44 w-full items-stretch gap-3 overflow-hidden rounded-sm border-2 border-[var(--color-accent-secondary)] bg-[var(--color-accent-primary)] text-[var(--color-accent-secondary)] hover:shadow-xl hover:border-[var(--color-accent-secondary)] transition-shadow duration-300">
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-4 pr-0">
                <div className="space-y-2">
                    <h1 className="line-clamp-2 text-xl font-bold leading-tight sm:text-2xl underline-offset-4 underline">{item.name}</h1>
                    <p className="line-clamp-2 text-sm leading-5">{item.description}</p>
                </div>
                <p className="text-lg font-semibold">${item.price}</p>
            </div>

            <aside className="flex flex-none items-center p-4 pr-12">
                {item.image ? (
                    <Image
                        className="h-28 w-28 shrink-0 rounded-sm object-cover sm:h-28 sm:w-28"
                        src={item.image}
                        alt={item.name}
                        width={128}
                        height={128}
                    />
                ) : null}
            </aside>

            <div className="absolute bottom-3 right-3">
                <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-secondary)] text-2xl font-bold leading-none text-[var(--color-accent-primary)] shadow-md transition-transform hover:scale-130">
                    +
                </button>
            </div>
        </div>
    )
}