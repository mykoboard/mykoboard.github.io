
import { Globe, Wallet, Network, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Hero = () => {
  const navigate = useNavigate();
  return (
    <section className="min-h-screen flex items-center justify-center section bg-background overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-mint-500/10 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-[150px] animate-pulse-glow" style={{ animationDelay: '2s' }} />

      <div className="container relative z-10">
        <div className="text-center space-y-10 animate-fadeIn">
          <div className="inline-flex items-center glass-dark px-4 py-2 rounded-full mb-4 neon-border">
            <Sparkles className="w-4 h-4 text-primary mr-2" />
            <span className="text-sm font-medium tracking-wide text-white/90 uppercase">Decentralized Gaming Protocol</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.1]">
            The Future of <br />
            <span className="text-gradient">Board Gaming</span>
          </h1>

          <p className="text-lg md:text-2xl text-muted-foreground max-w-3xl mx-auto font-light leading-relaxed">
            Connect with players worldwide through <span className="text-white font-medium">secure peer-to-peer</span> gameplay.
            Your wallet, your rules, your ultimate gaming experience.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center mt-12">
            <button
              className="px-10 py-5 bg-primary text-primary-foreground rounded-xl hover:bg-mint-400 transition-all duration-300 font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transform hover:-translate-y-1 active:scale-95"
              onClick={() => navigate("/games")}
            >
              Initialize Console
            </button>
            <button
              className="px-10 py-5 glass-dark text-white rounded-xl hover:bg-white/10 transition-all duration-300 font-bold text-lg border border-white/10"
              onClick={() => {
                const features = document.getElementById('features');
                features?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Explore Protocol
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
