"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { authAPI } from "@/lib/api/auth";
import { toast } from "sonner";

export default function HomePage() {
  const router = useRouter();
  const t = useTranslations();
  const [identifier, setIdentifier] = useState<string>("");

  useEffect(() => {
    // Get identifier from session storage
    const storedIdentifier = sessionStorage.getItem("otp-identifier");
    if (storedIdentifier) {
      setIdentifier(storedIdentifier);
    }

    // Check if user is authenticated
    if (!authAPI.isAuthenticated()) {
      router.push("/login");
    }
  }, [router]);

  async function handleLogout() {
    try {
      await authAPI.logout();
      toast.success(t("auth.logout.success"));
      router.push("/login");
    } catch (error) {
      toast.error(t("auth.logout.failed"));
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">{t("dashboard.title")}</h1>
          <Button variant="outline" onClick={handleLogout}>
            {t("auth.logout.button")}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.welcome")}</CardTitle>
              <CardDescription>
                {identifier
                  ? t("dashboard.loggedInAs", { identifier })
                  : t("dashboard.authenticated")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t("dashboard.description")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("organizations.title")}</CardTitle>
              <CardDescription>{t("organizations.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {t("organizations.helpText")}
              </p>
              <Button className="w-full" variant="outline">
                {t("organizations.viewButton")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("events.title")}</CardTitle>
              <CardDescription>{t("events.upcomingTitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {t("events.description")}
              </p>
              <Button className="w-full" variant="outline">
                {t("events.viewButton")}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-8" />

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("quickActions.title")}</CardTitle>
              <CardDescription>{t("quickActions.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm">
                  {t("organizations.createButton")}
                </Button>
                <Button variant="outline" size="sm">
                  {t("events.createButton")}
                </Button>
                <Button variant="outline" size="sm">
                  {t("members.inviteButton")}
                </Button>
                <Button variant="outline" size="sm">
                  {t("profile.viewButton")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}