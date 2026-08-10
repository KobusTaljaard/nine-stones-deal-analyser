import { useState } from "react";
import DealsList from "./components/DealsList.jsx";
import DealCalculator from "./components/DealCalculator.jsx";

export default function App() {
  const [view, setView] = useState({ screen: "list", key: 0 });

  if (view.screen === "calculator") {
    return (
      <DealCalculator
        dealId={view.dealId}
        onBack={() => setView({ screen: "list", key: Date.now() })}
        onDeleted={() => setView({ screen: "list", key: Date.now() })}
      />
    );
  }

  return <DealsList key={view.key} onOpen={(dealId) => setView({ screen: "calculator", dealId })} />;
}
