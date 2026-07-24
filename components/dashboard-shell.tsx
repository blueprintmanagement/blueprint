"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  PackageSearch,
  ReceiptText,
  Truck,
} from "lucide-react";
import { Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useProject } from "@/components/project-context";
import { useAuth } from "@/components/auth-context";
import { BrandLogo } from "@/components/brand-logo";
import { ProjectSelectionPage } from "@/components/project-selection-page";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, helper: "Resumo" },
  { name: "Despesas", href: "/despesas", icon: ReceiptText, helper: "Lançamentos" },
  { name: "Agenda", href: "/agenda", icon: CalendarDays, helper: "Prazos" },
  { name: "Empreendimentos", href: "/obras", icon: Building2, helper: "Selecionar" },
  { name: "Fornecedores", href: "/fornecedores", icon: Truck, helper: "Base" },
  { name: "Catálogo", href: "/catalogo", icon: PackageSearch, helper: "Itens" },
  { name: "Relatórios", href: "/relatorios", icon: FileBarChart2, helper: "Dossiê" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeOrganizationId, memberships, signOut, user } = useAuth();
  const { activeProject, activeProjectId, isCloudMode, isSyncing, projects, setActiveProjectId } = useProject();
  const activeOrganization = memberships.find((membership) => membership.organization_id === activeOrganizationId)?.organizations;

  if (isCloudMode && isSyncing && projects.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-blueprint-paper px-4">
        <div className="blueprint-panel rounded-lg p-6 text-sm text-blueprint-muted shadow-soft">
          Carregando sua empresa...
        </div>
      </main>
    );
  }

  if (isCloudMode && projects.length === 0) {
    return (
      <div className="min-h-screen">
        <aside className="blueprint-rail fixed inset-y-0 left-0 hidden w-72 border-r border-white/70 px-4 py-5 text-blueprint-ink shadow-[12px_0_34px_rgba(6,28,61,0.06)] lg:block">
          <Link
            href="/"
            className="block rounded-lg border border-white/80 bg-white/86 px-3 py-3 shadow-sm transition hover:shadow-soft"
          >
            <BrandLogo />
          </Link>
          {user ? (
            <div className="absolute bottom-5 left-4 right-4 rounded-lg border border-blueprint-line bg-white/82 p-3 shadow-sm">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.06em] text-blueprint-muted">
                {activeOrganization?.name ?? "Organização"}
              </p>
              <p className="mt-1 truncate text-sm font-medium text-blueprint-ink">{user.email}</p>
              <Button type="button" variant="secondary" className="mt-3 h-9 w-full justify-start" onClick={() => void signOut()}>
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          ) : null}
        </aside>

        <div className="lg:pl-72">
          <header className="sticky top-0 z-20 border-b border-blueprint-line bg-white/86 px-4 py-3 backdrop-blur-xl lg:hidden">
            <Link href="/" className="flex items-center gap-2 font-semibold text-blueprint-ink">
              <BrandLogo compact />
              <span className="text-sm font-black tracking-[0.08em]">BLUEPRINT</span>
            </Link>
          </header>
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
            <ProjectSelectionPage />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <aside className="blueprint-rail fixed inset-y-0 left-0 hidden w-72 border-r border-white/70 px-4 py-5 text-blueprint-ink shadow-[12px_0_34px_rgba(6,28,61,0.06)] lg:block">
        <Link
          href="/"
          className="block rounded-lg border border-white/80 bg-white/86 px-3 py-3 shadow-sm transition hover:shadow-soft"
        >
          <BrandLogo />
        </Link>

        <div className="mt-6 rounded-lg border border-blueprint-line bg-white/82 p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-blueprint-muted">
              Empreendimento aberto
            </span>
            <ChevronDown className="h-4 w-4 text-blueprint-muted" />
          </div>
          <Select
            className="mt-2 border-[#c9d8e8] bg-white text-blueprint-ink"
            value={activeProjectId}
            onChange={(event) => setActiveProjectId(event.target.value)}
            aria-label="Selecionar empreendimento ativo"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
          <p className="mt-3 rounded-md bg-blueprint-mist px-3 py-2 text-xs font-medium text-blueprint-ink">
            {activeProject.investor} - {activeProject.status}
          </p>
        </div>

        <nav className="mt-6 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition",
                  isActive
                    ? "bg-blueprint-ink text-white shadow-soft"
                    : "text-blueprint-muted hover:bg-white hover:text-blueprint-ink hover:shadow-sm",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition",
                    isActive ? "bg-white/14 text-white" : "bg-white/70 text-blueprint-accent group-hover:bg-blueprint-mist",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="flex-1 font-medium">{item.name}</span>
                <span className={cn("text-xs", isActive ? "text-white/66" : "text-slate-400")}>
                  {item.helper}
                </span>
              </Link>
            );
          })}
        </nav>

        {user ? (
          <div className="absolute bottom-5 left-4 right-4 rounded-lg border border-blueprint-line bg-white/82 p-3 shadow-sm">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.06em] text-blueprint-muted">
              {activeOrganization?.name ?? "Organização"}
            </p>
            <p className="mt-1 truncate text-sm font-medium text-blueprint-ink">{user.email}</p>
            <Button type="button" variant="secondary" className="mt-3 h-9 w-full justify-start" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        ) : null}
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-blueprint-line bg-white/86 px-4 py-3 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2 font-semibold text-blueprint-ink">
              <BrandLogo compact />
              <span className="text-sm font-black tracking-[0.08em]">BLUEPRINT</span>
            </Link>
            <Select
              className="h-9 max-w-[180px]"
              value={activeProjectId}
              onChange={(event) => setActiveProjectId(event.target.value)}
              aria-label="Selecionar empreendimento ativo"
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
                    ? "bg-blueprint-ink text-white"
                    : "bg-white text-blueprint-muted shadow-sm",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </nav>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          {children}
        </div>
      </div>
    </div>
  );
}
