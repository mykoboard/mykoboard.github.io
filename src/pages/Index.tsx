import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Hero } from "../components/Hero";
import { Features } from "../components/Features";
import { HowItWorks } from "../components/HowItWorks";
import { SecureWallet } from "../lib/wallet";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkIdentity = async () => {
      const wallet = SecureWallet.getInstance();
      const hasId = await wallet.hasIdentity();
      if (hasId) {
        navigate("/games", { replace: true });
      }
    };
    checkIdentity();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <Features />
      <HowItWorks />
    </div>
  );
};

export default Index;
