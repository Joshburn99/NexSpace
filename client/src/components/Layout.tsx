import { UnifiedHeader } from "./UnifiedHeader";
import { ProductTour } from "./ProductTour";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background mobile-container">
      <UnifiedHeader />
      <main className="container mx-auto mobile-safe py-4 sm:py-6 lg:py-8">
        <div className="animate-in fade-in duration-500">
          {children}
        </div>
      </main>
      <ProductTour />
    </div>
  );
};

export default Layout;
