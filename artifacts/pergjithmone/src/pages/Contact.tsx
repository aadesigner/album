import React from 'react';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { SEOMeta } from '@/components/SEOMeta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, MessageCircle, MapPin } from 'lucide-react';

export default function Contact() {
  const { lang } = useLanguage();

  return (
    <MarketingLayout>
      <SEOMeta
        title={{ sq: 'Na Kontaktoni', en: 'Contact Us' }}
        description={{
          sq: "Keni pyetje rreth librit tuaj foto? Na shkruani dhe ekipi ynë do t'ju ndihmojë me çdo detaj — porosi, dizajn dhe dërgesa.",
          en: 'Have questions about your photo book? Write to us and our team will help you with every detail — orders, design and delivery.',
        }}
        path="/kontakt"
      />
      <div className="bg-background py-24 min-h-screen">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-serif font-medium mb-6">
              {lang === 'sq' ? 'Na Kontaktoni' : 'Contact Us'}
            </h1>
            <p className="text-lg text-muted-foreground">
              {lang === 'sq'
                ? "Jemi këtu për t'ju ndihmuar me çdo pyetje apo kërkesë që keni."
                : 'We are here to help with any question or request you may have.'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-16">
            {/* Contact Info */}
            <div className="space-y-12">
              <div>
                <h3 className="text-2xl font-serif font-medium mb-6">
                  {lang === 'sq' ? 'Na gjeni' : 'Find us'}
                </h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-foreground shrink-0">
                      <MessageCircle size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-lg mb-1">WhatsApp</h4>
                      <p className="text-muted-foreground mb-2">
                        {lang === 'sq' ? 'Përgjigjemi brenda pak orësh' : 'We reply within a few hours'}
                      </p>
                      <a href="https://wa.me/355690000000" className="text-foreground font-medium underline underline-offset-4 hover:text-foreground/80">
                        +355 69 00 00 000
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-foreground shrink-0">
                      <Mail size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-lg mb-1">Email</h4>
                      <p className="text-muted-foreground mb-2">
                        {lang === 'sq' ? 'Për kërkesa zyrtare dhe suport' : 'For official requests and support'}
                      </p>
                      <a href="mailto:hello@pergjithmone.al" className="text-foreground font-medium underline underline-offset-4 hover:text-foreground/80">
                        hello@pergjithmone.al
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-foreground shrink-0">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-lg mb-1">Studio</h4>
                      <p className="text-muted-foreground">
                        Tiranë, Shqipëri<br />Rruga e Kavajës
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="bg-card border border-border p-8 rounded-3xl shadow-sm">
              <h3 className="text-2xl font-serif font-medium mb-6">
                {lang === 'sq' ? 'Dërgoni një mesazh' : 'Send a message'}
              </h3>
              <form className="space-y-6" onSubmit={e => e.preventDefault()}>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {lang === 'sq' ? 'Emri' : 'Name'}
                  </label>
                  <Input
                    placeholder={lang === 'sq' ? 'Emri juaj' : 'Your name'}
                    className="h-12 bg-background rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {lang === 'sq' ? 'Emaili' : 'Email'}
                  </label>
                  <Input type="email" placeholder="email@example.com" className="h-12 bg-background rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {lang === 'sq' ? 'Mesazhi' : 'Message'}
                  </label>
                  <Textarea
                    placeholder={lang === 'sq' ? "Si mund t'ju ndihmojmë?" : 'How can we help you?'}
                    className="min-h-[120px] bg-background rounded-xl resize-none"
                  />
                </div>
                <Button className="w-full h-12 rounded-xl bg-foreground text-background">
                  {lang === 'sq' ? 'Dërgo Mesazhin' : 'Send Message'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
