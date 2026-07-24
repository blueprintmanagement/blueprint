import type { Metadata } from "next";
import "./globals.css";
import { AuthGate } from "@/components/auth-gate";
import { AuthProvider } from "@/components/auth-context";
import { DashboardShell } from "@/components/dashboard-shell";
import { ProjectProvider } from "@/components/project-context";

export const metadata: Metadata = {
  title: "Blueprint",
  description: "Gestão financeira e suprimentos para construtoras.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <AuthGate>
            <ProjectProvider>
              <DashboardShell>{children}</DashboardShell>
            </ProjectProvider>
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
