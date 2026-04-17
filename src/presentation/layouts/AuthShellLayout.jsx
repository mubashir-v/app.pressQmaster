export default function AuthShellLayout({ children }) {
  return (
    <div className="relative min-h-screen flex bg-brand-navy">
      {/* Left side: Form container */}
      <div className="flex-1 flex flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24 w-full max-w-xl lg:w-[500px] xl:w-[600px] bg-white  shadow-2xl z-10 shrink-0">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
            {children}
        </div>
      </div>

      {/* Right side: Hero Image Panel */}
      <div className="hidden lg:block relative flex-1 w-full bg-brand-navy">
         <img src="/hero-press.png" alt="CMYK Offset Printing" className="absolute inset-0 h-full w-full object-cover opacity-80" />
         <div className="absolute inset-0 bg-gradient-to-l from-brand-navy via-brand-navy/60 to-brand-navy/10"></div>
         
         {/* Branding text aligned to bottom right */}
         <div className="absolute bottom-16 right-16 text-white text-right max-w-lg">
            
             
             <p className="text-white/60 text-lg">
               Manage quotations, client approvals, and production routing from one seamless workspace.
             </p>
         </div>
      </div>
    </div>
  );
}
