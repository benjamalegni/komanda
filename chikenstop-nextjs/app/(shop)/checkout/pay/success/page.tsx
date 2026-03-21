import Link from "next/link";
import { confirmMercadoPagoPaymentById } from "@/features/shop/payments/server/payment-confirmation.service";

type SuccessPageProps = {
  searchParams: Promise<{
    payment_id?: string | string[];
    status?: string | string[];
    collection_status?: string | string[];
  }>;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CheckoutPaySuccessPage({ searchParams }: SuccessPageProps) {
  const resolvedSearchParams = await searchParams;
  const paymentId = getSingleValue(resolvedSearchParams.payment_id)?.trim() ?? "";
  const paymentStatus = (
    getSingleValue(resolvedSearchParams.status) ??
    getSingleValue(resolvedSearchParams.collection_status) ??
    ""
  )
    .trim()
    .toLowerCase();
  const shouldConfirmPayment = Boolean(paymentId) && paymentStatus === "approved";
  const confirmation = shouldConfirmPayment
    ? await confirmMercadoPagoPaymentById(paymentId)
    : null;
  const isErrorState =
    confirmation?.kind === "error" || confirmation?.kind === "missing_attempt";
  function previewOrderId(orderId: string) {
    const trimmed = orderId.trim();
    return trimmed.length > 8 ? trimmed.slice(-6) : trimmed;
  }

  const name = confirmation?.customerName?.trim() ?? "";
  const greeting = name ? `¡Hola ${name}! ` : "";
  const title =
    isErrorState
      ? "Ocurrió un error"
      : confirmation?.kind === "confirmed" || confirmation?.kind === "already_confirmed"
        ? "Pago exitoso"
        : "Pago recibido";

  const orderPreview =
    confirmation && "orderId" in confirmation
      ? ` #${previewOrderId(confirmation.orderId)}`
      : "";

  const message = isErrorState
    ? confirmation?.kind === "missing_attempt"
      ? `${greeting}No pudimos confirmar tu pedido ahora.`
      : `${greeting}No pudimos confirmar tu pago.`
    : confirmation
      ? confirmation.kind === "confirmed"
        ? `${greeting}Confirmamos tu pedido.`
        : confirmation.kind === "already_confirmed"
          ? `${greeting}Tu pago ya fue confirmado.`
          : confirmation.kind === "status_updated"
            ? `${greeting}Mercado Pago actualizó el estado de tu pago. Seguimos con la confirmación.`
            : `${greeting}Tu pago está siendo procesado. Seguimos con la confirmación.`
      : "Pago recibido. Estamos confirmando tu pedido.";

  const detail = confirmation
    ? isErrorState
      ? confirmation.kind === "missing_attempt" || confirmation.kind === "error"
        ? confirmation.error
        : "Estamos revisando tu pedido."
      : confirmation.kind === "confirmed"
        ? `Pedido${orderPreview}. Tu pedido está en proceso.`
        : confirmation.kind === "already_confirmed"
          ? `Pedido${orderPreview}. Tu pedido está en proceso.`
          : confirmation.kind === "status_updated"
            ? "Seguimos con la confirmación de tu pedido."
            : "Estamos revisando tu pedido. En breve vas a ver el resultado."
    : "Estamos confirmando tu pedido. En breve vas a ver el resultado.";

  const containerClassName = isErrorState
    ? "mx-auto max-w-3xl rounded-sm border border-red-700 bg-white/40 p-6"
    : "mx-auto max-w-3xl rounded-sm border border-[var(--color-accent-secondary)] bg-white/40 p-6";

  return (
    <main className="min-h-screen bg-[var(--color-accent-primary)] p-6 text-[var(--color-accent-secondary)]">
      <div className={containerClassName}>
        <h1 className={isErrorState ? "text-3xl font-bold text-red-700" : "text-3xl font-bold"}>
          {title}
        </h1>
        <p className="mt-3">{message}</p>
        <p className={isErrorState ? "mt-3 text-sm text-red-700" : "mt-3 text-sm opacity-80"}>
          {detail}
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/order"
            className="rounded-sm bg-[var(--color-accent-secondary)] px-4 py-3 font-semibold text-[var(--color-accent-primary)]"
          >
            Volver al menu
          </Link>

          {/* add order status in real time */}

        </div>
      </div>
    </main>
  );
}
