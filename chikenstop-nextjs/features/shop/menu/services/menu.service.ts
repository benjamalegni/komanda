import type { MenuItem } from "@/types/types";

const STRAPI_URL = process.env.STRAPI_URL;
const STRAPI_FULL_ACCESS_TOKEN = process.env.STRAPI_FULL_ACCESS_TOKEN;
const STRAPI_HEADERS = {
  Authorization: `Bearer ${STRAPI_FULL_ACCESS_TOKEN}`,
};

// could be on .env but I'm not planning on chaging routes anytime soon
const itemsRoute = "/api/menu-items?populate=image";
const singleItemRoute = "/api/menu-items/${documentId}?populate=image";


type StrapiMenuItem = {
  documentId: string;
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

type MenuItemResponse = {
  data: StrapiMenuItem;
};

function mapStrapiMenuItem(entry: StrapiMenuItem): MenuItem {
  return {
    documentId: entry.documentId,
    name: entry.name,
    price: Number(entry.price),
    description: entry.description,
    image: entry.image?.url ? `${STRAPI_URL}${entry.image.url}` : "",
  };
}

async function fetchStrapiMenu<T>(
  path: string,
  errorMessage: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${STRAPI_URL}${path}`, {
    ...options,
    headers: {
      ...STRAPI_HEADERS,
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

export async function getMenuItems(): Promise<MenuItem[]> {
  const data = await fetchStrapiMenu<MenuItemsResponse>(
    itemsRoute,
    "Failed to fetch menu items",
    { next: { revalidate: 60 } },
  );
  return data.data.map(mapStrapiMenuItem);
}

// Resolve a single menu item using Strapi's v5 document identifier.
export async function getMenuItem(documentId: string): Promise<MenuItem> {
  const data = await fetchStrapiMenu<MenuItemResponse>(
    singleItemRoute.replace("${documentId}", documentId),
    `Failed to fetch menu item with documentId ${documentId}`,
    { cache: "no-store" },
  );

  return mapStrapiMenuItem(data.data);
}