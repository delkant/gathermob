"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ApiButton } from "@/components/ui/api-button";
import { FormError } from "@/components/ui/form-error";
import { OTPInput } from "@/components/ui/otp-input";
import { Button } from "@/components/ui/button";

import { createOtpSchema, type OTPFormData } from "@/lib/validation/otp";
import { authAPI } from "@/lib/api/auth";
import { formatPhoneForDisplay } from "@/lib/utils/phone";

export default function VerifyPage() {
  const router = useRouter();
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [identifier, setIdentifier] = useState<string>("");

  const form = useForm<OTPFormData>({
    resolver: zodResolver(createOtpSchema(t)),
    defaultValues: {
      code: "",
    },
  });

  useEffect(() => {
    // Get the identifier from session storage
    const storedIdentifier = sessionStorage.getItem("otp-identifier");
    if (storedIdentifier) {
      setIdentifier(storedIdentifier);
    } else {
      // Redirect if no identifier stored
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    // Countdown timer for resend cooldown
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  async function onSubmit(data: OTPFormData) {
    if (!identifier) {
      toast.error(t("auth.verify.sessionExpired"));
      router.push("/login");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await authAPI.verifyOTP(identifier, data.code);

      toast.success(t("auth.verify.verified"));

      // Clear session storage
      sessionStorage.removeItem("otp-identifier");

      // Redirect to home page
      setTimeout(() => {
        router.push("/home");
      }, 500);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.verify.invalidOtp");
      setError(message);
      toast.error(message);

      // Clear the OTP input on error
      form.setValue("code", "");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || !identifier) return;

    setError("");

    try {
      await authAPI.requestOTP(identifier);
      toast.success(t("auth.verify.resendSuccess"));
      setResendCooldown(30); // 30 second cooldown
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.verify.resendFailed");
      toast.error(message);
    }
  }

  const displayIdentifier = formatPhoneForDisplay(identifier);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">{t("auth.verify.title")}</CardTitle>
          <CardDescription className="text-center">
            {displayIdentifier
              ? t("auth.verify.description", { identifier: displayIdentifier })
              : t("auth.verify.descriptionDefault")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && <FormError message={error} />}

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.verify.verificationCode")}</FormLabel>
                    <FormControl>
                      <div className="flex justify-center">
                        <OTPInput
                          {...field}
                          disabled={isLoading}
                          length={6}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <ApiButton
                type="submit"
                className="w-full"
                loading={isLoading}
                loadingText={t("auth.verify.verifying")}
                disabled={form.watch("code").length !== 6}
              >
                {t("auth.verify.verifyOtp")}
              </ApiButton>

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/login")}
                  disabled={isLoading}
                >
                  {t("auth.verify.backToLogin")}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isLoading}
                >
                  {resendCooldown > 0
                    ? t("auth.verify.resendIn", { seconds: resendCooldown })
                    : t("auth.verify.resendCode")}
                </Button>
              </div>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t("auth.verify.helpText")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}