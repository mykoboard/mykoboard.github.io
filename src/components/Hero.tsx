
import { Globe, Wallet, Network } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Hero = () => {
  const navigate = useNavigate();
  return (
    <section className="min-h-screen flex items-center justify-center section">
      <div className="container">
        <div className="text-center space-y-8 animate-fadeIn">
          <div className="inline-flex items-center glass px-4 py-2 rounded-full mb-8">
            <Network className="w-4 h-4 text-mint-500 mr-2" />
            <span className="text-sm font-medium">Decentralized Gaming Platform</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            The Future of <span className="text-mint-500">Board Gaming</span> is Here
          </h1>

          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
            Connect with players worldwide through secure peer-to-peer gameplay.
            Your wallet, your rules, your gaming experience.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <button className="px-8 py-4 bg-mint-500 text-white rounded-lg hover:bg-mint-600 transition-colors font-bold shadow-lg shadow-mint-500/20" onClick={() => navigate("/games")}>
              Lets get started
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
