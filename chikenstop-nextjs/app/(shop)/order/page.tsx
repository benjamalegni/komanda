import OrderProductCard from "@/features/shop/order/components/OrderProductCard";
import OrderShell from "@/features/shop/order/components/OrderShell";
import { getMenuItems } from "@/features/shop/menu/services/menu.service";
import type { MenuItem } from "@/types/types";

export default async function Order() {
  const items = await getMenuItems();

  return (
    <OrderShell>
      <main className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
        {items.map((item: MenuItem) => (
          <OrderProductCard key={item.documentId} item={item} />
        ))}
      </main>
    </OrderShell>
  );
}
