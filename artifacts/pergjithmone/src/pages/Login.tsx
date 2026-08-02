import React, { useState } from 'react';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useAuth } from '@/contexts/AuthContext';
import { SEOMeta } from '@/components/SEOMeta';
import { motion } from 'framer-motion';
import { useRecaptcha } from '@/hooks/useRecaptcha';

export default function Login() {
  const { lang } = useLanguage();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  // Regular members sign in by phone; a handful of back-office/admin accounts (created
  // from the admin area) have no phone on file and sign in by email instead.
  const [useEmail, setUseEmail] = useState(false);
  const { execute: executeRecaptcha } = useRecaptcha('login');

  const sq = lang === 'sq';

  const loginSchema = z.object({
    phone: useEmail
      ? z.string().optional()
      : z
          .string()
          .min(8, sq ? 'Numri i telefonit nuk është i vlefshëm' : 'Invalid phone number')
          .regex(/^\+\d{6,15}$/, sq ? 'Numri i telefonit nuk është i vlefshëm' : 'Invalid phone number'),
    email: useEmail
      ? z.string().min(1, sq ? 'Ju lutem shkruani email-in' : 'Please enter your email').email(sq ? 'Email jo i vlefshëm' : 'Invalid email')
      : z.string().optional(),
    password: z.string().min(1, sq ? 'Ju lutem shkruani fjalëkalimin' : 'Please enter your password'),
  });

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', email: '', password: '' },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    try {
      // Recaptcha is best-effort — never block submission if it fails
      let recaptchaToken: string | null = null;
      try { recaptchaToken = await executeRecaptcha(); } catch { /* silent */ }

      await login({
        ...(useEmail ? { email: values.email } : { phone: values.phone }),
        password: values.password,
        ...(recaptchaToken ? { recaptchaToken } : {}),
      } as any);
    } catch {
      // Error handled by AuthContext toast
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <MarketingLayout>
      <SEOMeta
        title={{ sq: 'Hyrje', en: 'Log In' }}
        description={{
          sq: 'Hyni në llogarinë tuaj Përgjithmonë për të vazhduar me dizajnin e librit tuaj foto.',
          en: 'Log in to your Përgjithmonë account to continue designing your photo book.',
        }}
        path="/hyr"
        noIndex
      />
      <div className="flex-1 flex items-center justify-center py-12 px-4 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-card border border-border p-8 rounded-3xl shadow-sm">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-serif font-medium mb-2">
                {sq ? 'Hyrje' : 'Log In'}
              </h1>
              <p className="text-muted-foreground text-sm">
                {useEmail
                  ? (sq ? 'Mirësevini përsëri. Hyni me email-in tuaj.' : 'Welcome back. Sign in with your email.')
                  : (sq ? 'Mirësevini përsëri. Hyni me numrin tuaj të telefonit.' : 'Welcome back. Sign in with your phone number.')}
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {useEmail ? (
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{sq ? 'Email' : 'Email'}</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            className="h-12 rounded-xl bg-background"
                            autoComplete="email"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{sq ? 'Numri i Telefonit' : 'Phone Number'}</FormLabel>
                        <FormControl>
                          <PhoneInput
                            value={field.value || ''}
                            onChange={field.onChange}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{sq ? 'Fjalëkalimi' : 'Password'}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="h-12 rounded-xl bg-background"
                          autoComplete="current-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-foreground text-background text-base font-medium mt-6"
                  disabled={isLoading}
                >
                  {isLoading
                    ? (sq ? 'Duke hyrë...' : 'Signing in...')
                    : (sq ? 'Hyr' : 'Log In')}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setUseEmail((v) => !v)}
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                {useEmail
                  ? (sq ? 'Hyr me numër telefoni në vend të kësaj' : 'Sign in with phone number instead')
                  : (sq ? 'Hyr me email në vend të kësaj' : 'Sign in with email instead')}
              </button>
            </div>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {sq ? 'Nuk ke llogari?' : "Don't have an account?"}{' '}
              <Link href={`/regjistrohu${window.location.search}`} className="text-foreground font-medium underline underline-offset-4 hover:text-foreground/80">
                {sq ? 'Regjistrohu' : 'Sign up'}
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </MarketingLayout>
  );
}
