import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Receipt, Euro, Percent, FileCheck } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import RecentReceipts from "@/components/dashboard/RecentReceipts";
import CategoryChart from "@/components/dashboard/CategoryChart";
import MonthlyChart from "@/components/dashboard/MonthlyChart";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ["receipts"],
    queryFn: () => base44.entities.Receipt.list("-created_date", 100),
  });

  const totalTTC = receipts.reduce((s, r) => s + (r.amount_ttc || 0), 0);
  const totalVAT = receipts.reduce((s, r) => s + (r.vat_amount || 0), 0);
  const validated = receipts.filter((r) => r.status === "valide").length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Tableau de bord
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vue d'ensemble de vos reçus et TVA — Carnas France
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total reçus"
          value={receipts.length}
          subtitle="Tous statuts confondus"
          icon={Receipt}
          index={0}
        />
        <StatsCard
          title="Montant total TTC"
          value={`${totalTTC.toFixed(2)} €`}
          subtitle="Toutes catégories"
          icon={Euro}
          index={1}
        />
        <StatsCard
          title="TVA totale"
          value={`${totalVAT.toFixed(2)} €`}
          subtitle="Récupérable"
          icon={Percent}
          index={2}
        />
        <StatsCard
          title="Reçus validés"
          value={validated}
          subtitle={`sur ${receipts.length} reçus`}
          icon={FileCheck}
          index={3}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyChart receipts={receipts} />
        <CategoryChart receipts={receipts} />
      </div>

      {/* Recent */}
      <RecentReceipts receipts={receipts} />
    </div>
  );
}