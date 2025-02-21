
export const HowItWorks = () => {
  return (
    <section className="section">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Getting started with MyKoBoard is simple and secure
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 -translate-x-1/2 h-full w-px bg-slate-200" />
          
          {[
            {
              step: "01",
              title: "Create Your Wallet",
              description: "Generate your secure, encrypted wallet that stays on your device"
            },
            {
              step: "02",
              title: "Connect with Players",
              description: "Find and connect with other players through our P2P network"
            },
            {
              step: "03",
              title: "Start Gaming",
              description: "Choose your game and start playing in real-time with players worldwide"
            }
          ].map((item, index) => (
            <div 
              key={index}
              className="relative grid md:grid-cols-2 gap-8 mb-16 last:mb-0"
              style={{ animationDelay: `${index * 200}ms` }}
            >
              <div className={`md:text-right ${index % 2 === 1 ? "md:col-start-2" : ""}`}>
                <div className="glass p-8 rounded-2xl animate-fadeIn">
                  <div className="text-mint-500 font-bold mb-2">{item.step}</div>
                  <h3 className="text-xl font-semibold mb-4">{item.title}</h3>
                  <p className="text-slate-600">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
