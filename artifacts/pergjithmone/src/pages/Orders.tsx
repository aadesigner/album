import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useListOrders } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { sq as sqLocale } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Package, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Orders() {
  const { lang } = useLanguage();
  const { data: orders, isLoading } = useListOrders();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':   return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'printing':  return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'shipped':   return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default:          return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, { sq: string; en: string }> = {
      pending:   { sq: 'Në pritje',   en: 'Pending' },
      confirmed: { sq: 'Konfirmuar',  en: 'Confirmed' },
      printing:  { sq: 'Në printim',  en: 'Printing' },
      shipped:   { sq: 'Nisur',       en: 'Shipped' },
      delivered: { sq: 'Dorëzuar',    en: 'Delivered' },
      cancelled: { sq: 'Anulluar',    en: 'Cancelled' },
    };
    return map[status]?.[lang] ?? status;
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-serif font-medium mb-10">
          {lang === 'sq' ? 'Porositë e mia' : 'My orders'}
        </h1>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : orders?.length === 0 ? (
          <div className="text-center py-24 bg-secondary rounded-3xl border border-border">
            <Package size={64} className="mx-auto text-muted-foreground mb-6 opacity-50" />
            <h2 className="text-2xl font-serif mb-2">
              {lang === 'sq' ? 'Nuk keni asnjë porosi' : 'No orders yet'}
            </h2>
            <p className="text-muted-foreground mb-8">
              {lang === 'sq'
                ? 'Krijoni një projekt të ri dhe porositni albumin tuaj.'
                : 'Create a new project and order your photobook.'}
            </p>
            <Link href="/krijo">
              <Button size="lg" className="rounded-full">
                {lang === 'sq' ? 'Krijo Projekt' : 'Create Project'}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders?.map(order => (
              <div
                key={order.id}
                className="bg-card border border-border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-secondary rounded-xl flex items-center justify-center text-muted-foreground border border-border">
                    <Package size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-lg">
                        {lang === 'sq' ? 'Porosia' : 'Order'} #{order.id}
                      </h3>
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {lang === 'sq' ? 'Data:' : 'Date:'}{' '}
                      {format(new Date(order.createdAt), 'dd MMM, yyyy HH:mm', { locale: lang === 'sq' ? sqLocale : undefined })}
                    </p>
                    <p className="font-medium text-foreground">{order.priceLek} LEK</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 md:border-l md:border-border md:pl-6">
                  <Link href={`/editor/${order.projectId}`}>
                    <Button variant="outline" size="sm" className="w-full md:w-auto">
                      {lang === 'sq' ? 'Shiko Projektin' : 'View Project'}
                      <ExternalLink size={14} className="ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
