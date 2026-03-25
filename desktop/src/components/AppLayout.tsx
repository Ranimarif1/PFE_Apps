import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  showSearch?: boolean;
  onSearch?: (q: string) => void;
}

export function AppLayout({ children, title, showSearch, onSearch }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar title={title} showSearch={showSearch} onSearch={onSearch} />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}