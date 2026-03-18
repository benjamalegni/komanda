"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/features/shop/cart/context/cart.context";
import { getCart } from "@/features/shop/cart/services/cart.service";
import { createOrder } from "@/features/shop/checkout/services/checkout.service";
import type {
  CartSnapshotLine,
  CheckoutFormValues,
  CreateOrderPayload,
  OfficialCart,
  OfficialCartLine,
} from "@/types/types";

const initialFormValues: CheckoutFormValues = {
  customer: {
    name: "",
    email: "",
    phone: "",
  },
  fulfillmentMethod: "pickup",
  branch: "",
  shippingAddress: {
    addressLine1: "",
    addressLine2: "",
    city: "",
    reference: "",
  },
  notes: "",
};

function formatCurrency(value: number, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function buildSnapshotDifferenceMessages(
  snapshot: CartSnapshotLine[],
  officialCart: OfficialCart,
) {
  const messages: string[] = [];
  const snapshotMap = new Map(snapshot.map((line) => [line.documentId, line]));
  const officialMap = new Map(
    officialCart.items.map((line) => [line.documentId, line]),
  );

  snapshot.forEach((line) => {
    const officialLine = officialMap.get(line.documentId);

    if (!officialLine) {
      messages.push(`${line.name} ya no forma parte del carrito oficial.`);
      return;
    }

    if (officialLine.quantity !== line.quantity) {
      messages.push(
        `${line.name} cambio de cantidad: ${line.quantity} -> ${officialLine.quantity}.`,
      );
    }

    if (officialLine.unitPrice !== line.unitPrice) {
      messages.push(
        `${line.name} cambio de precio: ${formatCurrency(line.unitPrice)} -> ${formatCurrency(officialLine.unitPrice)}.`,
      );
    }

    if (!officialLine.available) {
      messages.push(`${line.name} no esta disponible en este momento.`);
    }
  });

  officialCart.items.forEach((line) => {
    if (!snapshotMap.has(line.documentId)) {
      messages.push(`${line.name} fue agregado al carrito oficial.`);
    }
  });

  return messages;
}

function SnapshotSummary({
  snapshot,
}: {
  snapshot: CartSnapshotLine[];
}) {
  const subtotal = snapshot.reduce(
    (total, line) => total + line.unitPrice * line.quantity,
    0,
  );

  return (
    <section className="rounded-sm border border-[var(--color-accent-secondary)] bg-white/40 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Snapshot local</h2>
          <p className="text-sm opacity-80">
            Se muestra al instante mientras se valida el carrito oficial.
          </p>
        </div>
        <span className="text-sm font-semibold">
          {snapshot.length} {snapshot.length === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="space-y-3">
        {snapshot.map((line) => (
          <div
            key={line.documentId}
            className="flex items-center justify-between rounded-sm border border-[var(--color-accent-secondary)]/40 p-3"
          >
            <div>
              <p className="font-semibold">{line.name}</p>
              <p className="text-sm opacity-80">
                {line.quantity} x {formatCurrency(line.unitPrice)}
              </p>
            </div>
            <p className="font-semibold">
              {formatCurrency(line.quantity * line.unitPrice)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[var(--color-accent-secondary)] pt-4 font-semibold">
        <span>Subtotal estimado</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
    </section>
  );
}

function OfficialCartSummary({
  officialCart,
}: {
  officialCart: OfficialCart;
}) {
  return (
    <section className="rounded-sm border border-[var(--color-accent-secondary)] bg-white/40 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Carrito oficial</h2>
          <p className="text-sm opacity-80">
            Totales y disponibilidad confirmados por backend.
          </p>
        </div>
        <span className="text-sm font-semibold">cartId: {officialCart.id}</span>
      </div>

      <div className="space-y-3">
        {officialCart.items.map((line: OfficialCartLine) => (
          <div
            key={line.documentId}
            className="rounded-sm border border-[var(--color-accent-secondary)]/40 p-3"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{line.name}</p>
                <p className="text-sm opacity-80">
                  {line.quantity} x{" "}
                  {formatCurrency(line.unitPrice, officialCart.currency)}
                </p>
              </div>
              <p className="font-semibold">
                {formatCurrency(line.lineTotal, officialCart.currency)}
              </p>
            </div>
            {!line.available ? (
              <p className="mt-2 text-sm text-red-700">
                Este producto no esta disponible.
              </p>
            ) : null}
            {line.note ? (
              <p className="mt-2 text-sm opacity-80">{line.note}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2 border-t border-[var(--color-accent-secondary)] pt-4">
        <div className="flex items-center justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(officialCart.subtotal, officialCart.currency)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Descuentos</span>
          <span>
            {formatCurrency(officialCart.discountTotal, officialCart.currency)}
          </span>
        </div>
        <div className="flex items-center justify-between text-lg font-bold">
          <span>Total final</span>
          <span>{formatCurrency(officialCart.total, officialCart.currency)}</span>
        </div>
      </div>
    </section>
  );
}

export default function CheckoutPayPage() {
  const router = useRouter();
  const {
    applyOfficialCart,
    cartId,
    clearCart,
    isHydrated,
    snapshot,
    syncCart,
  } = useCart();
  const [formValues, setFormValues] = useState(initialFormValues);
  const [officialCart, setOfficialCart] = useState<OfficialCart | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);
  const [isLoadingCart, setIsLoadingCart] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const differenceMessages = useMemo(
    () =>
      officialCart ? buildSnapshotDifferenceMessages(snapshot, officialCart) : [],
    [officialCart, snapshot],
  );

  const loadOfficialCart = useCallback(
    async (nextCartId?: string | null) => {
      const effectiveCartId = nextCartId ?? cartId;

      if (!effectiveCartId) {
        setOfficialCart(null);
        setCartError(
          "Todavia no existe un cartId valido. Sin carrito oficial no se puede confirmar la compra.",
        );
        return null;
      }

      setIsLoadingCart(true);
      setCartError(null);

      try {
        const backendCart = await getCart(effectiveCartId);
        setOfficialCart(backendCart);
        applyOfficialCart(backendCart);
        return backendCart;
      } catch (error) {
        setOfficialCart(null);
        setCartError(
          error instanceof Error
            ? error.message
            : "No se pudo obtener el carrito oficial.",
        );
        return null;
      } finally {
        setIsLoadingCart(false);
      }
    },
    [applyOfficialCart, cartId],
  );

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (snapshot.length === 0) {
      setOfficialCart(null);
      setCartError("Tu carrito esta vacio.");
      return;
    }

    void loadOfficialCart();
  }, [isHydrated, loadOfficialCart, snapshot.length]);

  const handleRetryValidation = useCallback(async () => {
    const syncedCart = await syncCart();

    if (syncedCart) {
      setOfficialCart(syncedCart);
      setCartError(null);
      return;
    }

    await loadOfficialCart();
  }, [loadOfficialCart, syncCart]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    if (!officialCart?.id) {
      setSubmitError(
        "El pedido necesita un carrito oficial validado antes de poder confirmarse.",
      );
      return;
    }

    const payload: CreateOrderPayload = {
      cartId: officialCart.id,
      customer: formValues.customer,
      fulfillmentMethod: formValues.fulfillmentMethod,
      branch: formValues.branch,
      notes: formValues.notes || undefined,
      shippingAddress:
        formValues.fulfillmentMethod === "delivery"
          ? {
              addressLine1: formValues.shippingAddress.addressLine1,
              addressLine2: formValues.shippingAddress.addressLine2 || undefined,
              city: formValues.shippingAddress.city,
              reference: formValues.shippingAddress.reference || undefined,
            }
          : undefined,
    };

    setIsSubmitting(true);

    try {
      const order = await createOrder(payload);
      setCreatedOrderId(order.id);
      clearCart();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "No se pudo crear la orden en backend.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-[var(--color-accent-primary)] p-6 text-[var(--color-accent-secondary)]">
        <div className="mx-auto max-w-3xl rounded-sm border border-[var(--color-accent-secondary)] bg-white/40 p-6">
          <p>Cargando checkout...</p>
        </div>
      </main>
    );
  }

  if (snapshot.length === 0 && !createdOrderId) {
    return (
      <main className="min-h-screen bg-[var(--color-accent-primary)] p-6 text-[var(--color-accent-secondary)]">
        <div className="mx-auto max-w-3xl rounded-sm border border-[var(--color-accent-secondary)] bg-white/40 p-6">
          <h1 className="text-3xl font-bold">Checkout</h1>
          <p className="mt-3">Tu carrito esta vacio.</p>
          <button
            type="button"
            onClick={() => router.push("/order")}
            className="mt-6 rounded-sm bg-[var(--color-accent-secondary)] px-4 py-3 font-semibold text-[var(--color-accent-primary)]"
          >
            Volver al menu
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-accent-primary)] p-6 text-[var(--color-accent-secondary)]">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 rounded-sm border border-[var(--color-accent-secondary)] bg-white/40 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em]">Checkout seguro</p>
            <h1 className="text-3xl font-bold">Revision final del pedido</h1>
            <p className="mt-2 text-sm opacity-80">
              El carrito oficial del backend define el total final antes de crear
              la orden.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/order")}
            className="rounded-sm border border-[var(--color-accent-secondary)] px-4 py-3 font-semibold"
          >
            Seguir comprando
          </button>
        </div>

        {createdOrderId ? (
          <section className="rounded-sm border border-[var(--color-accent-secondary)] bg-white/40 p-6">
            <h2 className="text-2xl font-bold">Orden creada</h2>
            <p className="mt-3">
              Tu pedido fue enviado correctamente con el id{" "}
              <strong>{createdOrderId}</strong>.
            </p>
          </section>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <SnapshotSummary snapshot={snapshot} />

          <section className="space-y-4">
            {isLoadingCart ? (
              <div className="rounded-sm border border-[var(--color-accent-secondary)] bg-white/40 p-4">
                Validando carrito oficial...
              </div>
            ) : null}

            {officialCart ? (
              <OfficialCartSummary officialCart={officialCart} />
            ) : (
              <div className="rounded-sm border border-red-700 bg-white/40 p-4 text-red-700">
                <p className="font-semibold">No hay carrito oficial listo.</p>
                <p className="mt-2 text-sm">
                  {cartError ??
                    "Sin validacion del backend no se puede confirmar la compra."}
                </p>
                <button
                  type="button"
                  onClick={handleRetryValidation}
                  className="mt-4 rounded-sm border border-current px-4 py-2 font-semibold"
                >
                  Reintentar validacion
                </button>
              </div>
            )}

            {differenceMessages.length > 0 ? (
              <div className="rounded-sm border border-amber-700 bg-white/40 p-4 text-amber-800">
                <p className="font-semibold">
                  El carrito oficial no coincide con el snapshot local. NO ALTERES EL ESTADO LOCAL TE ESTOY VIGILANDO
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {differenceMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-sm border border-[var(--color-accent-secondary)] bg-white/40 p-6"
        >
          <div>
            <h2 className="text-2xl font-bold">Datos del cliente</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Nombre</span>
              <input
                required
                value={formValues.customer.name}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    customer: {
                      ...current.customer,
                      name: event.target.value,
                    },
                  }))
                }
                className="w-full rounded-sm border border-[var(--color-accent-secondary)] bg-transparent px-3 py-2"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold">Email</span>
              <input
                required
                type="email"
                value={formValues.customer.email}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    customer: {
                      ...current.customer,
                      email: event.target.value,
                    },
                  }))
                }
                className="w-full rounded-sm border border-[var(--color-accent-secondary)] bg-transparent px-3 py-2"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold">Telefono</span>
              <input
                required
                value={formValues.customer.phone}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    customer: {
                      ...current.customer,
                      phone: event.target.value,
                    },
                  }))
                }
                className="w-full rounded-sm border border-[var(--color-accent-secondary)] bg-transparent px-3 py-2"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Metodo de envio</span>
              <select
                value={formValues.fulfillmentMethod}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    fulfillmentMethod: event.target.value as
                      | "delivery"
                      | "pickup",
                  }))
                }
                className="w-full rounded-sm border border-[var(--color-accent-secondary)] bg-transparent px-3 py-2"
              >
                <option value="pickup">Retiro en sucursal</option>
                <option value="delivery">Envio a domicilio</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold">Sucursal</span>
              <input
                required
                value={formValues.branch}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    branch: event.target.value,
                  }))
                }
                className="w-full rounded-sm border border-[var(--color-accent-secondary)] bg-transparent px-3 py-2"
                placeholder="Ej: Centro"
              />
            </label>
          </div>

          {formValues.fulfillmentMethod === "delivery" ? (
            <div className="space-y-4">
              <h3 className="text-xl font-bold">Direccion de envio</h3>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Direccion</span>
                  <input
                    required
                    value={formValues.shippingAddress.addressLine1}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        shippingAddress: {
                          ...current.shippingAddress,
                          addressLine1: event.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-sm border border-[var(--color-accent-secondary)] bg-transparent px-3 py-2"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold">
                    Departamento / Piso
                  </span>
                  <input
                    value={formValues.shippingAddress.addressLine2}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        shippingAddress: {
                          ...current.shippingAddress,
                          addressLine2: event.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-sm border border-[var(--color-accent-secondary)] bg-transparent px-3 py-2"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold">Ciudad</span>
                  <input
                    required
                    value={formValues.shippingAddress.city}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        shippingAddress: {
                          ...current.shippingAddress,
                          city: event.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-sm border border-[var(--color-accent-secondary)] bg-transparent px-3 py-2"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold">Referencia</span>
                  <input
                    value={formValues.shippingAddress.reference}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        shippingAddress: {
                          ...current.shippingAddress,
                          reference: event.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-sm border border-[var(--color-accent-secondary)] bg-transparent px-3 py-2"
                  />
                </label>
              </div>
            </div>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-semibold">Notas del pedido</span>
            <textarea
              rows={4}
              value={formValues.notes}
              onChange={(event) =>
                setFormValues((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              className="w-full rounded-sm border border-[var(--color-accent-secondary)] bg-transparent px-3 py-2"
              placeholder="Ej: sin cebolla, tocar timbre, etc."
            />
          </label>

          {submitError ? (
            <p className="text-sm text-red-700">{submitError}</p>
          ) : null}

          <button
            type="submit"
            disabled={!officialCart || isSubmitting}
            className="rounded-sm bg-[var(--color-accent-secondary)] px-5 py-3 font-semibold text-[var(--color-accent-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Confirmando pedido..." : "Confirmar compra"}
          </button>
        </form>
      </div>
    </main>
  );
}
