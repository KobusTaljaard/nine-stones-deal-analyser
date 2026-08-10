import { useState } from "react";
import DealsList from "./components/DealsList.jsx";
import DealCalculator from "./components/DealCalculator.jsx";

export default function App() {
  const [view, setView] = useState({ screen: "list" });

  if (view.screen === "calculator") {
    return (
      <DealCalculator
        dealId={view.dealId}
        onBack={() => setView({ screen: "list" })}
      />
    );
  }

  return <DealsList onOpen={(dealId) => setView({ screen: "calculator", dealId })} />;
}
