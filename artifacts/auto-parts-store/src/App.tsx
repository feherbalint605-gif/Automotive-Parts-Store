import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  useListProducts, getListProductsQueryKey, useCreateOrder, useCreateMessage, useGetSiteContent,
  getGetSiteContentQueryKey, useAdminLogin, useAdminLogout, useGetAdminSession,
  getGetAdminSessionQueryKey, useGetAdminDashboard, getGetAdminDashboardQueryKey,
  useListAdminOrders, getListAdminOrdersQueryKey, useUpdateAdminOrder,
  useListAdminMessages, getListAdminMessagesQueryKey, useUpdateSiteContent,
  useListAdminProducts, getListAdminProductsQueryKey, useCreateAdminProduct,
  useUpdateAdminProduct, useDeleteAdminProduct
} from '@workspace/api-client-react';
import type { Message, Order, Product, ProductCategory, ProductInput } from '@workspace/api-client-react';
import {
  ArrowRight, ArrowUpRight, BadgeCheck, Box, Check, CircleAlert, ClipboardList, FileUp, Instagram, LockKeyhole, Mail,
  Menu, Minus, Package, Plus, Search, Send, ShieldCheck, ShoppingBag, Trash2, Truck, X
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AdminSiteContentBuilder } from '@/components/admin-site-content-builder';
import { HomepageSections } from '@/components/homepage-content';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const categories: { id: ProductCategory | 'all'; label: string; code: string }[] = [
  { id: 'all', label: 'All parts', code: '01' },
  { id: 'magnetic_license_plates', label: 'Magnetic plate frames', code: '02' },
  { id: 'carbon_fiber_parts', label: 'Carbon fiber', code: '03' },
  { id: 'custom_3d_printing', label: 'Custom 3D prints', code: '04' },
];
const money = (n: number) => new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(n);
const labelCategory = (s: string) => s.replaceAll('_', ' ');
const errMessage = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';
const heroAsset = '/workshop-hero.png';

function Header({ count, onCart }: { count: number; onCart: () => void }) {
  const [, setLocation] = useLocation();
  const [clicks, setClicks] = useState<number[]>([]);
  const [mobile, setMobile] = useState(false);
  const logoTap = () => {
    const now = Date.now();
    const recent = [...clicks.filter(t => now - t < 10000), now];
    setClicks(recent);
    if (recent.length >= 8) { setClicks([]); setLocation('/admin-login'); }
  };
  return <header className="sticky top-0 z-30 border-b border-white/10 bg-[#141619]/95 backdrop-blur-xl">
    <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 lg:px-10">
      <button onClick={logoTap} data-testid="button-brand-home" className="group flex items-center gap-3 text-left">
        <span className="grid h-9 w-9 place-items-center border border-[#ed6228] text-[#ed6228]"><span className="font-display text-xl font-bold italic">R</span></span>
        <span className="leading-none"><span className="font-display text-[22px] font-bold tracking-[.11em] text-[#eee9df]">REDLINE<span className="text-[#ee6228]">/</span>WORKS</span><span className="mt-1 block font-mono text-[8px] tracking-[.21em] text-[#868781]">ENTHUSIAST BUILT · GARAGE TESTED</span></span>
      </button>
      <nav className={`${mobile ? 'absolute left-0 right-0 top-[72px] flex flex-col border-b border-white/10 bg-[#141619] p-5' : 'hidden'} items-center gap-8 text-[11px] font-semibold uppercase tracking-[.14em] text-[#b1b1aa] md:flex`}>
        <a className="transition hover:text-[#f16b31]" href="#shop" onClick={() => setMobile(false)}>Shop</a>
        <a className="transition hover:text-[#f16b31]" href="#block-story-workshop" onClick={() => setMobile(false)}>Our shop</a>
        <a className="transition hover:text-[#f16b31]" href="#block-custom-print-request" onClick={() => setMobile(false)}>Custom work</a>
        <a className="transition hover:text-[#f16b31]" href="#block-contact-workshop" onClick={() => setMobile(false)}>Contact</a>
      </nav>
      <div className="flex items-center gap-3">
        <button onClick={onCart} data-testid="button-open-cart" className="relative flex h-10 items-center gap-2 border border-white/10 px-3 text-xs font-bold uppercase tracking-wider transition hover:border-[#ed6228] hover:text-[#ed6228]">
          <ShoppingBag size={16}/><span className="hidden sm:inline">Cart</span><span className="grid h-5 min-w-5 place-items-center bg-[#e85e27] px-1 text-[10px] text-[#18191b]">{count}</span>
        </button>
        <button onClick={() => setMobile(!mobile)} aria-label="Toggle navigation" className="grid h-10 w-10 place-items-center border border-white/10 md:hidden"><Menu size={18}/></button>
      </div>
    </div>
  </header>;
}

function Shop() {
  const { data: products, isLoading, isError, error, refetch } = useListProducts();
  const { data: content } = useGetSiteContent();
  const createOrder = useCreateOrder();
  const createMessage = useCreateMessage();
  const [filter, setFilter] = useState<ProductCategory | 'all'>('all');
  const [cart, setCart] = useState<Record<number, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState('');
  const [fileName, setFileName] = useState('');
  const visibleProducts = useMemo(() => (products ?? []).filter(p => (filter === 'all' || p.category === filter) && `${p.title} ${p.description}`.toLowerCase().includes(search.toLowerCase())), [products, filter, search]);
  const cartItems = (products ?? []).filter(p => cart[p.id]);
  const quantity = Object.values(cart).reduce((a, b) => a + b, 0);
  const subtotal = cartItems.reduce((sum, p) => sum + p.price * cart[p.id], 0);
  const add = (id: number) => { setCart(c => ({ ...c, [id]: Math.min(50, (c[id] ?? 0) + 1) })); setNotice('Added to your build list'); window.setTimeout(() => setNotice(''), 2300); };
  const setQty = (id: number, q: number) => setCart(c => { const n = { ...c }; if (q <= 0) delete n[id]; else n[id] = Math.min(q, 50); return n; });
  const submitOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFormError('');
    const f = new FormData(event.currentTarget);
    if (!cartItems.length) { setFormError('Your cart is empty. Add a part before checkout.'); return; }
    createOrder.mutate({ data: {
      customerName: String(f.get('customerName')).trim(), address: String(f.get('address')).trim(),
      email: String(f.get('email')).trim(), phone: String(f.get('phone')).trim(),
      paymentMethod: String(f.get('paymentMethod')) as 'cash_on_delivery' | 'bank_transfer',
      items: cartItems.map(p => ({ productId: p.id, quantity: cart[p.id] }))
    } }, { onSuccess: () => { setCart({}); setCheckoutOpen(false); setCartOpen(false); setNotice('Order received. We’ll be in touch shortly.'); window.setTimeout(() => setNotice(''), 4500); }, onError: e => setFormError(errMessage(e)) });
  };
  const submitMessage = (e: FormEvent<HTMLFormElement>, kind: 'contact' | 'print_request') => {
    e.preventDefault(); setFormError('');
    const form = e.currentTarget;
    const f = new FormData(form);
    createMessage.mutate({ data: { kind, name: String(f.get('name')).trim(), email: String(f.get('email')).trim(), details: String(f.get('details')).trim(), fileName: fileName || null } }, {
      onSuccess: () => { setSent(true); form.reset(); setFileName(''); }, onError: er => setFormError(errMessage(er))
    });
  };
  const productShelf = <section id="shop" className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28">
    <div className="mb-10 flex flex-col justify-between gap-7 border-b border-white/10 pb-8 md:flex-row md:items-end">
      <div><span className="font-mono text-[10px] uppercase tracking-[.23em] text-[#ee6a33]">01 / The parts shelf</span><h2 className="mt-3 font-display text-5xl font-bold uppercase leading-none text-[#f0ece3] sm:text-6xl">Built to be used.</h2><p className="mt-3 max-w-md text-sm text-[#999b99]">Useful upgrades, made with care and shipped from our workshop.</p></div>
      <label className="flex h-11 items-center gap-3 border-b border-white/20 px-1 text-[#999b99] focus-within:border-[#ed6228]"><Search size={15}/><input aria-label="Search products" data-testid="input-product-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a part" className="w-44 bg-transparent text-sm text-[#eee9df] outline-none placeholder:text-[#696b6b]"/></label>
    </div>
    <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
      {categories.map(c => <button key={c.id} onClick={() => setFilter(c.id)} data-testid={`filter-category-${c.id}`} className={`shrink-0 border px-4 py-3 text-left transition ${filter === c.id ? 'border-[#ed6228] bg-[#ed6228] text-[#191a1b]' : 'border-white/10 text-[#aaa9a2] hover:border-white/35'}`}><span className="mr-3 font-mono text-[9px] opacity-70">{c.code}</span><span className="text-[10px] font-semibold uppercase tracking-[.11em]">{c.label}</span></button>)}
    </div>
    {isLoading ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <div key={i} className="h-[390px] animate-pulse bg-white/[.045]"><div className="h-[250px] bg-white/[.04]"/></div>)}</div> :
      isError ? <div className="border border-[#702f21] bg-[#351c18] p-8 text-center"><CircleAlert className="mx-auto text-[#ef7040]"/><p className="mt-3 text-sm text-[#ddd1c9]">{errMessage(error)}</p><button onClick={() => refetch()} className="mt-4 text-xs font-bold uppercase tracking-widest text-[#ef7040]">Try again</button></div> :
      visibleProducts.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleProducts.map((p, i) => <ProductCard key={p.id} product={p} index={i} onAdd={() => add(p.id)}/>)}
      </div> : <div className="border border-dashed border-white/15 py-16 text-center"><Package className="mx-auto text-[#777]"/><p className="mt-3 font-display text-2xl uppercase text-[#ccc5b8]">No parts in this lane yet.</p><p className="mt-1 text-sm text-[#8a8b87]">Try a different category or search term.</p></div>}
    <div className="mt-8 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[.14em] text-[#777b79]"><span className="h-1.5 w-1.5 bg-[#ed6228]"/> Small batch stock rotates as we make it</div>
  </section>;
  const heroTitle = content?.heroTitle || 'Parts for the ones who notice.';
  const heroSubtitle = content?.heroSubtitle || 'Small-batch hardware. Thoughtful fitment. Built in a real enthusiast’s workshop.';
  return <div className="grain min-h-[100dvh]">
    <Header count={quantity} onCart={() => setCartOpen(true)}/>
    <main className={content ? 'hidden' : undefined}>
      <section className="relative isolate min-h-[640px] overflow-hidden border-b border-white/10 sm:min-h-[700px]">
        <img src={content?.heroImageUrl || heroAsset} alt="Precision automotive parts on a workshop bench" className="absolute inset-0 -z-20 h-full w-full object-cover object-center"/>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#111315] via-[#111315]/85 to-[#111315]/20"/>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#111315] via-transparent to-[#111315]/35"/>
        <div className="mx-auto flex min-h-[640px] max-w-[1440px] items-center px-6 py-20 sm:min-h-[700px] lg:px-14">
          <div className="max-w-[720px] reveal">
            <div className="mb-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[.22em] text-[#f17a48]"><span className="h-px w-10 bg-[#ed6228]"/> Independent parts, no showroom attitude</div>
            <h1 className="font-display text-[clamp(4rem,10vw,8.8rem)] font-bold uppercase leading-[.81] tracking-[-.035em] text-[#f3eee4]">{heroTitle}</h1>
            <p className="mt-8 max-w-[440px] text-sm leading-7 text-[#c3c0b8] sm:text-base">{heroSubtitle}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#shop" className="group flex h-12 items-center gap-7 bg-[#ed6228] px-5 text-[11px] font-bold uppercase tracking-[.16em] text-[#171819] transition hover:bg-[#ff7840]">Shop the parts <ArrowRight size={16} className="transition-transform group-hover:translate-x-1"/></a>
              <a href="#custom" className="flex h-12 items-center border border-white/30 px-5 text-[11px] font-bold uppercase tracking-[.16em] text-[#f3eee4] transition hover:border-[#ed6228] hover:text-[#ed6228]">Have an idea?</a>
            </div>
            <div className="mt-14 flex items-center gap-5 border-t border-white/15 pt-5 font-mono text-[9px] uppercase tracking-[.16em] text-[#b5b4ae]">
              <span className="flex items-center gap-2"><ShieldCheck size={15} className="text-[#ed6228]"/> Tested on our own cars</span><span className="h-1 w-1 rounded-full bg-[#ed6228]"/><span>Small runs. Proper details.</span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-10 right-6 hidden font-mono text-[9px] uppercase tracking-[.2em] text-white/50 [writing-mode:vertical-rl] md:block">Redline Works · Est. in the garage</div>
      </section>
       <section id={content ? 'shop-fallback' : 'shop'} className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28">
        <div className="mb-10 flex flex-col justify-between gap-7 border-b border-white/10 pb-8 md:flex-row md:items-end">
          <div><span className="font-mono text-[10px] uppercase tracking-[.23em] text-[#ee6a33]">01 / The parts shelf</span><h2 className="mt-3 font-display text-5xl font-bold uppercase leading-none text-[#f0ece3] sm:text-6xl">Built to be used.</h2><p className="mt-3 max-w-md text-sm text-[#999b99]">Useful upgrades, made with care and shipped from our workshop.</p></div>
          <label className="flex h-11 items-center gap-3 border-b border-white/20 px-1 text-[#999b99] focus-within:border-[#ed6228]"><Search size={15}/><input aria-label="Search products" data-testid="input-product-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a part" className="w-44 bg-transparent text-sm text-[#eee9df] outline-none placeholder:text-[#696b6b]"/></label>
        </div>
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {categories.map(c => <button key={c.id} onClick={() => setFilter(c.id)} data-testid={`filter-category-${c.id}`} className={`shrink-0 border px-4 py-3 text-left transition ${filter === c.id ? 'border-[#ed6228] bg-[#ed6228] text-[#191a1b]' : 'border-white/10 text-[#aaa9a2] hover:border-white/35'}`}><span className="mr-3 font-mono text-[9px] opacity-70">{c.code}</span><span className="text-[10px] font-semibold uppercase tracking-[.11em]">{c.label}</span></button>)}
        </div>
        {isLoading ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <div key={i} className="h-[390px] animate-pulse bg-white/[.045]"><div className="h-[250px] bg-white/[.04]"/></div>)}</div> :
          isError ? <div className="border border-[#702f21] bg-[#351c18] p-8 text-center"><CircleAlert className="mx-auto text-[#ef7040]"/><p className="mt-3 text-sm text-[#ddd1c9]">{errMessage(error)}</p><button onClick={() => refetch()} className="mt-4 text-xs font-bold uppercase tracking-widest text-[#ef7040]">Try again</button></div> :
          visibleProducts.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProducts.map((p, i) => <ProductCard key={p.id} product={p} index={i} onAdd={() => add(p.id)}/>)}
          </div> : <div className="border border-dashed border-white/15 py-16 text-center"><Package className="mx-auto text-[#777]"/><p className="mt-3 font-display text-2xl uppercase text-[#ccc5b8]">No parts in this lane yet.</p><p className="mt-1 text-sm text-[#8a8b87]">Try a different category or search term.</p></div>}
        <div className="mt-8 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[.14em] text-[#777b79]"><span className="h-1.5 w-1.5 bg-[#ed6228]"/> Small batch stock rotates as we make it</div>
      </section>
      <section className="carbon border-y border-white/10">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-14 md:grid-cols-[1fr_2fr_1fr] md:items-center lg:px-10 lg:py-16">
          <div><span className="font-mono text-[9px] uppercase tracking-[.2em] text-[#ed7441]">Bench notes / 001</span><h3 className="mt-2 font-display text-4xl font-bold uppercase text-[#eee9df]">No mystery parts.</h3></div>
          <p className="max-w-xl text-sm leading-7 text-[#aaa9a3]">We make, test, and ship the things we wanted for our own cars. Clear fitment notes, honest materials, and a human on the other end if something isn’t right.</p>
          <a href="#story" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.17em] text-[#ee7441] hover:text-[#ff9868]">Meet the workshop <ArrowUpRight size={15}/></a>
        </div>
      </section>
      <section id="custom" className="mx-auto grid max-w-[1440px] gap-12 px-5 py-20 lg:grid-cols-[.9fr_1.1fr] lg:px-10 lg:py-28">
        <div className="flex flex-col justify-center">
          <span className="font-mono text-[10px] uppercase tracking-[.22em] text-[#ee6a33]">02 / Made for your build</span>
          <h2 className="mt-4 max-w-xl font-display text-6xl font-bold uppercase leading-[.88] text-[#f1ece1] sm:text-7xl">If it doesn’t exist, let’s print it.</h2>
          <p className="mt-6 max-w-lg text-sm leading-7 text-[#a8a8a2]">Send us a sketch, a reference, or the part you’ve been trying to replace. We’ll look at the shape, material, and whether a print is the right fix before we quote it.</p>
          <div className="mt-9 flex gap-8 border-t border-white/10 pt-5 font-mono text-[9px] uppercase tracking-[.14em] text-[#868986]"><span>Fit-led design</span><span>Small-run friendly</span></div>
        </div>
        <div className="border border-white/10 bg-[#191b1d] p-6 sm:p-9">
          {sent ? <div className="flex min-h-[370px] flex-col items-start justify-center"><span className="grid h-11 w-11 place-items-center border border-[#ed6228] text-[#ed6228]"><Check size={20}/></span><h3 className="mt-6 font-display text-4xl uppercase text-[#eee9df]">On our bench.</h3><p className="mt-2 max-w-sm text-sm leading-6 text-[#999b99]">Thanks for the note. We’ll read it and get back to you directly.</p><button onClick={() => setSent(false)} className="mt-7 text-[10px] font-bold uppercase tracking-widest text-[#ed7441]">Send another request</button></div> :
            <form onSubmit={e => submitMessage(e, 'print_request')} className="space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4"><h3 className="font-display text-3xl font-bold uppercase text-[#eee9df]">Custom print request</h3><Box size={20} className="text-[#ed6228]"/></div>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Your name" name="name" required/><Field label="Email address" name="email" type="email" required/></div>
              <label className="block"><span className="mb-2 block font-mono text-[9px] uppercase tracking-[.16em] text-[#929491]">What are we making?</span><textarea name="details" required minLength={5} rows={4} placeholder="Tell us what it does, what it fits, and any dimensions you have." className="w-full resize-y border border-white/10 bg-[#121416] px-3 py-3 text-sm text-[#ece8df] outline-none transition focus:border-[#ed6228]"/></label>
              <label className="flex cursor-pointer items-center gap-3 border border-dashed border-white/15 px-4 py-3 text-xs text-[#aaa9a2] transition hover:border-[#ed6228]"><FileUp size={16} className="text-[#ed7441]"/><span>{fileName || 'Attach an STL file name (optional)'}</span><input type="file" accept=".stl" className="sr-only" onChange={e => setFileName(e.target.files?.[0]?.name || '')}/></label>
              {formError && <p className="text-xs text-[#ff8b65]">{formError}</p>}
              <button disabled={createMessage.isPending} className="flex h-12 w-full items-center justify-between bg-[#ed6228] px-4 text-[10px] font-bold uppercase tracking-[.17em] text-[#171819] transition hover:bg-[#ff7840] disabled:opacity-50"><span>{createMessage.isPending ? 'Sending request…' : 'Send to the workshop'}</span><ArrowRight size={16}/></button>
            </form>}
        </div>
      </section>
      <section id="story" className="border-y border-white/10 bg-[#17191b]">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-16 lg:grid-cols-[.7fr_1.3fr] lg:px-10 lg:py-20">
          <div><span className="font-mono text-[10px] uppercase tracking-[.2em] text-[#ed6b35]">03 / A small workshop</span><h2 className="mt-4 font-display text-5xl font-bold uppercase leading-[.88] text-[#eee9df]">{content?.aboutTitle || 'Built by people who drive.'}</h2></div>
          <div className="max-w-2xl"><p className="text-sm leading-7 text-[#aaa9a2]">{content?.aboutBody || 'Redline Works started with one annoying problem: parts that looked right online and let us down on the car. We are an enthusiast-run workshop making useful, considered upgrades in small batches. We care about the little things — the fit, the finish, the way it feels in your hand — because we use these parts ourselves.'}</p><div className="mt-7 flex flex-wrap gap-x-9 gap-y-3 font-mono text-[9px] uppercase tracking-[.16em] text-[#8a8b87]"><span className="flex items-center gap-2"><BadgeCheck size={15} className="text-[#ed6228]"/> Real-world tested</span><span className="flex items-center gap-2"><Truck size={15} className="text-[#ed6228]"/> Packed by the people who made it</span></div></div>
        </div>
      </section>
      <section id="contact" className="mx-auto grid max-w-[1440px] gap-12 px-5 py-20 lg:grid-cols-[1fr_1fr] lg:px-10">
        <div><span className="font-mono text-[10px] uppercase tracking-[.2em] text-[#ed6b35]">04 / Drop us a line</span><h2 className="mt-3 font-display text-6xl font-bold uppercase text-[#eee9df]">Real people.<br/>Real replies.</h2><p className="mt-4 max-w-md text-sm leading-7 text-[#a5a6a1]">Need a fitment check or have a question before ordering? Tell us what you’re working on.</p>
          <div className="mt-8 space-y-4 text-sm text-[#d5d0c6]"><a className="flex items-center gap-3 transition hover:text-[#ed7441]" href={`mailto:${content?.contactEmail || 'hello@redlineworks.co'}`}><Mail size={16} className="text-[#ed6228]"/>{content?.contactEmail || 'hello@redlineworks.co'}</a><a className="flex items-center gap-3 transition hover:text-[#ed7441]" href={`tel:${content?.contactPhone || '+1 503 555 0148'}`}><ArrowUpRight size={16} className="text-[#ed6228]"/>{content?.contactPhone || '+1 503 555 0148'}</a></div>
        </div>
        <div className="border border-white/10 bg-[#191b1d] p-6 sm:p-8">
          {sent ? <div className="flex min-h-72 flex-col justify-center"><Check className="text-[#ed6228]"/><h3 className="mt-4 font-display text-3xl uppercase">Message on its way.</h3><button onClick={() => setSent(false)} className="mt-5 self-start text-xs uppercase tracking-widest text-[#ed7441]">Write another</button></div> :
            <form onSubmit={e => submitMessage(e, 'contact')} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="Your name" name="name" required/><Field label="Email address" name="email" type="email" required/></div><label className="block"><span className="mb-2 block font-mono text-[9px] uppercase tracking-[.16em] text-[#929491]">Message</span><textarea name="details" required rows={5} minLength={3} placeholder="What can we help with?" className="w-full border border-white/10 bg-[#121416] px-3 py-3 text-sm text-[#ece8df] outline-none focus:border-[#ed6228]"/></label>{formError && <p className="text-xs text-[#ff8b65]">{formError}</p>}<button disabled={createMessage.isPending} className="flex h-12 w-full items-center justify-between bg-[#25282a] px-4 text-[10px] font-bold uppercase tracking-[.17em] text-[#eee9df] transition hover:bg-[#ed6228] hover:text-[#171819]"><span>{createMessage.isPending ? 'Sending…' : 'Send message'}</span><Send size={15}/></button></form>}
        </div>
      </section>
    </main>
    {content && <main><HomepageSections sections={content.sections} afterHero={productShelf}/></main>}
    <footer className="border-t border-white/10 bg-[#111315]">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-10 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:px-10">
        <div><div className="font-display text-2xl font-bold tracking-[.1em]">REDLINE<span className="text-[#ed6228]">/</span>WORKS</div><p className="mt-3 max-w-xs text-xs leading-5 text-[#81837f]">Independent automotive parts. Made slowly, tested properly, sent with care.</p></div>
        <div className="flex flex-col gap-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#999b99]"><span className="mb-1 text-[#e8e1d6]">Navigate</span><a href="#shop" className="hover:text-[#ed7441]">Parts shelf</a><a href="#block-custom-print-request" className="hover:text-[#ed7441]">Custom printing</a><a href="#block-story-workshop" className="hover:text-[#ed7441]">The workshop</a></div>
        <div className="flex flex-col gap-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#999b99]"><span className="mb-1 text-[#e8e1d6]">Contact</span><a className="break-all hover:text-[#ed7441]" href={`mailto:${content?.contactEmail || 'hello@forgeauto.hu'}`}>{content?.contactEmail || 'hello@forgeauto.hu'}</a><a className="hover:text-[#ed7441]" href={`tel:${content?.contactPhone || '+36 30 555 0100'}`}>{content?.contactPhone || '+36 30 555 0100'}</a></div>
        <div className="flex flex-col gap-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#999b99]"><span className="mb-1 text-[#e8e1d6]">Find us</span>{content?.instagramUrl && <a href={content.instagramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-[#ed7441]"><Instagram size={14}/>Instagram</a>}{content?.facebookUrl && <a href={content.facebookUrl} target="_blank" rel="noreferrer" className="hover:text-[#ed7441]">Facebook</a>}<span>© {new Date().getFullYear()} Redline Works</span></div>
      </div>
    </footer>
    {notice && <div role="status" className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 border border-[#ed6228]/50 bg-[#202224] px-5 py-3 text-xs text-[#eee9df] shadow-2xl"><Check size={15} className="text-[#ed6228]"/>{notice}</div>}
    {cartOpen && <div className="fixed inset-0 z-50 flex justify-end bg-black/65" onMouseDown={e => { if (e.target === e.currentTarget) setCartOpen(false); }}><aside className="flex h-full w-full max-w-[460px] flex-col border-l border-white/10 bg-[#17191b] animate-[slide-in_.28s_ease-out]">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-5"><div><span className="font-mono text-[9px] uppercase tracking-[.18em] text-[#ed7441]">Build list</span><h2 className="font-display text-3xl font-bold uppercase">Your cart <span className="text-[#888]">({quantity})</span></h2></div><button onClick={() => setCartOpen(false)} aria-label="Close cart" className="p-2 text-[#aaa] hover:text-white"><X/></button></div>
      <div className="flex-1 overflow-auto p-6">{cartItems.length ? cartItems.map(p => <div key={p.id} className="flex gap-4 border-b border-white/10 py-4"><img src={p.imageUrl || heroAsset} alt="" className="h-20 w-24 object-cover bg-[#222]"/><div className="flex-1"><p className="font-display text-xl uppercase">{p.title}</p><p className="mt-1 font-mono text-xs text-[#ed7441]">{money(p.price)}</p><div className="mt-3 flex items-center gap-3"><button onClick={() => setQty(p.id, cart[p.id] - 1)} aria-label="Decrease quantity"><Minus size={13}/></button><span className="font-mono text-xs">{cart[p.id]}</span><button onClick={() => setQty(p.id, cart[p.id] + 1)} aria-label="Increase quantity"><Plus size={13}/></button><button onClick={() => setQty(p.id, 0)} className="ml-auto text-[#777] hover:text-[#ef7040]" aria-label="Remove item"><Trash2 size={14}/></button></div></div></div>) : <div className="flex h-full flex-col items-center justify-center text-center"><ShoppingBag size={30} className="text-[#737674]"/><p className="mt-4 font-display text-2xl uppercase">Nothing on the bench.</p><p className="mt-1 text-xs text-[#888]">Add a part to get your build moving.</p><button onClick={() => setCartOpen(false)} className="mt-5 text-[10px] font-bold uppercase tracking-widest text-[#ed7441]">Keep browsing</button></div>}</div>
      <div className="border-t border-white/10 p-6"><div className="flex justify-between font-mono text-xs uppercase tracking-wider"><span className="text-[#999]">Subtotal</span><span>{money(subtotal)}</span></div><p className="mt-2 text-[10px] text-[#777]">Shipping and any applicable taxes are confirmed before fulfillment.</p><button disabled={!cartItems.length} onClick={() => { setCartOpen(false); setCheckoutOpen(true); }} className="mt-5 flex h-12 w-full items-center justify-between bg-[#ed6228] px-4 text-[10px] font-bold uppercase tracking-[.17em] text-[#171819] disabled:cursor-not-allowed disabled:opacity-40"><span>Continue to checkout</span><ArrowRight size={16}/></button></div>
    </aside></div>}
    {checkoutOpen && <div className="fixed inset-0 z-[60] grid place-items-center overflow-auto bg-black/75 p-4" onMouseDown={e => { if (e.target === e.currentTarget) setCheckoutOpen(false); }}><div className="w-full max-w-[680px] border border-white/10 bg-[#191b1d] p-6 sm:p-9"><div className="flex items-start justify-between"><div><span className="font-mono text-[9px] uppercase tracking-[.2em] text-[#ed7441]">Order details / secure checkout</span><h2 className="mt-2 font-display text-4xl font-bold uppercase">Finish the build.</h2></div><button onClick={() => setCheckoutOpen(false)} aria-label="Close checkout"><X/></button></div>
      <form onSubmit={submitOrder} className="mt-7 space-y-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="Full name" name="customerName" required/><Field label="Email address" name="email" type="email" required/><Field label="Phone" name="phone" type="tel" required minLength={3}/><label className="block"><span className="mb-2 block font-mono text-[9px] uppercase tracking-[.16em] text-[#929491]">Payment method</span><select name="paymentMethod" className="h-11 w-full border border-white/10 bg-[#121416] px-3 text-sm text-[#ece8df] outline-none focus:border-[#ed6228]"><option value="cash_on_delivery">Cash on delivery</option><option value="bank_transfer">Bank transfer</option></select></label></div><Field label="Shipping address" name="address" required/><div className="border-y border-white/10 py-4">{cartItems.map(p => <div key={p.id} className="flex justify-between py-1 text-xs text-[#aaa]"><span>{p.title} × {cart[p.id]}</span><span>{money(p.price * cart[p.id])}</span></div>)}<div className="mt-3 flex justify-between font-mono text-sm text-[#eee9df]"><span>Total</span><span>{money(subtotal)}</span></div></div>{formError && <p className="text-xs text-[#ff8b65]">{formError}</p>}<button disabled={createOrder.isPending} className="flex h-12 w-full items-center justify-between bg-[#ed6228] px-4 text-[10px] font-bold uppercase tracking-[.17em] text-[#171819] disabled:opacity-50"><span>{createOrder.isPending ? 'Placing order…' : 'Place order'}</span><ArrowRight size={16}/></button><p className="text-center text-[10px] text-[#777]">Your details are used only to fulfill this order.</p></form>
    </div></div>}
  </div>;
}

function ProductCard({ product, index, onAdd }: { product: Product; index: number; onAdd: () => void }) {
  return <article className="group border border-white/10 bg-[#191b1d] transition duration-300 hover:-translate-y-1 hover:border-[#ed6228]/55" style={{ animationDelay: `${index * 75}ms` }}>
    <div className="relative h-[270px] overflow-hidden bg-[#222426]">
      <img src={product.imageUrl || heroAsset} alt={product.title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"/>
      <div className="absolute inset-0 bg-gradient-to-t from-[#141619]/75 via-transparent to-transparent"/>
      <div className="absolute left-4 top-4 border border-white/20 bg-[#17191b]/75 px-2 py-1 font-mono text-[8px] uppercase tracking-[.14em] text-[#eee9df]">{labelCategory(product.category)}</div>
      <span className="absolute bottom-4 right-4 font-mono text-[9px] uppercase tracking-widest text-white/65">RW / {String(product.id).padStart(3,'0')}</span>
    </div>
    <div className="p-5"><div className="flex items-start justify-between gap-4"><h3 className="font-display text-2xl font-bold uppercase leading-none text-[#ede8de]">{product.title}</h3><span className="shrink-0 font-mono text-sm text-[#ed7441]">{money(product.price)}</span></div><p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-[#999b98]">{product.description}</p><button onClick={onAdd} data-testid={`button-add-product-${product.id}`} className="mt-5 flex h-10 w-full items-center justify-between border border-white/15 px-3 text-[9px] font-bold uppercase tracking-[.16em] text-[#d8d4ca] transition group-hover:border-[#ed6228] group-hover:bg-[#ed6228] group-hover:text-[#171819]"><span>Add to build</span><Plus size={15}/></button></div>
  </article>;
}
function AdminLogin() {
  const [, setLocation] = useLocation();
  const session = useGetAdminSession({ request: { credentials: 'include' }, query: { queryKey: getGetAdminSessionQueryKey(), retry: false } });
  const login = useAdminLogin({ request: { credentials: 'include' } });
  const [error, setError] = useState('');
  useEffect(() => { if (session.data?.authenticated) setLocation('/admin'); }, [session.data, setLocation]);
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); setError(''); const f = new FormData(e.currentTarget); login.mutate({ data: { username: String(f.get('username')).trim(), password: String(f.get('password')) } }, { onSuccess: () => setLocation('/admin'), onError: e => setError(errMessage(e)) }); };
  return <div className="grain grid min-h-[100dvh] place-items-center bg-[#121416] px-5 py-12"><div className="grid w-full max-w-[920px] overflow-hidden border border-white/10 bg-[#191b1d] md:grid-cols-[1fr_1fr]">
    <div className="relative hidden min-h-[570px] flex-col justify-between overflow-hidden p-10 md:flex"><img src={heroAsset} className="absolute inset-0 h-full w-full object-cover opacity-30" alt="Workshop detail"/><div className="absolute inset-0 bg-gradient-to-t from-[#111315] via-[#111315]/70 to-[#111315]/35"/><div className="relative flex items-center gap-3"><span className="grid h-9 w-9 place-items-center border border-[#ed6228] font-display text-xl italic text-[#ed6228]">R</span><span className="font-display text-xl tracking-widest">REDLINE/WORKS</span></div><div className="relative"><span className="font-mono text-[9px] uppercase tracking-[.2em] text-[#ed7441]">Private workshop access</span><p className="mt-3 font-display text-5xl font-bold uppercase leading-[.9]">Keep the<br/>shop moving.</p></div><span className="relative font-mono text-[9px] uppercase tracking-widest text-white/50">Authorized staff only · RW-01</span></div>
    <div className="flex min-h-[570px] flex-col justify-center p-7 sm:p-12"><a href="/" className="mb-12 self-start font-mono text-[9px] uppercase tracking-[.18em] text-[#a2a29d] hover:text-[#ed7441]">← Back to storefront</a><LockKeyhole size={21} className="text-[#ed6228]"/><h1 className="mt-4 font-display text-4xl font-bold uppercase">Admin sign in</h1><p className="mt-2 text-xs leading-5 text-[#929491]">This area is only for the people who run the workshop.</p>
      <form onSubmit={submit} className="mt-8 space-y-5"><Field label="Username" name="username" required/><Field label="Password" name="password" type="password" required/>{error && <p role="alert" className="text-xs text-[#ff8b65]">{error}</p>}<button disabled={login.isPending} className="flex h-12 w-full items-center justify-between bg-[#ed6228] px-4 text-[10px] font-bold uppercase tracking-[.17em] text-[#171819] disabled:opacity-50"><span>{login.isPending ? 'Checking access…' : 'Enter the workshop'}</span><ArrowRight size={16}/></button></form>
      {session.isLoading && <p className="mt-5 font-mono text-[9px] uppercase tracking-widest text-[#777]">Checking session…</p>}
    </div>
  </div></div>;
}

type AdminTab = 'overview' | 'orders' | 'inbox' | 'products' | 'content';
function Admin() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const session = useGetAdminSession({ request: { credentials: 'include' }, query: { queryKey: getGetAdminSessionQueryKey(), retry: false } });
  const logout = useAdminLogout({ request: { credentials: 'include' } });
  const [tab, setTab] = useState<AdminTab>('overview');
  const [feedback, setFeedback] = useState('');
  const dashboard = useGetAdminDashboard({ request: { credentials: 'include' }, query: { queryKey: getGetAdminDashboardQueryKey(), enabled: !!session.data?.authenticated, retry: false } });
  const orders = useListAdminOrders({ request: { credentials: 'include' }, query: { queryKey: getListAdminOrdersQueryKey(), enabled: !!session.data?.authenticated, retry: false } });
  const messages = useListAdminMessages({ request: { credentials: 'include' }, query: { queryKey: getListAdminMessagesQueryKey(), enabled: !!session.data?.authenticated, retry: false } });
  const products = useListAdminProducts({ request: { credentials: 'include' }, query: { queryKey: getListAdminProductsQueryKey(), enabled: !!session.data?.authenticated, retry: false } });
  const siteContent = useGetSiteContent({ request: { credentials: 'include' }, query: { queryKey: getGetSiteContentQueryKey(), enabled: !!session.data?.authenticated } });
  const updateOrder = useUpdateAdminOrder({ request: { credentials: 'include' } });
  const updateContent = useUpdateSiteContent({ request: { credentials: 'include' } });
  const createProduct = useCreateAdminProduct({ request: { credentials: 'include' } });
  const editProduct = useUpdateAdminProduct({ request: { credentials: 'include' } });
  const deleteProduct = useDeleteAdminProduct({ request: { credentials: 'include' } });
  useEffect(() => { if (!session.isLoading && !session.data?.authenticated) setLocation('/admin-login'); }, [session.data, session.isLoading, setLocation]);
  if (session.isLoading || !session.data?.authenticated) return <div className="grid min-h-[100dvh] place-items-center bg-[#121416]"><div className="w-56 space-y-3"><div className="h-3 animate-pulse bg-white/10"/><div className="h-3 w-2/3 animate-pulse bg-white/10"/></div></div>;
  const refreshProducts = () => { qc.invalidateQueries({ queryKey: getListAdminProductsQueryKey() }); qc.invalidateQueries({ queryKey: getListProductsQueryKey() }); qc.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() }); };
  const tabs: { id: AdminTab; label: string; icon: typeof Box }[] = [{ id: 'overview', label: 'Overview', icon: ClipboardList }, { id: 'orders', label: 'Orders', icon: Truck }, { id: 'inbox', label: 'Inbox & requests', icon: Mail }, { id: 'products', label: 'Products', icon: Box }, { id: 'content', label: 'Site content', icon: Package }];
  return <div className="grain min-h-[100dvh] bg-[#121416]">
    <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-white/10 bg-[#151719]/95 px-5 backdrop-blur lg:px-8"><a href="/" className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center border border-[#ed6228] font-display italic text-[#ed6228]">R</span><span className="font-display text-xl font-bold tracking-widest">REDLINE<span className="text-[#ed6228]">/</span>WORKS <span className="ml-2 font-mono text-[8px] font-normal tracking-[.2em] text-[#777]">CONTROL ROOM</span></span></a><button onClick={() => logout.mutate(undefined, { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() }); setLocation('/admin-login'); } })} className="flex items-center gap-2 border border-white/10 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-[#aaa] hover:border-[#ed6228] hover:text-[#ed7441]">{logout.isPending ? 'Signing out' : 'Sign out'}<ArrowUpRight size={13}/></button></header>
    <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[230px_1fr]">
      <aside className="border-b border-white/10 p-3 lg:min-h-[calc(100dvh-68px)] lg:border-b-0 lg:border-r lg:p-5"><p className="hidden px-3 pb-3 font-mono text-[8px] uppercase tracking-[.2em] text-[#6f7371] lg:block">Workshop desk</p><nav className="flex gap-1 overflow-x-auto lg:flex-col">{tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-3 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[.12em] transition ${tab === id ? 'bg-[#ed6228] text-[#171819]' : 'text-[#999b98] hover:bg-white/5 hover:text-[#eee9df]'}`}><Icon size={15}/>{label}</button>)}</nav><div className="mt-8 hidden border-t border-white/10 px-3 pt-5 lg:block"><span className="font-mono text-[8px] uppercase tracking-widest text-[#777]">System status</span><p className="mt-3 flex items-center gap-2 text-[10px] text-[#a9aaa5]"><span className="h-1.5 w-1.5 rounded-full bg-[#78a889]"/> Online · API connected</p></div></aside>
      <main className="min-w-0 p-5 sm:p-7 lg:p-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><span className="font-mono text-[9px] uppercase tracking-[.2em] text-[#ed7441]">Redline / {tab}</span><h1 className="mt-2 font-display text-5xl font-bold uppercase leading-none">{tabs.find(t => t.id === tab)?.label}</h1></div><span className="font-mono text-[9px] uppercase tracking-widest text-[#777]">Workshop admin · private</span></div>
        {feedback && <div role="status" className="mb-5 flex items-center justify-between border border-[#52735e] bg-[#1b2a21] px-4 py-3 text-xs text-[#c4dfc9]"><span>{feedback}</span><button onClick={() => setFeedback('')}><X size={14}/></button></div>}
        {tab === 'overview' && <Overview data={dashboard.data} loading={dashboard.isLoading} error={dashboard.isError ? errMessage(dashboard.error) : ''} retry={() => dashboard.refetch()} orders={orders.data ?? []} messages={messages.data ?? []} onTab={setTab}/>}
        {tab === 'orders' && <OrdersView orders={orders.data ?? []} loading={orders.isLoading} error={orders.isError ? errMessage(orders.error) : ''} retry={() => orders.refetch()} busy={updateOrder.isPending} onStatus={(id,status) => updateOrder.mutate({ id, data: { status } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() }); qc.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() }); setFeedback(`Order #${id} marked ${status}.`); }, onError: e => setFeedback(errMessage(e)) })}/>}
        {tab === 'inbox' && <InboxView messages={messages.data ?? []} loading={messages.isLoading} error={messages.isError ? errMessage(messages.error) : ''} retry={() => messages.refetch()}/>}
        {tab === 'products' && <ProductsView products={products.data ?? []} loading={products.isLoading} error={products.isError ? errMessage(products.error) : ''} retry={() => products.refetch()} createPending={createProduct.isPending} editPending={editProduct.isPending} deletePending={deleteProduct.isPending} onSave={(id,data) => id ? editProduct.mutate({ id, data }, { onSuccess: () => { refreshProducts(); setFeedback('Product changes saved.'); }, onError: e => setFeedback(errMessage(e)) }) : createProduct.mutate({ data: data as ProductInput }, { onSuccess: () => { refreshProducts(); setFeedback('Product added to the shelf.'); }, onError: e => setFeedback(errMessage(e)) })} onDelete={id => { if (window.confirm('Delete this product permanently?')) deleteProduct.mutate({ id }, { onSuccess: () => { refreshProducts(); setFeedback('Product removed.'); }, onError: e => setFeedback(errMessage(e)) }); }}/>}
        {tab === 'content' && <AdminSiteContentBuilder content={siteContent.data ?? null} loading={siteContent.isLoading} error={siteContent.isError ? errMessage(siteContent.error) : ''} retry={() => siteContent.refetch()} onSave={data => updateContent.mutate({ data }, { onSuccess: updated => { qc.setQueryData(getGetSiteContentQueryKey(), updated); setFeedback('Storefront content updated.'); }, onError: e => setFeedback(errMessage(e)) })} pending={updateContent.isPending}/>}
      </main>
    </div>
  </div>;
}

function Overview({ data, loading, error, retry, orders, messages, onTab }: { data?: { totalOrders: number; totalMessages: number; activeProducts: number; pendingOrders: number }; loading: boolean; error: string; retry: () => void; orders: Order[]; messages: Message[]; onTab: (t: AdminTab) => void }) {
  if (error) return <ErrorPanel message={error} retry={retry}/>;
  const stats = [{ label: 'All orders', value: data?.totalOrders ?? 0, icon: ClipboardList }, { label: 'Needs attention', value: data?.pendingOrders ?? 0, icon: Truck }, { label: 'Active products', value: data?.activeProducts ?? 0, icon: Box }, { label: 'Inbox', value: data?.totalMessages ?? 0, icon: Mail }];
  return <><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{stats.map(({ label, value, icon: Icon }) => <div key={label} className="border border-white/10 bg-[#191b1d] p-5"><div className="flex justify-between text-[#929491]"><span className="font-mono text-[8px] uppercase tracking-[.14em]">{label}</span><Icon size={15} className="text-[#ed7441]"/></div><div className="mt-4 font-display text-4xl">{loading ? '—' : value}</div></div>)}</div>
    <div className="mt-8 grid gap-4 xl:grid-cols-[1.1fr_.9fr]"><section className="border border-white/10 bg-[#191b1d]"><div className="flex items-center justify-between border-b border-white/10 p-5"><h2 className="font-display text-2xl uppercase">Recent orders</h2><button onClick={() => onTab('orders')} className="font-mono text-[8px] uppercase tracking-widest text-[#ed7441]">All orders →</button></div>{orders.slice(0,5).map(o => <div key={o.id} className="flex items-center justify-between border-b border-white/[.06] px-5 py-4"><div><p className="text-xs font-semibold">{o.customerName}</p><p className="mt-1 font-mono text-[9px] text-[#858783]">#{o.id} · {new Date(o.createdAt).toLocaleDateString()}</p></div><div className="text-right"><p className="font-mono text-xs">{money(o.total)}</p><Status status={o.status}/></div></div>)}{!orders.length && !loading && <EmptyBlock title="No orders yet" detail="New customer orders will show up here."/>}</section>
    <section className="border border-white/10 bg-[#191b1d]"><div className="flex items-center justify-between border-b border-white/10 p-5"><h2 className="font-display text-2xl uppercase">Latest messages</h2><button onClick={() => onTab('inbox')} className="font-mono text-[8px] uppercase tracking-widest text-[#ed7441]">Open inbox →</button></div>{messages.slice(0,4).map(m => <div key={m.id} className="border-b border-white/[.06] px-5 py-4"><div className="flex justify-between"><p className="text-xs font-semibold">{m.name}</p><span className="font-mono text-[8px] uppercase text-[#ed7441]">{m.kind === 'print_request' ? 'Print request' : 'Contact'}</span></div><p className="mt-2 line-clamp-2 text-xs leading-5 text-[#999b98]">{m.details}</p></div>)}{!messages.length && !loading && <EmptyBlock title="Inbox is clear" detail="Customer messages appear here."/>}</section></div></>;
}
function OrdersView({ orders, loading, error, retry, busy, onStatus }: { orders: Order[]; loading: boolean; error: string; retry: () => void; busy: boolean; onStatus: (id: number, status: 'pending'|'shipped'|'cancelled') => void }) {
  if (error) return <ErrorPanel message={error} retry={retry}/>;
  return <div className="overflow-hidden border border-white/10 bg-[#191b1d]"><div className="grid grid-cols-[1fr_auto] border-b border-white/10 p-5 sm:grid-cols-[1.3fr_1fr_.75fr_.85fr]"><span className="font-mono text-[8px] uppercase tracking-widest text-[#777]">Order / customer</span><span className="hidden font-mono text-[8px] uppercase tracking-widest text-[#777] sm:block">Items</span><span className="font-mono text-[8px] uppercase tracking-widest text-[#777]">Total</span><span className="hidden font-mono text-[8px] uppercase tracking-widest text-[#777] sm:block">Status / action</span></div>
    {loading ? [1,2,3].map(i => <div key={i} className="h-20 animate-pulse border-b border-white/5 bg-white/[.02]"/>):orders.map(o => <div key={o.id} className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-white/[.06] p-5 sm:grid-cols-[1.3fr_1fr_.75fr_.85fr]"><div><p className="text-xs font-semibold">{o.customerName}</p><p className="mt-1 font-mono text-[9px] text-[#858783]">#{o.id} · {o.email}</p><p className="mt-1 text-[10px] text-[#777]">{o.address}</p></div><div className="hidden text-xs text-[#aaa] sm:block">{o.items.map(i => `${i.title} ×${i.quantity}`).join(', ')}</div><div className="font-mono text-xs">{money(o.total)}</div><div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:justify-end"><Status status={o.status}/>{o.status === 'pending' ? <><button disabled={busy} onClick={() => onStatus(o.id, 'shipped')} title="Mark shipped" className="grid h-8 w-8 place-items-center border border-white/10 text-[#a8c3ae] hover:border-[#7faa89] disabled:opacity-40"><Truck size={14}/></button><button disabled={busy} onClick={() => onStatus(o.id, 'cancelled')} title="Cancel order" className="grid h-8 w-8 place-items-center border border-white/10 text-[#ef8a72] hover:border-[#ef8a72] disabled:opacity-40"><X size={14}/></button></> : o.status === 'cancelled' ? <button disabled={busy} onClick={() => onStatus(o.id, 'pending')} className="text-[8px] uppercase tracking-wider text-[#aaa] underline">Reopen</button> : <button disabled={busy} onClick={() => onStatus(o.id, 'pending')} className="text-[8px] uppercase tracking-wider text-[#aaa] underline">Revert</button>}</div></div>)}
    {!loading && !orders.length && <EmptyBlock title="No orders have landed." detail="Orders will appear here when customers check out."/>}</div>;
}
function InboxView({ messages, loading, error, retry }: { messages: Message[]; loading: boolean; error: string; retry: () => void }) {
  if (error) return <ErrorPanel message={error} retry={retry}/>;
  return <div className="grid gap-3 md:grid-cols-2">{loading ? [1,2,3,4].map(i => <div key={i} className="h-48 animate-pulse border border-white/10 bg-[#191b1d]"/>):messages.map(m => <article key={m.id} className="border border-white/10 bg-[#191b1d] p-5"><div className="flex items-start justify-between gap-3"><div><span className="font-mono text-[8px] uppercase tracking-[.15em] text-[#ed7441]">{m.kind === 'print_request' ? 'Custom print request' : 'Contact message'}</span><h3 className="mt-2 font-display text-2xl uppercase">{m.name}</h3></div><span className="font-mono text-[8px] text-[#777]">{new Date(m.createdAt).toLocaleDateString()}</span></div><a href={`mailto:${m.email}`} className="mt-2 inline-block text-xs text-[#b6b6af] hover:text-[#ed7441]">{m.email}</a><p className="mt-4 whitespace-pre-wrap border-l border-[#ed6228] pl-3 text-xs leading-6 text-[#a5a6a1]">{m.details}</p>{m.fileName && <div className="mt-4 flex items-center gap-2 border border-white/10 p-2 font-mono text-[9px] text-[#aaa]"><FileUp size={13} className="text-[#ed7441]"/>{m.fileName}</div>}</article>)}{!loading && !messages.length && <EmptyBlock title="Nothing in the inbox." detail="Contact messages and print requests will appear here."/>}</div>;
}
function ProductsView({ products, loading, error, retry, createPending, editPending, deletePending, onSave, onDelete }: { products: Product[]; loading: boolean; error: string; retry: () => void; createPending: boolean; editPending: boolean; deletePending: boolean; onSave: (id: number | null, data: ProductInput) => void; onDelete: (id: number) => void }) {
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const save = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); setFormError(''); const f = new FormData(e.currentTarget); const title = String(f.get('title')).trim(); const price = Number(f.get('price')); if (!title || !Number.isFinite(price) || price < 0) { setFormError('Enter a title and a valid non-negative price.'); return; } onSave(editing?.id ?? null, { title, price, description: String(f.get('description')), imageUrl: String(f.get('imageUrl')), category: String(f.get('category')) as ProductCategory, active: f.get('active') === 'on' }); setCreating(false); setEditing(null); };
  if (error) return <ErrorPanel message={error} retry={retry}/>;
  return <><div className="mb-5 flex justify-end"><button onClick={() => { setEditing(null); setCreating(true); }} className="flex h-10 items-center gap-2 bg-[#ed6228] px-4 text-[9px] font-bold uppercase tracking-[.15em] text-[#171819]"><Plus size={15}/> Add product</button></div>
    {(creating || editing) && <div className="mb-6 border border-[#ed6228]/45 bg-[#191b1d] p-5 sm:p-7"><div className="mb-5 flex justify-between"><h2 className="font-display text-3xl uppercase">{editing ? 'Edit product' : 'New product'}</h2><button onClick={() => { setCreating(false); setEditing(null); }}><X size={18}/></button></div><form onSubmit={save} className="grid gap-4 sm:grid-cols-2"><Field label="Product title" name="title" required defaultValue={editing?.title}/><Field label="Price" name="price" type="number" required defaultValue={editing ? String(editing.price) : ''}/><label className="block"><span className="mb-2 block font-mono text-[9px] uppercase tracking-widest text-[#929491]">Category</span><select name="category" defaultValue={editing?.category || 'magnetic_license_plates'} className="h-11 w-full border border-white/10 bg-[#121416] px-3 text-sm"><option value="magnetic_license_plates">Magnetic plate frames</option><option value="carbon_fiber_parts">Carbon fiber parts</option><option value="custom_3d_printing">Custom 3D printing</option></select></label><Field label="Image URL" name="imageUrl" defaultValue={editing?.imageUrl || ''}/><label className="block sm:col-span-2"><span className="mb-2 block font-mono text-[9px] uppercase tracking-widest text-[#929491]">Description</span><textarea name="description" defaultValue={editing?.description} rows={3} className="w-full border border-white/10 bg-[#121416] p-3 text-sm outline-none focus:border-[#ed6228]"/></label><label className="flex items-center gap-2 text-xs text-[#aaa]"><input name="active" type="checkbox" defaultChecked={editing?.active ?? true} className="accent-[#ed6228]"/> Visible on storefront</label>{formError && <p className="text-xs text-[#ff8b65]">{formError}</p>}<button disabled={createPending || editPending} className="flex h-11 items-center justify-between bg-[#ed6228] px-4 text-[9px] font-bold uppercase tracking-widest text-[#171819] sm:col-span-2"><span>{createPending || editPending ? 'Saving…' : editing ? 'Save changes' : 'Create product'}</span><Check size={15}/></button></form></div>}
    <div className="overflow-hidden border border-white/10 bg-[#191b1d]">{loading ? [1,2,3].map(i => <div key={i} className="h-20 animate-pulse border-b border-white/5 bg-white/[.02]"/>):products.map(p => <div key={p.id} className="flex flex-wrap items-center gap-4 border-b border-white/[.06] p-4 sm:flex-nowrap sm:px-5"><img src={p.imageUrl || heroAsset} alt="" className="h-14 w-16 object-cover"/><div className="min-w-[140px] flex-1"><p className="font-display text-xl uppercase">{p.title}</p><p className="font-mono text-[8px] uppercase tracking-widest text-[#777]">{labelCategory(p.category)}</p></div><span className="font-mono text-xs text-[#ed7441]">{money(p.price)}</span><span className={`font-mono text-[8px] uppercase tracking-widest ${p.active ? 'text-[#8db39a]' : 'text-[#777]'}`}>{p.active ? 'Visible' : 'Hidden'}</span><div className="ml-auto flex gap-2"><button onClick={() => { setCreating(false); setEditing(p); }} className="border border-white/10 px-3 py-2 text-[8px] font-bold uppercase tracking-widest hover:border-[#ed6228]">Edit</button><button disabled={deletePending} onClick={() => onDelete(p.id)} aria-label={`Delete ${p.title}`} className="grid h-8 w-8 place-items-center border border-white/10 text-[#e67d62] hover:border-[#e67d62] disabled:opacity-40"><Trash2 size={14}/></button></div></div>)}{!loading && !products.length && <EmptyBlock title="The shelf is empty." detail="Add your first part to make it available in the shop."/>}</div></>;
}
function Field({ label, name, type = 'text', required = false, minLength, defaultValue }: { label: string; name: string; type?: string; required?: boolean; minLength?: number; defaultValue?: string }) {
  return <label className="block"><span className="mb-2 block font-mono text-[9px] uppercase tracking-[.16em] text-[#929491]">{label}</span><input name={name} type={type} required={required} minLength={minLength} defaultValue={defaultValue} className="h-11 w-full border border-white/10 bg-[#121416] px-3 text-sm text-[#ece8df] outline-none transition focus:border-[#ed6228]"/></label>;
}

function Status({ status }: { status: string }) {
  const colors: Record<string, string> = { pending: 'border-[#c58d54]/40 bg-[#c58d54]/10 text-[#e5b982]', shipped: 'border-[#719b7b]/40 bg-[#719b7b]/10 text-[#a4c9ab]', cancelled: 'border-[#bc6654]/40 bg-[#bc6654]/10 text-[#df9583]' };
  return <span className={`mt-1 inline-flex border px-2 py-1 font-mono text-[8px] uppercase tracking-[.13em] ${colors[status] || 'border-white/10 text-[#aaa]'}`}>{status}</span>;
}
function EmptyBlock({ title, detail }: { title: string; detail: string }) {
  return <div className="px-6 py-12 text-center"><Package size={21} className="mx-auto text-[#767976]"/><h3 className="mt-3 font-display text-2xl uppercase text-[#d8d2c7]">{title}</h3><p className="mt-1 text-xs text-[#858783]">{detail}</p></div>;
}
function ErrorPanel({ message, retry }: { message: string; retry: () => void }) {
  return <div className="border border-[#702f21] bg-[#321b17] p-8 text-center"><CircleAlert size={22} className="mx-auto text-[#ef7040]"/><p className="mt-3 text-sm text-[#ddd1c9]">{message}</p><button onClick={retry} className="mt-4 font-mono text-[9px] font-bold uppercase tracking-widest text-[#ef7040]">Retry</button></div>;
}
function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch>
    <Route path="/" component={Shop}/>
    <Route path="/admin-login" component={AdminLogin}/>
    <Route path="/admin" component={Admin}/>
    <Route component={NotFound}/>
  </Switch></ErrorBoundary>;
}
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router/></WouterRouter><Toaster/></TooltipProvider></QueryClientProvider>;
}
export default App;
