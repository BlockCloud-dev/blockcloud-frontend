import React from "react";
import HeroSection from "../components/ui/HeroSection";

const HomePage: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex flex-1 flex-col">
        <main className="flex-1 overflow-y-auto">
          <HeroSection />
        </main>
      </div>
    </div>
  );
};

export default HomePage;
