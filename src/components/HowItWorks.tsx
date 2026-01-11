
export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="section bg-background">
      <div className="container">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
            The <span className="text-gradient">Protocol</span> Workflow
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg font-light">
            Initialize your terminal and connect to the global gaming grid in three simple phases.
          </p>
        </div>

        <div className="relative">
          {/* Vertical Timeline Path */}
          <div className="absolute left-1/2 -translate-x-1/2 h-full w-px bg-gradient-to-b from-primary/50 via-primary/10 to-transparent hidden md:block" />

          {[
            {
              step: "01",
              title: "Vault Initialization",
              description: "Generate your secure, hardware-isolated encryption keys. Your identity lives only on your node."
            },
            {
              step: "02",
              title: "Mesh Discovery",
              description: "Broadcast your presence and discover other active nodes through our encrypted P2P discovery layer."
            },
            {
              step: "03",
              title: "Session Launch",
              description: "Instantiate a board game environment and sync states in real-time with zero latency overhead."
            }
          ].map((item, index) => (
            <div
              key={index}
              className="relative grid md:grid-cols-2 gap-12 mb-20 last:mb-0"
              style={{ animationDelay: `${index * 200}ms` }}
            >
              {/* Timeline Indicator Dot */}
              <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary shadow-[0_0_15px_rgba(16,185,129,0.5)] hidden md:block z-20" />

              <div className={`flex flex-col ${index % 2 === 1 ? "md:col-start-2 md:items-start" : "md:items-end md:text-right"}`}>
                <div className="glass-dark p-10 rounded-3xl animate-fadeIn border border-white/5 hover:border-primary/20 transition-all duration-500 w-full md:max-w-md">
                  <div className="text-primary font-black text-3xl mb-4 opacity-50 font-mono tracking-tighter">PHASE_{item.step}</div>
                  <h3 className="text-2xl font-bold mb-4 text-white uppercase tracking-wide">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed font-light">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
