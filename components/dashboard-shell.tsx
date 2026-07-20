"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronDown,
  FileBarChart2,
  LayoutDashboard,
  ReceiptText,
  Truck,
} from "lucide-react";
import { Select } from "@/components/ui/field";
import { useProject } from "@/components/project-context";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, helper: "Resumo" },
  { name: "Despesas", href: "/despesas", icon: ReceiptText, helper: "Lançamentos" },
  { name: "Obras", href: "/obras", icon: Building2, helper: "Selecionar" },
  { name: "Fornecedores", href: "/fornecedores", icon: Truck, helper: "Base" },
  { name: "Relatórios", href: "/relatorios", icon: FileBarChart2, helper: "Dossiê" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeProject, activeProjectId, projects, setActiveProjectId } = useProject();

  return (
    <div className="min-h-screen">
      <aside className="blueprint-rail fixed inset-y-0 left-0 hidden w-72 border-r border-[#15365f] px-4 py-5 text-white lg:block">
        <Link href="/" className="block rounded-xl border border-white/10 bg-white px-3 py-3 shadow-sm">
          <BrandLogo />
        </Link>

        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.08] p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-normal text-[#B8D9F2]">
              Obra aberta
            </span>
            <ChevronDown className="h-4 w-4 text-[#B8D9F2]" />
          </div>
          <Select
            className="mt-2 border-white/10 bg-[#08264f] text-white"
            value={activeProjectId}
            onChange={(event) => setActiveProjectId(event.target.value)}
            aria-label="Selecionar obra ativa"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
          <p className="mt-2 text-xs text-[#B8D9F2]">
            {activeProject.investor} - {activeProject.status}
          </p>
        </div>

        <nav className="mt-6 space-y-1.5">
          {navigation.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition",
                  isActive
                    ? "bg-white text-blueprint-ink shadow-sm"
                    : "text-[#D4E7F7] hover:bg-white/10 hover:text-white",
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="flex-1 font-medium">{item.name}</span>
                <span className="text-xs text-slate-400">{item.helper}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-blueprint-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2 font-semibold text-blueprint-ink">
              <BrandLogo compact />
              <span className="text-sm font-black tracking-[0.08em]">BLUEPRINT</span>
            </Link>
            <Select
              className="h-9 max-w-[180px]"
              value={activeProjectId}
              onChange={(event) => setActiveProjectId(event.target.value)}
              aria-label="Selecionar obra ativa"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.shortName}
                </option>
              ))}
            </Select>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium",
                  pathname === item.href
                    ? "bg-blueprint-accent text-white"
                    : "bg-blueprint-surface text-blueprint-muted",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </nav>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
