export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream-soft flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 bg-cream-deep rounded-[32px] flex items-center justify-center mb-10 shadow-leaf border border-hair-soft">
        <span className="text-[32px] font-display font-bold text-forest">!</span>
      </div>
      
      <h1 className="font-display text-[48px] font-semibold text-ink leading-tight tracking-tight mb-4">
        Page not found
      </h1>
      
      <p className="text-[17px] text-ink-muted max-w-md mx-auto leading-relaxed mb-10">
        The payment link you're looking for might be disabled, expired, or typed incorrectly. 
        Please contact the merchant for a new link.
      </p>
      
      <div className="mt-20 pt-10 border-t border-hair-soft w-full max-w-xs opacity-50">
        <p className="text-[12px] font-bold text-ink-faint uppercase tracking-widest">
          Powered by Weave
        </p>
      </div>
    </div>
  );
}
