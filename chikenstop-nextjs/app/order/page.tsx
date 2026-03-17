import ProductCard from "@/features/menu/components/ProductCard";
import { getMenuItems } from "@/features/menu/services/menu.service";
import { MenuItem } from "@/types/types";


export default async function Order(){
    const items = await getMenuItems();
    return(
        <main className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            {items.map((item: MenuItem) => (<ProductCard key={item.name} item={item} />))}
        </main>
    )
}