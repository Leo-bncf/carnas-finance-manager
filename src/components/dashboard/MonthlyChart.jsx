import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export default function MonthlyChart({ receipts }) {
  const monthlyData = {};
  receipts.forEach((r) => {
    if (!r.date) return;
    const month = r.date.substring(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { ht: 0, tva: 0 };
    }
    monthlyData[month].ht += r.amount_ht || 0;
    monthlyData[month].tva += r.vat_amount || 0;
  });

  const data = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, vals]) => ({
      month: format(parseISO(month + "-01"), "MMM yy", { locale: fr }),
      "Montant HT": Math.round(vals.ht * 100) / 100,
      TVA: Math.round(vals.tva * 100) / 100,
    }));

  if (data.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Évolution mensuelle</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucune donnée disponible
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Évolution mensuelle</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip
                formatter={(value) => `${value.toFixed(2)} €`}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(220, 13%, 87%)",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="Montant HT" fill="hsl(224, 60%, 28%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="TVA" fill="hsl(40, 65%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}