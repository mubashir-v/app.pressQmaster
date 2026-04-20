import { Link } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout.jsx";

export default function WelcomePage() {
  return (
    <MainLayout>
      <section className="relative w-full h-[calc(100dvh-5rem)] min-h-[600px] flex items-center overflow-hidden">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 w-full h-full">
          <img src="/hero-press.png" alt="CMYK Offset Printing" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-navy via-brand-navy/90 to-brand-navy/20"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-5">
          <div className="max-w-2xl">


            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-[1.1]">
              Quote faster, track jobs easily from prepress to delivery.
            </h1>

            <p className="mt-8 max-w-xl text-white/70 leading-relaxed text-lg sm:text-lg">
              Say goodbye to endless quotation delays. Use printQ Lite CRM to estimate offset jobs, track production, and manage billing effortlessly.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/signup" className="rounded-xl bg-brand-teal px-8 py-4 text-sm font-bold text-white transition-all hover:bg-brand-teal-dark shadow-lg shadow-brand-teal/30 hover:shadow-brand-teal/40">
                Get Started Free
              </Link>
              <Link to="/login" className="rounded-xl px-8 py-4 text-sm font-bold text-white bg-white/10 backdrop-blur-md border border-white/10 transition-all hover:bg-white/20">
                Login to Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-5">
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-teal">Features</span>
          <h2 className="mt-4 text-3xl font-bold text-brand-navy sm:text-4xl">Built for the printing press floor.</h2>
          <p className="mt-4 text-brand-navy/60 max-w-2xl mx-auto">Scale your press output with an organized job tracking framework that completely removes quotation bottlenecks.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-white border border-brand-navy/5 shadow-xl shadow-brand-navy/5">
            <div className="h-12 w-12 rounded-xl bg-brand-mint flex items-center justify-center text-brand-teal mb-6 text-xl">⚡</div>
            <h3 className="text-lg font-bold text-brand-navy mb-2">Instant Quotations</h3>
            <p className="text-sm text-brand-navy/60 leading-relaxed">Calculate complex jobs factoring in paper stock, plates, CMYK impressions, and post-press finishing instantly.</p>
          </div>
          <div className="p-8 rounded-3xl bg-white border border-brand-navy/5 shadow-xl shadow-brand-navy/5">
            <div className="h-12 w-12 rounded-xl bg-brand-mint flex items-center justify-center text-brand-teal mb-6 text-xl">📦</div>
            <h3 className="text-lg font-bold text-brand-navy mb-2">Work Monitoring</h3>
            <p className="text-sm text-brand-navy/60 leading-relaxed">Ensure production managers and machine operators align on job routing from CTP (plates) to delivery.</p>
          </div>
          <div className="p-8 rounded-3xl bg-white border border-brand-navy/5 shadow-xl shadow-brand-navy/5">
            <div className="h-12 w-12 rounded-xl bg-brand-mint flex items-center justify-center text-brand-teal mb-6 text-xl">🧾</div>
            <h3 className="text-lg font-bold text-brand-navy mb-2">Seamless Billing</h3>
            <p className="text-sm text-brand-navy/60 leading-relaxed">Generate invoices and challans directly from approved quotes avoiding repetitive manual data entry.</p>
          </div>
        </div>
      </section>

      <section className="bg-brand-navy text-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-5">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-teal text-white/50">LITE CRM</span>
          <h2 className="mt-4 text-3xl font-bold sm:text-4xl lg:text-5xl max-w-3xl leading-tight">
            Maximize printing efficiency and stop losing quotes to slow responses.
          </h2>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-4xl font-light text-brand-teal/50 mb-4">1</div>
              <h3 className="text-lg font-semibold mb-2">Create Organization</h3>
              <p className="text-sm text-white/60">Set up your press profile, paper costs, and machine capacities.</p>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-4xl font-light text-brand-teal/50 mb-4">2</div>
              <h3 className="text-lg font-semibold mb-2">Quote & Approve</h3>
              <p className="text-sm text-white/60">Send PDF quotes to customers in seconds. Proceed upon approval.</p>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-4xl font-light text-brand-teal/50 mb-4">3</div>
              <h3 className="text-lg font-semibold mb-2">Deliver & Bill</h3>
              <p className="text-sm text-white/60">Log finished items into delivery challans and finalize payments.</p>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
