import { MenuItem } from "@/types/types";

const STRAPI_URL = process.env.STRAPI_URL;
const STRAPI_FULL_ACCESS_TOKEN = process.env.STRAPI_FULL_ACCESS_TOKEN;

export async function getMenuItems(): Promise<MenuItem[]> {
  const response = await fetch(`${STRAPI_URL}/api/menu-items?populate=image`, {
    headers: {
      Authorization: `Bearer ${STRAPI_FULL_ACCESS_TOKEN}`,
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch menu items");
  }

  const data = await response.json();

  const items = data.data.map((item: any) => ({
    name: item.name,
    price: Number(item.price),
    description: item.description,
    // image is an object with url, alternativeText, name, etc. We only need the url in this case to display the item image.
    image: `${STRAPI_URL}${item.image.url}`
  }));

  console.log(items);
  return items;
}