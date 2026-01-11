
import { Wallet, Users, Globe, Zap, Shield, Cpu } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Secure Protocol",
    description: "Your personal encrypted vault stays on your device, ensuring complete sovereignty over your identity and assets."
  },
  {
    icon: Cpu,
    title: "P2P Architecture",
    description: "Connect directly with other nodes without intermediaries for a truly decentralized and tamper-proof experience."
  },
  {
    icon: Zap,
    title: "Real-time Sync",
    description: "Optimized WebRTC-powered data exchange for ultra-low latency board state synchronization worldwide."
  }
];

export const Features = () => {
  return (
    <section id="features" className="section bg-background relative">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="container">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
            The <span className="text-gradient">MykoBoard</span> Advantage
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg font-light">
            Engineered for security, privacy, and performance. Peer into the mechanics of the
            most advanced decentralized gaming protocol.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="glass-dark p-10 rounded-3xl animate-fadeIn border border-white/5 hover:border-primary/30 transition-all duration-500 group"
              style={{ animationDelay: `${index * 200}ms` }}
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 bg-primary/10 group-hover:bg-primary/20 transition-colors duration-500 shadow-[0_0_15px_rgba(16,185,129,0.1)] group-hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                <feature.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-primary transition-colors duration-300">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed font-light">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
