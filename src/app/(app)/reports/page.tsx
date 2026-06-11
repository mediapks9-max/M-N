import { CsvButton } from "@/components/csv-button";
import { ServiceBadge } from "@/components/service-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InvoiceDirection, InvoiceStatus } from "@/lib/database.types";
import { FINANCIAL_INVOICE_STATUSES } from "@/lib/domain";
import { formatCurrency } from "@/lib/format";
import { getOrgContext } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { ReportFilters } from "./report-filters";

export const metadata = { title: "Reports" };

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface ReportInvoiceRow {
  issue_date: string;
  direction: InvoiceDirection;
  status: InvoiceStatus;
  total: number;
  currency: string;
  client: { id: string; name: string } | null;
  engagement: {
    id: string;
    name: string;
    service: { name: string; color: string } | null;
  } | null;
}

interface Aggregate {
  revenue: number;
  expenses: number;
}

function profit(aggregate: Aggregate): number {
  return aggregate.revenue - aggregate.expenses;
}

function addTo<T extends Aggregate>(
  map: Map<string, T>,
  key: string,
  init: T,
  invoice: ReportInvoiceRow
): void {
  const entry = map.get(key) ?? init;
  if (invoice.direction === "outbound") {
    entry.revenue += invoice.total;
  } else {
    entry.expenses += invoice.total;
  }
  map.set(key, entry);
}

interface ReportsPageProps {
  searchParams: Promise<{ year?: string; currency?: string }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const { org } = await getOrgContext();
  const supabase = await createClient();

  // All financially-relevant invoices (sent/paid/overdue) for the org.
  const { data: rows } = await supabase
    .from("invoices")
    .select(
      "issue_date, direction, status, total, currency, client:clients(id, name), engagement:engagements(id, name, service:services(name, color))"
    )
    .eq("organization_id", org.id)
    .in("status", FINANCIAL_INVOICE_STATUSES);

  const allInvoices = (rows ?? []) as unknown as ReportInvoiceRow[];

  const currentYear = new Date().getFullYear();
  const years = [
    ...new Set([
      currentYear,
      ...allInvoices.map((invoice: ReportInvoiceRow) =>
        new Date(invoice.issue_date).getFullYear()
      ),
    ]),
  ].sort((a: number, b: number) => b - a);

  const year = Number.parseInt(params.year ?? "", 10) || currentYear;

  const yearInvoices = allInvoices.filter(
    (invoice: ReportInvoiceRow) =>
      new Date(invoice.issue_date).getFullYear() === year
  );

  const currencies = [
    ...new Set(
      yearInvoices.map((invoice: ReportInvoiceRow) => invoice.currency)
    ),
  ].sort();
  const currency =
    params.currency && currencies.includes(params.currency)
      ? params.currency
      : (currencies[0] ?? "USD");

  const invoices = yearInvoices.filter(
    (invoice: ReportInvoiceRow) => invoice.currency === currency
  );

  // Monthly table
  const monthly: Aggregate[] = MONTH_NAMES.map(() => ({
    revenue: 0,
    expenses: 0,
  }));
  for (const invoice of invoices) {
    const month = new Date(invoice.issue_date).getMonth();
    if (invoice.direction === "outbound") {
      monthly[month].revenue += invoice.total;
    } else {
      monthly[month].expenses += invoice.total;
    }
  }
  const yearTotal: Aggregate = monthly.reduce(
    (acc: Aggregate, m: Aggregate) => ({
      revenue: acc.revenue + m.revenue,
      expenses: acc.expenses + m.expenses,
    }),
    { revenue: 0, expenses: 0 }
  );

  // Breakdowns
  const byClient = new Map<string, Aggregate & { name: string }>();
  const byService = new Map<string, Aggregate & { name: string; color: string }>();
  const byEngagement = new Map<
    string,
    Aggregate & { name: string; clientName: string; serviceName: string; serviceColor: string }
  >();

  for (const invoice of invoices) {
    addTo(
      byClient,
      invoice.client?.id ?? "none",
      { revenue: 0, expenses: 0, name: invoice.client?.name ?? "—" },
      invoice
    );
    addTo(
      byService,
      invoice.engagement?.service?.name ?? "unlinked",
      {
        revenue: 0,
        expenses: 0,
        name: invoice.engagement?.service?.name ?? "Not linked to a service",
        color: invoice.engagement?.service?.color ?? "#94a3b8",
      },
      invoice
    );
    addTo(
      byEngagement,
      invoice.engagement?.id ?? "none",
      {
        revenue: 0,
        expenses: 0,
        name: invoice.engagement?.name ?? "Not linked to an engagement",
        clientName: invoice.client?.name ?? "—",
        serviceName: invoice.engagement?.service?.name ?? "",
        serviceColor: invoice.engagement?.service?.color ?? "#94a3b8",
      },
      invoice
    );
  }

  const clientRows = [...byClient.values()].sort(
    (a: Aggregate, b: Aggregate) => profit(b) - profit(a)
  );
  const serviceRows = [...byService.values()].sort(
    (a: Aggregate, b: Aggregate) => profit(b) - profit(a)
  );
  const engagementRows = [...byEngagement.values()].sort(
    (a: Aggregate, b: Aggregate) => profit(b) - profit(a)
  );

  const money = (amount: number): string => formatCurrency(amount, currency);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Based on invoices marked sent, paid or overdue, by issue date
            (drafts and cancelled excluded).
          </p>
        </div>
        <ReportFilters
          years={years}
          currencies={currencies}
          selectedYear={year}
          selectedCurrency={currency}
        />
      </div>

      {invoices.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No invoice data for {year}
          {currencies.length > 0 ? ` in ${currency}` : ""}.
        </p>
      ) : (
        <>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                {year} month by month ({currency})
              </CardTitle>
              <CsvButton
                filename={`monthly-${year}-${currency}.csv`}
                headers={["Month", "Revenue", "Expenses", "Profit"]}
                rows={[
                  ...monthly.map((m: Aggregate, index: number) => [
                    MONTH_NAMES[index],
                    m.revenue,
                    m.expenses,
                    profit(m),
                  ]),
                  ["Total", yearTotal.revenue, yearTotal.expenses, profit(yearTotal)],
                ]}
              />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthly.map((m: Aggregate, index: number) => (
                    <TableRow key={MONTH_NAMES[index]}>
                      <TableCell>{MONTH_NAMES[index]}</TableCell>
                      <TableCell className="text-right">
                        {m.revenue !== 0 ? money(m.revenue) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {m.expenses !== 0 ? money(m.expenses) : "—"}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium",
                          profit(m) < 0 && "text-red-600"
                        )}
                      >
                        {m.revenue !== 0 || m.expenses !== 0
                          ? money(profit(m))
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {money(yearTotal.revenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {money(yearTotal.expenses)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right",
                        profit(yearTotal) < 0 && "text-red-600"
                      )}
                    >
                      {money(profit(yearTotal))}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">By client</CardTitle>
                <CsvButton
                  filename={`by-client-${year}-${currency}.csv`}
                  headers={["Client", "Revenue", "Expenses", "Profit"]}
                  rows={clientRows.map(
                    (row: (typeof clientRows)[number]) => [
                      row.name,
                      row.revenue,
                      row.expenses,
                      profit(row),
                    ]
                  )}
                />
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientRows.map((row: (typeof clientRows)[number]) => (
                      <TableRow key={row.name}>
                        <TableCell className="font-medium">
                          {row.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {money(row.revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {money(row.expenses)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium",
                            profit(row) < 0 && "text-red-600"
                          )}
                        >
                          {money(profit(row))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">By service</CardTitle>
                <CsvButton
                  filename={`by-service-${year}-${currency}.csv`}
                  headers={["Service", "Revenue", "Expenses", "Profit"]}
                  rows={serviceRows.map(
                    (row: (typeof serviceRows)[number]) => [
                      row.name,
                      row.revenue,
                      row.expenses,
                      profit(row),
                    ]
                  )}
                />
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceRows.map((row: (typeof serviceRows)[number]) => (
                      <TableRow key={row.name}>
                        <TableCell>
                          <ServiceBadge name={row.name} color={row.color} />
                        </TableCell>
                        <TableCell className="text-right">
                          {money(row.revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {money(row.expenses)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium",
                            profit(row) < 0 && "text-red-600"
                          )}
                        >
                          {money(profit(row))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">By engagement</CardTitle>
              <CsvButton
                filename={`by-engagement-${year}-${currency}.csv`}
                headers={[
                  "Engagement",
                  "Client",
                  "Service",
                  "Revenue",
                  "Expenses",
                  "Profit",
                ]}
                rows={engagementRows.map(
                  (row: (typeof engagementRows)[number]) => [
                    row.name,
                    row.clientName,
                    row.serviceName,
                    row.revenue,
                    row.expenses,
                    profit(row),
                  ]
                )}
              />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {engagementRows.map(
                    (row: (typeof engagementRows)[number]) => (
                      <TableRow key={`${row.name}-${row.clientName}`}>
                        <TableCell className="font-medium">
                          {row.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.clientName}
                        </TableCell>
                        <TableCell>
                          {row.serviceName ? (
                            <ServiceBadge
                              name={row.serviceName}
                              color={row.serviceColor}
                            />
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {money(row.revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {money(row.expenses)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium",
                            profit(row) < 0 && "text-red-600"
                          )}
                        >
                          {money(profit(row))}
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
