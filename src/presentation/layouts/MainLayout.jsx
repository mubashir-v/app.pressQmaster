import Header from "../components/layout/Header.jsx";
import Footer from "../components/layout/Footer.jsx";

export default function MainLayout({ children }) {
  return (
    <div className="relative min-h-dvh flex flex-col bg-white font-sans text-brand-dark overflow-x-hidden">
      {/* Background decorations matching the Finpay aesthetic */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-[-20%] h-[800px] w-[800px] rounded-full bg-brand-mint/40 blur-3xl" />
        <div className="absolute top-[20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-brand-mint/20 blur-3xl" />
      </div>

      <Header />
      
      <main className="relative flex-1">
        {children}
      </main>

      <Footer />
    </div>
  );
}
