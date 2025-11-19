"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ApiButton } from "@/components/ui/api-button";
import { FormError } from "@/components/ui/form-error";
import { PhoneInput } from "@/components/ui/phone-input";

import { loginSchema, LoginFormData, isPhoneNumber } from "@/lib/validation/login";
import { authAPI } from "@/lib/api/auth";
import { formatPhoneForAPI } from "@/lib/utils/phone";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
    },
  });

  const identifier = form.watch("identifier");
  const isPhone = isPhoneNumber(identifier);

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true);
    setError("");

    try {
      await authAPI.requestOTP(data.identifier);

      toast.success(t("auth.login.otpSent"));

      // Store the identifier for the verify page (format it if it's a phone number)
      const formattedIdentifier = isPhoneNumber(data.identifier)
        ? formatPhoneForAPI(data.identifier)
        : data.identifier;
      sessionStorage.setItem("otp-identifier", formattedIdentifier);

      // Redirect to verify page
      router.push("/verify");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.login.sendFailed");
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">{t("auth.login.title")}</CardTitle>
          <CardDescription className="text-center">
            {t("auth.login.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && <FormError message={error} />}

              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.login.phoneOrEmail")}</FormLabel>
                    <FormControl>
                      {isPhone ? (
                        <PhoneInput
                          {...field}
                          placeholder={t("auth.login.phonePlaceholder")}
                          disabled={isLoading}
                          autoComplete="tel"
                        />
                      ) : (
                        <Input
                          {...field}
                          type="text"
                          placeholder={t("auth.login.emailPlaceholder")}
                          disabled={isLoading}
                          autoComplete="email"
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <ApiButton
                type="submit"
                className="w-full"
                loading={isLoading}
                loadingText={t("auth.login.sendingOtp")}
              >
                {t("auth.login.sendOtp")}
              </ApiButton>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t("auth.login.terms")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}