"use client";

import { FormEvent, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  RotateCcw,
  Rows3,
  Send,
  UploadCloud,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/field";
import { useAuth } from "@/components/auth-context";
import { cn } from "@/lib/utils";

type AuthMode = "signin" | "signup" | "forgot";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
}

function PasswordInput({
  autoComplete,
  label,
  minLength = 8,
  onChange,
  value,
}: {
  autoComplete: string;
  label: string;
  minLength?: number;
  onChange: (value: string) => void;
  value: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <FieldLabel label={label}>
      <div className="relative">
        <Input
          autoComplete={autoComplete}
          className="pr-11"
          minLength={minLength}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-blueprint-muted transition hover:bg-blueprint-surface hover:text-blueprint-ink"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </FieldLabel>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const {
    activeOrganizationId,
    createWorkspace,
    isConfigured,
    isLoading,
    isPasswordRecovery,
    memberships,
    resetPassword,
    session,
    signIn,
    signOut,
    signUp,
    updatePassword,
    user,
  } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [password, setPassword] = useState("");

  if (!isConfigured) {
    return children;
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-blueprint-paper px-4">
        <div className="blueprint-panel rounded-lg p-6 text-sm text-blueprint-muted shadow-soft">
          Carregando Blueprint...
        </div>
      </main>
    );
  }

  if (session && activeOrganizationId && memberships.length > 0 && !isPasswordRecovery) {
    return children;
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      if (authMode === "forgot") {
        await resetPassword(email);
        setMessage("Enviamos um link para redefinir sua senha, caso este email esteja cadastrado.");
        return;
      }

      if (authMode === "signup") {
        if (password !== confirmPassword) {
          setError("As senhas não conferem.");
          return;
        }

        const result = await signUp(email, password, fullName);
        setMessage(result);
        return;
      }

      await signIn(email, password);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Não foi possível concluir a ação.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      if (password !== confirmPassword) {
        setError("As senhas não conferem.");
        return;
      }

      await updatePassword(password);
      setPassword("");
      setConfirmPassword("");
      setMessage("Senha atualizada. Você já pode continuar no Blueprint.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Não foi possível atualizar a senha.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      await createWorkspace(organizationName, slugify(organizationName));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Não foi possível criar a empresa.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isForgotMode = authMode === "forgot";
  const isSignupMode = authMode === "signup";

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7fbff]">
      <section className="mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1.05fr_460px] lg:px-8">
        <div className="relative hidden min-h-[calc(100vh-3rem)] overflow-hidden rounded-2xl border border-blueprint-line bg-white p-7 shadow-soft lg:flex lg:flex-col">
          <div className="absolute inset-0 bg-[linear-gradient(#dfeaf4_1px,transparent_1px),linear-gradient(90deg,#dfeaf4_1px,transparent_1px)] bg-[size:28px_28px] opacity-55" />
          <div className="relative z-10">
            <BrandLogo />
            <div className="mt-14 max-w-2xl">
              <span className="blueprint-kicker">Blueprint Management</span>
              <h1 className="mt-4 text-5xl font-semibold leading-tight text-blueprint-ink">
                O financeiro da obra sem a bagunça da planilha.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-blueprint-muted">
                Lance despesas, organize comprovantes e feche o mês com uma rotina mais leve para a dona da obra, contador e investidores.
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-auto grid gap-3">
            {[
              {
                description: "Obra, fase, fornecedor, valor e comprovante entram no mesmo lançamento.",
                icon: Rows3,
                title: "Lançamento ágil",
              },
              {
                description: "Notas fiscais, recibos e pagamentos ficam prontos para revisão do mês.",
                icon: UploadCloud,
                title: "Comprovantes no lugar certo",
              },
              {
                description: "A planilha do dossiê sai do sistema, sem remontar tudo manualmente.",
                icon: Send,
                title: "Fechamento mais direto",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-xl border border-blueprint-line bg-white/90 p-4 shadow-sm"
              >
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blueprint-mist text-blueprint-accent">
                    <item.icon className="h-5 w-5" />
                  </span>
                <div>
                    <h2 className="font-semibold text-blueprint-ink">{item.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-blueprint-muted">{item.description}</p>
                </div>
              </div>
              </article>
            ))}
          </div>
        </div>

        <div className="flex min-h-[calc(100vh-3rem)] items-center">
          <div className="w-full">
            <div className="mb-7 lg:hidden">
              <BrandLogo />
            </div>

            <div className="blueprint-panel rounded-2xl p-5 shadow-lift sm:p-6">
              {isPasswordRecovery ? (
                <>
                  <div>
                    <span className="blueprint-kicker">Nova senha</span>
                    <h2 className="mt-3 text-2xl font-semibold text-blueprint-ink">
                      Defina seu novo acesso
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-blueprint-muted">
                      Escolha uma senha com pelo menos 8 caracteres.
                    </p>
                  </div>

                  <form className="mt-6 space-y-4" onSubmit={submitNewPassword}>
                    <PasswordInput
                      autoComplete="new-password"
                      label="Nova senha"
                      value={password}
                      onChange={setPassword}
                    />
                    <PasswordInput
                      autoComplete="new-password"
                      label="Repetir nova senha"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                    />

                    {error ? <Feedback tone="error">{error}</Feedback> : null}
                    {message ? <Feedback tone="success">{message}</Feedback> : null}

                    <Button className="h-11 w-full" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Salvando..." : "Atualizar senha"}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </form>
                </>
              ) : !session ? (
                <>
                  <div>
                    <span className="blueprint-kicker">
                      {isForgotMode ? "Recuperar acesso" : isSignupMode ? "Novo acesso" : "Entrar"}
                    </span>
                    <h2 className="mt-3 text-2xl font-semibold text-blueprint-ink">
                      {isForgotMode
                        ? "Vamos te mandar um link"
                        : isSignupMode
                          ? "Crie sua conta Blueprint"
                          : "Acesse sua operação"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-blueprint-muted">
                      {isForgotMode
                        ? "Informe o email usado no cadastro para redefinir a senha."
                        : "Entre para continuar o controle financeiro dos seus empreendimentos."}
                    </p>
                  </div>

                  {!isForgotMode ? (
                    <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-blueprint-surface p-1">
                      {[
                        ["signin", "Entrar"],
                        ["signup", "Cadastrar"],
                      ].map(([mode, label]) => (
                        <button
                          key={mode}
                          type="button"
                          className={cn(
                            "h-10 rounded-lg text-sm font-semibold transition",
                            authMode === mode
                              ? "bg-white text-blueprint-ink shadow-sm"
                              : "text-blueprint-muted hover:text-blueprint-ink",
                          )}
                          onClick={() => {
                            setAuthMode(mode as AuthMode);
                            setError("");
                            setMessage("");
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <form className="mt-6 space-y-4" onSubmit={submitAuth}>
                    {isSignupMode ? (
                      <FieldLabel label="Nome">
                        <Input
                          autoComplete="name"
                          value={fullName}
                          onChange={(event) => setFullName(event.target.value)}
                          required
                        />
                      </FieldLabel>
                    ) : null}

                    <FieldLabel label="Email">
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blueprint-muted" />
                        <Input
                          autoComplete="email"
                          className="pl-9"
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          required
                        />
                      </div>
                    </FieldLabel>

                    {!isForgotMode ? (
                      <PasswordInput
                        autoComplete={isSignupMode ? "new-password" : "current-password"}
                        label="Senha"
                        value={password}
                        onChange={setPassword}
                      />
                    ) : null}

                    {isSignupMode ? (
                      <PasswordInput
                        autoComplete="new-password"
                        label="Repetir senha"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                      />
                    ) : null}

                    {authMode === "signin" ? (
                      <button
                        type="button"
                        className="text-sm font-medium text-blueprint-accent transition hover:text-[#075f9c]"
                        onClick={() => {
                          setAuthMode("forgot");
                          setError("");
                          setMessage("");
                        }}
                      >
                        Esqueci minha senha
                      </button>
                    ) : null}

                    {error ? <Feedback tone="error">{error}</Feedback> : null}
                    {message ? <Feedback tone="success">{message}</Feedback> : null}

                    <Button className="h-11 w-full" type="submit" disabled={isSubmitting}>
                      {isSubmitting
                        ? "Processando..."
                        : isForgotMode
                          ? "Enviar link"
                          : isSignupMode
                            ? "Criar conta"
                            : "Entrar"}
                      {isForgotMode ? <RotateCcw className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                    </Button>

                    {isForgotMode ? (
                      <button
                        type="button"
                        className="w-full text-center text-sm font-medium text-blueprint-muted transition hover:text-blueprint-ink"
                        onClick={() => {
                          setAuthMode("signin");
                          setError("");
                          setMessage("");
                        }}
                      >
                        Voltar para login
                      </button>
                    ) : null}
                  </form>
                </>
              ) : (
                <>
                  <div>
                    <span className="blueprint-kicker">Primeira configuração</span>
                    <h2 className="mt-3 text-2xl font-semibold text-blueprint-ink">
                      Qual empresa vai usar o Blueprint?
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-blueprint-muted">
                      Este nome aparece no painel e organiza os empreendimentos, fornecedores e dossiês da sua operação.
                    </p>
                    {user?.email ? (
                      <p className="mt-4 rounded-lg border border-blueprint-line bg-blueprint-surface px-3 py-2 text-xs text-blueprint-muted">
                        Conta conectada: <span className="font-semibold text-blueprint-ink">{user.email}</span>
                      </p>
                    ) : null}
                  </div>

                  <form className="mt-5 space-y-4" onSubmit={submitOrganization}>
                    <FieldLabel label="Nome da empresa ou construtora">
                      <Input
                        autoFocus
                        value={organizationName}
                        onChange={(event) => setOrganizationName(event.target.value)}
                        placeholder="Ex: Mendes Construções"
                        required
                      />
                    </FieldLabel>

                    {error ? <Feedback tone="error">{error}</Feedback> : null}

                    <Button className="h-11 w-full" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Criando empresa..." : "Continuar"}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <button
                      type="button"
                      className="w-full text-center text-sm font-medium text-blueprint-muted transition hover:text-blueprint-ink"
                      onClick={() => void signOut()}
                    >
                      Entrar com outra conta
                    </button>
                  </form>
                </>
              )}
            </div>

            <p className="mt-5 text-center text-xs text-blueprint-muted">
              Blueprint Management · Obras, despesas e dossiês em um só lugar
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function Feedback({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "error" | "success";
}) {
  return (
    <p
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        tone === "error"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800",
      )}
    >
      {children}
    </p>
  );
}
