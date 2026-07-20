import type { Metadata } from "next";
import "./globals.css";
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
        <ProjectProvider>
          <DashboardShell>{children}</DashboardShell>
        </ProjectProvider>
      </body>
    </html>
  );
}
