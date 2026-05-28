import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Save, Loader2, User } from "lucide-react";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyInfo, setCompanyInfo] = useState({
    company_name: "Carnas France",
    siret: "",
    address: "",
    vat_number: "",
  });

  useEffect(() => {
    const load = async () => {
      const me = await base44.auth.me();
      setUser(me);
      if (me?.company_name) setCompanyInfo({
        company_name: me.company_name || "Carnas France",
        siret: me.siret || "",
        address: me.address || "",
        vat_number: me.vat_number || "",
      });
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe(companyInfo);
    toast({ title: "Paramètres enregistrés" });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">
          Gérez vos informations et préférences
        </p>
      </div>

      {/* User Info */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" /> Profil utilisateur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nom</Label>
              <p className="text-sm font-medium">{user?.full_name || "—"}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="text-sm font-medium">{user?.email || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Info */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Informations société</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nom de la société</Label>
            <Input
              value={companyInfo.company_name}
              onChange={(e) =>
                setCompanyInfo({ ...companyInfo, company_name: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>N° SIRET</Label>
            <Input
              value={companyInfo.siret}
              onChange={(e) =>
                setCompanyInfo({ ...companyInfo, siret: e.target.value })
              }
              placeholder="XXX XXX XXX XXXXX"
            />
          </div>
          <div className="space-y-2">
            <Label>N° TVA intracommunautaire</Label>
            <Input
              value={companyInfo.vat_number}
              onChange={(e) =>
                setCompanyInfo({ ...companyInfo, vat_number: e.target.value })
              }
              placeholder="FR XX XXXXXXXXX"
            />
          </div>
          <div className="space-y-2">
            <Label>Adresse</Label>
            <Input
              value={companyInfo.address}
              onChange={(e) =>
                setCompanyInfo({ ...companyInfo, address: e.target.value })
              }
              placeholder="Adresse complète"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enregistrer
        </Button>
      </div>
    </motion.div>
  );
}