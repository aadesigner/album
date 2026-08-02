import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { SEOMeta } from '@/components/SEOMeta';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, User as UserIcon } from 'lucide-react';

export default function Profile() {
  const { lang } = useLanguage();
  const { user, changePassword } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sq = lang === 'sq';

  const passwordSchema = z
    .object({
      currentPassword: z.string().min(1, sq ? 'Ju lutem shkruani fjalëkalimin aktual' : 'Please enter your current password'),
      newPassword: z.string().min(8, sq ? 'Fjalëkalimi i ri duhet të jetë të paktën 8 karaktere' : 'New password must be at least 8 characters'),
      confirmPassword: z.string().min(1, sq ? 'Ju lutem konfirmoni fjalëkalimin e ri' : 'Please confirm your new password'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: sq ? 'Fjalëkalimet nuk përputhen' : 'Passwords do not match',
      path: ['confirmPassword'],
    });

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values: z.infer<typeof passwordSchema>) {
    setIsSubmitting(true);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      toast({
        title: sq ? 'Fjalëkalimi u ndryshua' : 'Password changed',
        description: sq ? 'Fjalëkalimi juaj u përditësua me sukses.' : 'Your password was updated successfully.',
      });
      form.reset();
    } catch (error: any) {
      toast({
        title: sq ? 'Ndryshimi dështoi' : 'Change failed',
        description: error?.data?.error || (sq ? 'Ndodhi një gabim. Kontrolloni fjalëkalimin aktual.' : 'Something went wrong. Check your current password.'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppLayout>
      <SEOMeta
        title={{ sq: 'Profili Im', en: 'My Profile' }}
        description={{
          sq: 'Menaxhoni të dhënat e llogarisë tuaj Përgjithmonë.',
          en: 'Manage your Përgjithmonë account settings.',
        }}
        path="/profili"
        noIndex
      />
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-serif font-medium mb-10">
          {sq ? 'Profili Im' : 'My Profile'}
        </h1>

        {/* Account info (read-only) */}
        <div className="bg-secondary/50 border border-border rounded-3xl p-6 md:p-8 mb-8">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-9 h-9 rounded-xl bg-background flex items-center justify-center shrink-0 border border-border">
              <UserIcon size={16} className="text-muted-foreground" />
            </div>
            <h2 className="text-lg font-serif font-medium">
              {sq ? 'Të dhënat e llogarisë' : 'Account details'}
            </h2>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                {sq ? 'Emri' : 'Name'}
              </dt>
              <dd className="font-medium">{user?.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                {sq ? 'Numri i Telefonit' : 'Phone Number'}
              </dt>
              <dd className="font-medium">{(user as any)?.phone || '—'}</dd>
            </div>
          </dl>
        </div>

        {/* Change password */}
        <div className="bg-card border border-border rounded-3xl p-6 md:p-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <KeyRound size={16} className="text-foreground" />
            </div>
            <h2 className="text-lg font-serif font-medium">
              {sq ? 'Ndrysho Fjalëkalimin' : 'Change Password'}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6 mt-1">
            {sq
              ? 'Për arsye sigurie, ju duhet të shkruani fjalëkalimin tuaj aktual.'
              : 'For security, please enter your current password.'}
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{sq ? 'Fjalëkalimi Aktual' : 'Current Password'}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="h-12 rounded-xl bg-background"
                        autoComplete="current-password"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{sq ? 'Fjalëkalimi i Ri' : 'New Password'}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="h-12 rounded-xl bg-background"
                        autoComplete="new-password"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{sq ? 'Konfirmo Fjalëkalimin e Ri' : 'Confirm New Password'}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="h-12 rounded-xl bg-background"
                        autoComplete="new-password"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-foreground text-background text-base font-medium mt-2"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? (sq ? 'Duke ndryshuar...' : 'Changing...')
                  : (sq ? 'Ndrysho Fjalëkalimin' : 'Change Password')}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </AppLayout>
  );
}
