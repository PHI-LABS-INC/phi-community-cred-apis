interface MainContentProps {
  children: React.ReactNode;
}

export default function MainContent({ children }: MainContentProps) {
  return (
    <main className="flex-1 overflow-hidden mt-[80px] lg:mt-0">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {children}
      </div>
    </main>
  );
}
