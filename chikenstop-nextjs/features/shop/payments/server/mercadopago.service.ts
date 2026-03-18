// prohibited to be used in the client side
import "server-only"
import type { OfficialCart, CustomerInfo } from "@/types/types"
import { MercadoPagoConfig } from "mercadopago"

const accessToken = process.env.MP_ACCESS_TOKEN;

if (!accessToken) {
    throw new Error("Missing MP_ACCESS_TOKEN environment variable.");
}

const mercadopago = new MercadoPagoConfig({ accessToken });

type CreatePreferenceInput = {
    cart: OfficialCart;
    customer: CustomerInfo;
}

export async function createMercadoPagoPreference(input: CreatePreferenceInput) {

}