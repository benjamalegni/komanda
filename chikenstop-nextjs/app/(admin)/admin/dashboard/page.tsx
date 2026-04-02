import Link from "next/link";
import { redirect } from "next/navigation";
import { markOrderDelivered } from "@/features/admin-panel/actions/mark-order-delivered.action";
import { getAuthenticatedAdminSession } from "@/features/admin-panel/server/auth.service";
import { listOrdersInProgress } from "@/features/shop/checkout/server/order.service";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return dateFormatter.format(new Date(value));
}

function sourceLabel(source: string | null) {
  if (source === "admin-direct") {
    return "Creado por admin";
  }

  if (source === "mercadopago-webhook") {
    return "Pago Mercado Pago";
  }

  return "Origen no disponible";
}

export default async function AdminDashboardPage() {
  const adminSession = await getAuthenticatedAdminSession();

  if (!adminSession) {
    redirect("/admin");
  }

  const activeOrders = await listOrdersInProgress();

  return (
    <main className="min-h-[100dvh] bg-[var(--color-accent-primary)] px-6 py-8 text-[var(--color-accent-secondary)]">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 rounded-sm border border-[var(--color-accent-secondary)] bg-[var(--color-accent-primary)] p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.2em]">Panel admin</p>
            <h1 className="text-3xl font-bold">Pedidos en proceso</h1>
            <p className="text-sm opacity-80">
              Sesion iniciada como {adminSession.username}. Usa este panel para seguir los pedidos activos y marcarlos como entregados.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/order"
              className="rounded-sm bg-[var(--color-accent-secondary)] px-4 py-3 font-semibold text-[var(--color-accent-primary)]"
            >
              Crear pedido manual
            </Link>
          </div>
        </header>

        <section className="rounded-sm border border-[var(--color-accent-secondary)] bg-[var(--color-accent-primary)] p-6">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--color-accent-secondary)]/20 pb-4">
            <div>
              <h2 className="text-2xl font-bold">Activos</h2>
              <p className="text-sm opacity-75">
                {activeOrders.length} pedido{activeOrders.length === 1 ? "" : "s"} esperando entrega.
              </p>
            </div>
          </div>

          {activeOrders.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-lg font-semibold">No hay pedidos en proceso.</p>
              <p className="mt-2 text-sm opacity-75">
                Cuando entre un nuevo pedido aprobado va a aparecer aca.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {activeOrders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-sm border border-[var(--color-accent-secondary)]/30 bg-[var(--color-accent-primary)] p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-[var(--color-accent-secondary)] px-3 py-1 text-sm font-bold text-[var(--color-accent-primary)]">
                          Compra #{order.purchaseNumber}
                        </span>
                        <span className="rounded-full border border-[var(--color-accent-secondary)]/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em]">
                          {sourceLabel(order.source)}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl font-bold">{order.customer.name}</h3>
                        <p className="text-sm opacity-75">
                          Aprobado: {formatDate(order.approvedAt)}
                        </p>
                        <p className="text-sm opacity-75">
                          Creado: {formatDate(order.createdAt)}
                        </p>
                      </div>

                      <div className="text-sm opacity-85">
                        <p>Estado: En proceso</p>
                        <p>Pedido interno: {order.id}</p>
                      </div>

                      {order.notes ? (
                        <div className="rounded-sm border border-[var(--color-accent-secondary)]/20 bg-[var(--color-accent-primary)] p-3 text-sm">
                          <p className="font-semibold">Notas</p>
                          <p className="mt-1 opacity-80">{order.notes}</p>
                        </div>
                      ) : null}
                    </div>

                    <form action={markOrderDelivered} className="shrink-0">
                      <input type="hidden" name="orderId" value={order.id} />
                      <button
                        type="submit"
                        className="w-full rounded-sm bg-[var(--color-accent-secondary)] px-4 py-3 text-sm font-semibold text-[var(--color-accent-primary)] lg:w-auto"
                      >
                        Marcar como entregado
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
