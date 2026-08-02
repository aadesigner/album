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

export default function Register() {
  const { lang } = useLanguage();
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { execute: executeRecaptcha } = useRecaptcha('register');

  const sq = lang === 'sq';

  const registerSchema = z.object({
    name: z.string().min(2, sq ? 'Emri është shumë i shkurtër' : 'Name is too short'),
    phone: z
      .string()
      .min(8, sq ? 'Numri i telefonit nuk është i vlefshëm' : 'Phone number is too short')
      .regex(/^\+\d{6,15}$/, sq ? 'Numri i telefonit nuk është i vlefshëm' : 'Invalid phone number'),
    password: z.string().min(8, sq ? 'Fjalëkalimi duhet të jetë të paktën 8 karaktere' : 'Password must be at least 8 characters'),
  });

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', phone: '', password: '' },
  });

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    setIsLoading(true);
    try {
      // Recaptcha is best-effort — never block submission if it fails
      let recaptchaToken: string | null = null;
      try { recaptchaToken = await executeRecaptcha(); } catch { /* silent */ }

      await register({
        phone: values.phone,
        name: values.name,
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
        title={{ sq: 'Krijo Llogari', en: 'Create Account' }}
        description={{
          sq: 'Regjistrohuni falas në Përgjithmonë dhe filloni të krijoni librin tuaj foto premium sot.',
          en: 'Sign up for free at Përgjithmonë and start creating your premium photo book today.',
        }}
        path="/regjistrohu"
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
                {sq ? 'Krijo Llogari' : 'Create Account'}
              </h1>
              <p className="text-muted-foreground text-sm">
                {sq
                  ? 'Regjistrohu me numrin tënd të telefonit.'
                  : 'Sign up with your phone number.'}
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{sq ? 'Emri dhe Mbiemri' : 'Full Name'}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={sq ? 'Emri Mbiemri' : 'Full name'}
                          className="h-12 rounded-xl bg-background"
                          autoComplete="name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{sq ? 'Numri i Telefonit' : 'Phone Number'}</FormLabel>
                      <FormControl>
                        <PhoneInput
                          value={field.value}
                          onChange={field.onChange}
                          disabled={isLoading}
                          placeholder={sq ? '6X XXX XXXX' : '6X XXX XXXX'}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          autoComplete="new-password"
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
                    ? (sq ? 'Duke u regjistruar...' : 'Creating account...')
                    : (sq ? 'Regjistrohu' : 'Create Account')}
                </Button>
              </form>
            </Form>

            <div className="mt-8 text-center text-sm text-muted-foreground">
              {sq ? 'Ke llogari?' : 'Already have an account?'}{' '}
              <Link href={`/hyr${window.location.search}`} className="text-foreground font-medium underline underline-offset-4 hover:text-foreground/80">
                {sq ? 'Hyr' : 'Log in'}
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </MarketingLayout>
  );
}
