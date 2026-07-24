"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import {
  createOrganization,
  fetchUserOrganizations,
  OrganizationMembershipRow,
} from "@/lib/services/organization-service";

type AuthContextValue = {
  activeOrganizationId: string | null;
  createWorkspace: (name: string, slug: string) => Promise<void>;
  isConfigured: boolean;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  memberships: OrganizationMembershipRow[];
  refreshOrganizations: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  session: Session | null;
  setActiveOrganizationId: (organizationId: string) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<string>;
  updatePassword: (password: string) => Promise<void>;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [memberships, setMemberships] = useState<OrganizationMembershipRow[]>([]);
  const [session, setSession] = useState<Session | null>(null);

  const user = session?.user ?? null;

  async function refreshOrganizations() {
    if (!session) {
      setMemberships([]);
      setActiveOrganizationIdState(null);
      return;
    }

    const nextMemberships = await fetchUserOrganizations();
    setMemberships(nextMemberships);
    setActiveOrganizationIdState((current) => {
      if (current && nextMemberships.some((membership) => membership.organization_id === current)) {
        return current;
      }

      return nextMemberships[0]?.organization_id ?? null;
    });
  }

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }

      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setMemberships([]);
      setActiveOrganizationIdState(null);
      return;
    }

    void refreshOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  useEffect(() => {
    const savedOrganizationId = window.localStorage.getItem("blueprint.activeOrganizationId");

    if (savedOrganizationId) {
      setActiveOrganizationIdState(savedOrganizationId);
    }
  }, []);

  useEffect(() => {
    if (activeOrganizationId) {
      window.localStorage.setItem("blueprint.activeOrganizationId", activeOrganizationId);
    }
  }, [activeOrganizationId]);

  async function signIn(email: string, password: string) {
    if (!supabase) {
      throw new Error("Supabase não configurado.");
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      throw error;
    }
  }
  async function resetPassword(email: string) {
    if (!supabase) {
      throw new Error("Supabase nÃ£o configurado.");
    }

    const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error) {
      throw error;
    }
  }

  async function updatePassword(password: string) {
    if (!supabase) {
      throw new Error("Supabase nÃ£o configurado.");
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      throw error;
    }

    setIsPasswordRecovery(false);
  }

  async function signUp(email: string, password: string, fullName: string) {
    if (!supabase) {
      throw new Error("Supabase não configurado.");
    }

    const normalizedEmail = email.trim();
    const normalizedFullName = fullName.trim();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: normalizedFullName,
        },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("email rate limit")) {
        const response = await fetch("/api/dev-signup", {
          body: JSON.stringify({
            email: normalizedEmail,
            fullName: normalizedFullName,
            password,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        if (response.ok) {
          await signIn(normalizedEmail, password);
          return "Conta criada e sessão iniciada.";
        }
      }

      throw error;
    }

    return data.session
      ? "Conta criada e sessão iniciada."
      : "Conta criada. Confira seu email para confirmar o acesso antes de entrar.";
  }
  async function signOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setIsPasswordRecovery(false);
    setSession(null);
    setMemberships([]);
    setActiveOrganizationIdState(null);
  }

  async function createWorkspace(name: string, slug: string) {
    const normalizedName = name.trim();
    const normalizedSlug = slugify(slug || name);

    if (!normalizedName || !normalizedSlug) {
      throw new Error("Informe o nome da empresa.");
    }

    let organizationId = "";
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const candidateSlug = attempt === 1 ? normalizedSlug : `${normalizedSlug}-${attempt}`;

      try {
        organizationId = await createOrganization(normalizedName, candidateSlug);
        lastError = null;
        break;
      } catch (caughtError) {
        lastError = caughtError;
      }
    }

    if (!organizationId) {
      throw lastError instanceof Error
        ? lastError
        : new Error("NÃ£o foi possÃ­vel criar a empresa agora.");
    }

    await refreshOrganizations();
    setActiveOrganizationIdState(organizationId);
  }

  const value: AuthContextValue = {
    activeOrganizationId,
    createWorkspace,
    isConfigured: isSupabaseConfigured,
    isLoading,
    isPasswordRecovery,
    memberships,
    refreshOrganizations,
    resetPassword,
    session,
    setActiveOrganizationId: setActiveOrganizationIdState,
    signIn,
    signOut,
    signUp,
    updatePassword,
    user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}
