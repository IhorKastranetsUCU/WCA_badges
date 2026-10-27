import React, { useState, useEffect } from "react";
import {
  X,
  Mail,
  Lock,
  User,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Send,
} from "lucide-react";
import { getApiUrl } from "@/api/config";
import { WCAProfile, WCACompetition } from "@/types/wca";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "register" | "login";
  onLoginSuccess: (token: string, profile: WCAProfile, competitions: WCACompetition[]) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = "register",
  onLoginSuccess,
}) => {
  const [tab, setTab] = useState<"register" | "login">(initialTab);
  const [isVerifyStep, setIsVerifyStep] = useState<boolean>(false);

  // Form fields
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState<string>("");

  // Feedback states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setIsVerifyStep(false);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, initialTab]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername || cleanUsername.length < 2) {
      setError("Логін повинен містити щонайменше 2 символи.");
      return;
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Вкажіть дійсну адресу електронної пошти.");
      return;
    }
    if (password.length < 8) {
      setError("Пароль повинен містити щонайменше 8 символів.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Паролі не збігаються. Перевірте введені дані.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUsername,
          email: cleanEmail,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.detail || "Не вдалося створити обліковий запис.");
      }

      setSuccess(
        data.message ||
          `Лист із 6-значним кодом підтвердження надіслано на ${cleanEmail}. Перевірте пошту.`
      );
      setIsVerifyStep(true);
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || "Помилка під час реєстрації.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = verificationCode.trim();

    if (!cleanCode || cleanCode.length < 4) {
      setError("Введіть правильний код підтвердження з листа.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/auth/confirm"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          code: cleanCode,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.detail || "Невірний код підтвердження.");
      }

      setSuccess("Електронну пошту успішно підтверджено! Виконуємо вхід...");

      // Automatically log in with the confirmed password
      if (password) {
        try {
          const loginRes = await fetch(getApiUrl("/api/auth/login-password"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: cleanEmail, password }),
          });
          const loginData = await loginRes.json();
          if (loginRes.ok && loginData.access_token && loginData.profile) {
            const cognitoProfile: WCAProfile = {
              ...loginData.profile,
              auth_provider: loginData.profile.auth_provider || "cognito",
            };
            onLoginSuccess(
              loginData.access_token,
              cognitoProfile,
              loginData.competitions || []
            );
            onClose();
            return;
          }
        } catch {
          // Fall back to login tab
        }
      }

      setIsVerifyStep(false);
      setTab("login");
      setSuccess("Обліковий запис активовано! Тепер увійдіть зі своїм паролем.");
    } catch (err: any) {
      setError(err.message || "Помилка підтвердження коду.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Вкажіть адресу електронної пошти.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/auth/resend-code"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "Не вдалося надіслати код повторно.");
      }

      setSuccess(`Новий код підтвердження надіслано на ${cleanEmail}.`);
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || "Помилка повторного надсилання коду.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Введіть адресу електронної пошти.");
      return;
    }
    if (!password) {
      setError("Введіть пароль.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/auth/login-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 403 && data.detail?.includes("не підтверджено")) {
          // User exists but unconfirmed: switch to verify step
          setIsVerifyStep(true);
          setTab("register");
          throw new Error(data.detail);
        }
        throw new Error(data.detail || "Невірний email або пароль.");
      }

      if (data.access_token && data.profile) {
        const cognitoProfile: WCAProfile = {
          ...data.profile,
          auth_provider: data.profile.auth_provider || "cognito",
        };
        onLoginSuccess(
          data.access_token,
          cognitoProfile,
          data.competitions || []
        );
        onClose();
      } else {
        throw new Error("Некоректна відповідь сервера авторизації.");
      }
    } catch (err: any) {
      setError(err.message || "Помилка входу.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                {isVerifyStep
                  ? "Підтвердження пошти"
                  : tab === "register"
                  ? "Реєстрація акаунту"
                  : "Вхід до системи"}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isVerifyStep
                  ? "Введіть 6-значний код із листа"
                  : tab === "register"
                  ? "Створіть акаунт за логіном, імейлом і паролем"
                  : "Увійдіть зі своїм імейлом та паролем"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher (only when not in verify step) */}
        {!isVerifyStep && (
          <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setTab("register");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                tab === "register"
                  ? "bg-white text-blue-600 shadow-xs border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Реєстрація
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                tab === "login"
                  ? "bg-white text-blue-600 shadow-xs border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Вхід за паролем
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6">
          {/* Alerts */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div className="flex-1 font-medium">{success}</div>
            </div>
          )}

          {/* 1. Verification Step */}
          {isVerifyStep ? (
            <form onSubmit={handleConfirmCode} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/60 text-xs text-blue-900 leading-relaxed">
                <span className="font-bold">Лист відправлено!</span> Ми надіслали 6-значний код підтвердження на{" "}
                <span className="font-mono font-bold text-blue-700">{email}</span>. Введіть його для активації вашого акаунту.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Код підтвердження
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Наприклад: 123456"
                    className="w-full pl-10 pr-4 py-2.5 text-sm font-mono tracking-widest text-center font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Перевірка...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Підтвердити реєстрацію</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isLoading || resendCooldown > 0}
                  className="text-blue-600 hover:text-blue-800 font-semibold disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  {resendCooldown > 0
                    ? `Повторний код (${resendCooldown}с)`
                    : "Надіслати код знову"}
                </button>

                <button
                  type="button"
                  onClick={() => setIsVerifyStep(false)}
                  className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Змінити email
                </button>
              </div>
            </form>
          ) : tab === "register" ? (
            /* 2. Registration Form */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Логін (ім'я користувача)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ваш логін або ім'я"
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Електронна пошта (Email)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@ucu.edu.ua"
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Мінімум 8 символів (цифри + літери)"
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Підтвердження пароля
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Повторіть пароль"
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Створення акаунту...</span>
                  </>
                ) : (
                  <>
                    <span>Зареєструватися</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* 3. Login Form */
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Електронна пошта (Email)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@ucu.edu.ua"
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ваш пароль"
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Авторизація...</span>
                  </>
                ) : (
                  <>
                    <span>Увійти</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer note */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Захищено AWS Cognito</span>
            <a
              href="/login/"
              className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
            >
              Cognito Hosted UI
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
