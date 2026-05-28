import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const statusConfig = {
  en_attente: { label: "En attente", className: "bg-amber-100 text-amber-800 border-amber-200" },
  valide: { label: "Validé", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rejete: { label: "Rejeté", className: "bg-red-100 text-red-800 border-red-200" },
  archive: { label: "Archivé", className: "bg-slate-100 text-slate-700 border-slate-200" },
};

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

export default function RecentReceipts({ receipts }) {
  const recent = receipts.slice(0, 5);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Derniers reçus</CardTitle>
          <Link to="/receipts">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              Voir tout <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucun reçu pour le moment
          </p>
        ) : (
          <div className="space-y-3">
            {recent.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.vendor}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {r.date && format(new Date(r.date), "d MMM yyyy", { locale: fr })}
                    </span>
                    {r.category && (
                      <span className="text-xs text-muted-foreground">
                        • {categoryLabels[r.category] || r.category}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${statusConfig[r.status]?.className || ""}`}
                  >
                    {statusConfig[r.status]?.label || r.status}
                  </Badge>
                  <span className="text-sm font-semibold tabular-nums">
                    {(r.amount_ttc || 0).toFixed(2)} €
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}