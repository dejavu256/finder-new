export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return (
      <div className="fixed inset-0 w-full h-full bg-gradient-to-br overflow-hidden">
        {children}
      </div>
    );
  }