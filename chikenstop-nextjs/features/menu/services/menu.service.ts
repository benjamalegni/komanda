import { MenuItem } from "@/types/types";

const STRAPI_URL = process.env.STRAPI_URL;
const STRAPI_FULL_ACCESS_TOKEN = process.env.STRAPI_FULL_ACCESS_TOKEN;

type StrapiMenuItem = {
  id: number;
  name: string;
  price: number | string;
  description: string | null;
  image?: {
    url?: string;
  } | null;
};

type MenuItemsResponse = {
  data: StrapiMenuItem[];
};

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

  const data = (await response.json()) as MenuItemsResponse;

  const items = data.data.map((entry) => ({
    id: entry.id,
    name: entry.name,
    price: Number(entry.price),
    description: entry.description,
    // Strapi can return image metadata; the card only needs the final URL.
    image: entry.image?.url ? `${STRAPI_URL}${entry.image.url}` : "",
  }));

  return items;
}