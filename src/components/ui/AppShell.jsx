// src/components/ui/AppShell.jsx
import AppHeader from "./AppHeader";
import AppFooter from "./AppFooter";

export default function AppShell({ user, activeTab, setActiveTab, children }) {
  return (
    <div className="h-screen flex flex-col bg-[#fcfaf7]">
      <AppHeader user={user} />

      <main className="flex-1 overflow-y-auto px-4 pb-20 max-w-3xl mx-auto w-full">
        {children}
      </main>

      <AppFooter activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
    </div>
  );
}