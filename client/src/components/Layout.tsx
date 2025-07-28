import { UnifiedHeader } from "./UnifiedHeader";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <UnifiedHeader />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
