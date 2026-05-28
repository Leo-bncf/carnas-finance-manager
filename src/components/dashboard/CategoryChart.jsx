import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = [
  "hsl(224, 60%, 28%)",
  "hsl(40, 65%, 50%)",
  "hsl(160, 50%, 40%)",
  "hsl(280, 45%, 55%)",
  "hsl(10, 70%, 55%)",
  "hsl(200, 50%, 45%)",
  "hsl(330, 55%, 50%)",
  "hsl(90, 50%, 40%)",
];

const categoryLabels = {
  fournitures: "Fournitures",
  transport: "Transport",
  services: "Services",
  restauration: "Restauration",
  logement: "Logement",
  telecommunication: "Télécom",
  assurance: "Assurance",
  marketing: "Marketing",
  entretien: "Entretien",
  energie: "Énergie",
  autres: "Autres",
};

export default function CategoryChart({ receipts }) {
  const categoryData = {};
  receipts.forEach((r) => {
    const cat = r.category || "autres";
    categoryData[cat] = (categoryData[cat] || 0) + (r.amount_ttc || 0);
  });

  const data = Object.entries(categoryData)
    .map(([name, value]) => ({
      name: categoryLabels[name] || name,
      value: Math.round(value * 100) / 100,
    }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Par catégorie</CardTitle>
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
        <CardTitle className="text-lg font-semibold">Par catégorie</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="w-40 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `${value.toFixed(2)} €`}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(220, 13%, 87%)",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-1.5">
            {data.slice(0, 5).map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-medium tabular-nums">{item.value.toFixed(2)} €</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}