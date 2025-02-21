
import { Wallet, Users, Globe } from "lucide-react";

const features = [
  {
    icon: Wallet,
    title: "Secure Wallet",
    description: "Your personal encrypted wallet stays on your device, ensuring complete control over your gaming assets."
  },
  {
    icon: Users,
    title: "Peer-to-Peer Gaming",
    description: "Connect directly with other players without intermediaries for a truly decentralized gaming experience."
  },
  {
    icon: Globe,
    title: "Global Connection",
    description: "Play with anyone, anywhere in the world through our WebRTC-powered real-time connection system."
  }
];

export const Features = () => {
  return (
    <section className="section bg-slate-50">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Choose MyKoBoard?
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Experience the next generation of online board gaming with cutting-edge technology
            and unparalleled security.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="glass p-8 rounded-2xl animate-fadeIn"
              style={{ animationDelay: `${index * 200}ms` }}
            >
              <div className="bg-mint-100 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                <feature.icon className="w-6 h-6 text-mint-500" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{feature.title}</h3>
              <p className="text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
