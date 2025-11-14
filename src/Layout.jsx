import React from "react";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen w-full">
      <style>{`
        :root {
          --background: 0 0% 100%;
          --foreground: 222.2 84% 4.9%;
        }
        
        .dark {
          --background: 222.2 84% 4.9%;
          --foreground: 210 40% 98%;
        }
      `}</style>
      {children}
    </div>
  );
}