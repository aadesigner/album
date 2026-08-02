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
import { useForgotPassword } from '@workspace/api-client-react-tsconfig';
import { SEOMeta } from '@/components/SEOMeta';
import { motion } from 'framer-motion';

export default function ForgotPassword() {
  const { lang, t } = useLanguage();
  const forgotPasswordMutation = useForgotPassword();
  const [success, setSuccess] = useState(false);

  const forgotPasswordSchema = z.object({
    email: z.string().email(lang === 'sq' ? 'Emaili nuk është i vlefshëm' : 'Invalid email address'),
  });

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    try {
      await forgotPasswordMutation.mutateAsync({ data: values });
      setSuccess(true);
    } catch (e) {
      // Error handled globally
    }
  }

  return (
    <MarketingLayout>
      <SEOMeta
        title={{ sq: 'Fjalëkalim i Harruar', en: 'Forgot Password' }}
        description={{
          sq: 'Rivendosni fjalëkalimin tuaj të llogarisë Përgjithmonë.',
          en: 'Reset your Përgjithmonë account password.',
        }}
        path="/fjalekale-harruar"
        noIndex
      />
      <div className="flex-1 flex items-center justify-center py-12 px-4 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-card border border-border p-8 rounded-3xl shadow-sm">
            {success ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h1 className="text-2xl font-serif font-medium mb-4">
                  {lang === 'sq' ? 'Kontrolloni Emailin' : 'Check Your Email'}
                </h1>
                <p className="text-muted-foreground mb-8">
                  {lang === 'sq'
                    ? 'Ne ju kemi dërguar një link për të rivendosur fjalëkalimin tuaj.'
                    : 'We have sent you a link to reset your password.'}
                </p>
                <Link href="/hyr">
                  <Button className="w-full h-12 rounded-xl bg-foreground text-background">
                    {lang === 'sq' ? 'Kthehu te Hyrja' : 'Back to Login'}
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-serif font-medium mb-2">{t('auth.forgotPassword')}</h1>
                  <p className="text-muted-foreground text-sm">
                    {lang === 'sq'
                      ? "Shkruani emailin tuaj dhe ne do t'ju dërgojmë një link për të krijuar një fjalëkalim të ri."
                      : 'Enter your email and we will send you a link to create a new password.'}
                  </p>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('auth.email')}</FormLabel>
                          <FormControl>
                            <Input placeholder="email@example.com" className="h-12 rounded-xl bg-background" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl bg-foreground text-background text-base font-medium mt-6"
                      disabled={forgotPasswordMutation.isPending}
                    >
                      {forgotPasswordMutation.isPending
                        ? (lang === 'sq' ? 'Duke dërguar...' : 'Sending...')
                        : (lang === 'sq' ? 'Dërgo Linkun' : 'Send Link')}
                    </Button>
                  </form>
                </Form>

                <div className="mt-8 text-center text-sm">
                  <Link href="/hyr" className="text-foreground font-medium underline underline-offset-4 hover:text-foreground/80">
                    {lang === 'sq' ? 'Kthehu te Hyrja' : 'Back to Login'}
                  </Link>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </MarketingLayout>
  );
}
