import ChatPanel from "./components/ChatPanel";

export default function App() {
  if (window.location.pathname === "/demo-v2" || window.location.pathname === "/communication-demo") {
    window.location.replace("/");
    return null;
  }

  return (
    <main className="min-h-screen bg-[#eef2f6] text-cedar">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-linen shadow-[0_24px_90px_rgba(15,23,42,0.10)]">
        <ChatPanel />
      </div>
    </main>
  );
}
