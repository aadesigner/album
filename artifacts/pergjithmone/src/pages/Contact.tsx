import React from 'react';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { SEOMeta } from '@/components/SEOMeta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, MessageCircle, MapPin } from 'lucide-react';
import { PageContentProvider, usePageFields } from '@/components/marketing/PageContent';
import { Editable, EditableSection } from '@/components/marketing/Editable';

export default function Contact() {
  return (
    <PageContentProvider slug="contact">
      <ContactView />
    </PageContentProvider>
  );
}

function ContactView() {
  const p = usePageFields();
  const email = p.txt('email.address');
  const whatsapp = p.txt('whatsapp.number');
  const waDigits = whatsapp.replace(/[^\d]/g, '');

  return (
    <MarketingLayout>
      <SEOMeta
        title={p.txtAll('seo.title')}
        description={p.txtAll('seo.description')}
        path="/kontakt"
      />
      <div className="bg-background py-24 min-h-screen">
        <div className="container mx-auto px-4 max-w-5xl">
          <EditableSection path="hero" className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-serif font-medium mb-6">
              <Editable path="hero.title">{p.txt('hero.title')}</Editable>
            </h1>
            <p className="text-lg text-muted-foreground">
              <Editable path="hero.body">{p.txt('hero.body')}</Editable>
            </p>
          </EditableSection>

          <div className="grid md:grid-cols-2 gap-16">
            <div className="space-y-12">
              <div>
                <h3 className="text-2xl font-serif font-medium mb-6">
                  <Editable path="find">{p.txt('find')}</Editable>
                </h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-foreground shrink-0">
                      <MessageCircle size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-lg mb-1">WhatsApp</h4>
                      <p className="text-muted-foreground mb-2">
                        <Editable path="whatsapp.note">{p.txt('whatsapp.note')}</Editable>
                      </p>
                      <a href={`https://wa.me/${waDigits}`} className="text-foreground font-medium underline underline-offset-4 hover:text-foreground/80">
                        <Editable path="whatsapp.number">{whatsapp}</Editable>
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
                        <Editable path="email.note">{p.txt('email.note')}</Editable>
                      </p>
                      <a href={`mailto:${email}`} className="text-foreground font-medium underline underline-offset-4 hover:text-foreground/80">
                        <Editable path="email.address">{email}</Editable>
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-foreground shrink-0">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-lg mb-1">Studio</h4>
                      <p className="text-muted-foreground whitespace-pre-line">
                        <Editable path="studio.address">{p.txt('studio.address')}</Editable>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <EditableSection path="form" className="bg-card border border-border p-8 rounded-3xl shadow-sm">
              <h3 className="text-2xl font-serif font-medium mb-6">
                <Editable path="form.title">{p.txt('form.title')}</Editable>
              </h3>
              <form className="space-y-6" onSubmit={e => e.preventDefault()}>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    <Editable path="form.name">{p.txt('form.name')}</Editable>
                  </label>
                  <Input
                    placeholder={p.txt('form.namePh')}
                    className="h-12 bg-background rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    <Editable path="form.email">{p.txt('form.email')}</Editable>
                  </label>
                  <Input type="email" placeholder="email@example.com" className="h-12 bg-background rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    <Editable path="form.message">{p.txt('form.message')}</Editable>
                  </label>
                  <Textarea
                    placeholder={p.txt('form.messagePh')}
                    className="min-h-[120px] bg-background rounded-xl resize-none"
                  />
                </div>
                <Button className="w-full h-12 rounded-xl bg-foreground text-background">
                  <Editable path="form.send">{p.txt('form.send')}</Editable>
                </Button>
              </form>
            </EditableSection>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
