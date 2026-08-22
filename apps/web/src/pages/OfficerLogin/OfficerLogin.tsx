import { GrainGradient } from "@paper-design/shaders-react";
import { useState, useEffect, useId, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../../components/LanguageSwitcher/LanguageSwitcher";
import { Shield, Eye, EyeOff, AlertCircle, ArrowLeft } from "lucide-react";
import styles from "./OfficerLogin.module.css";

type LoginError = 'INVALID_CREDENTIALS' | 'ACCOUNT_UNAVAILABLE' | 'CONNECTION_ERROR' | null;

const ERROR_MESSAGES: Record<NonNullable<LoginError>, { heading: string; body: string }> = {
  INVALID_CREDENTIALS: {
    heading: 'SIGN IN FAILED',
    body: 'The provided credentials could not be verified. Check your Official ID and password.',
  },
  ACCOUNT_UNAVAILABLE: {
    heading: 'ACCESS UNAVAILABLE',
    body: 'This account is currently unavailable. Contact your system administrator.',
  },
  CONNECTION_ERROR: {
    heading: "CONNECTION ERROR",
    body: "We couldn't reach the authentication service. Check your connection and try again.",
  },
};

function OrbitalLinesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let offset = 0;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    // Concentric orbital curves from bottom-right towards top-left
    const arcCount = 16;
    const arcs = Array.from({ length: arcCount }, (_, i) => {
      const baseRadius = 200 + i * 80;
      const speed = 0.05 + (i % 3) * 0.02;
      const isDashed = i % 2 === 0;
      // dash array with randomized segment lengths
      const dashPattern = isDashed ? [100 + (i % 4) * 50, 300 + (i % 3) * 100] : null;
      const opacity = 0.02 + (i % 4) * 0.015; // low opacity, very elegant
      return { baseRadius, speed, isDashed, dashPattern, opacity };
    });

    const draw = () => {
      // Deep dark space background color matching SAKSHAM premium aesthetics
      ctx.fillStyle = "#060807";
      ctx.fillRect(0, 0, width, height);

      // Radial coordinates originating at bottom-right corner
      const originX = width * 1.05;
      const originY = height * 1.05;

      offset += 0.4; // animation motion step

      arcs.forEach((arc) => {
        ctx.beginPath();
        ctx.arc(originX, originY, arc.baseRadius, Math.PI, 1.5 * Math.PI);
        ctx.lineWidth = 1.0;
        ctx.strokeStyle = `rgba(250, 248, 243, ${arc.opacity})`;

        if (arc.isDashed && arc.dashPattern) {
          ctx.setLineDash(arc.dashPattern);
          ctx.lineDashOffset = offset * arc.speed;
        } else {
          ctx.setLineDash([]);
        }

        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}

export default function OfficerLogin() {
  const { t } = useTranslation();
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<LoginError>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  useEffect(() => {
    if (isAuthenticated) {
      const redirect = searchParams.get('redirect');
      navigate(redirect ? decodeURIComponent(redirect) : '/operations', { replace: true });
    }
  }, [isAuthenticated, navigate, searchParams]);

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = 'Enter your authorized SAKSHAM ID or email.';
    else if (!email.includes('@')) errors.email = 'Enter a valid email address.';
    if (!password) errors.password = 'Enter your password to continue.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setLoginError(null);
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.success === true) {
        const redirect = searchParams.get('redirect');
        navigate(redirect ? decodeURIComponent(redirect) : '/operations', { replace: true });
      } else {
        setLoginError(result.error);
      }
    } catch {
      setLoginError('CONNECTION_ERROR');
    } finally {
      setIsSubmitting(false);
    }
  };

  const demoHints = authService.getDemoHints();

  return (
    <div className={styles.page}>
      <OrbitalLinesBackground />
      <div className={styles.grid}>

        {/* ── LEFT: FORM COLUMN ── */}
        <div className={styles.formCol}>
          <div className={styles.formInner}>

            {/* Back link */}
            <Link to="/" className={styles.backLink}>
              <ArrowLeft size={13} />
              <span>Return to SAKSHAM</span>
            </Link>

            {/* Brand */}
            <div className="flex items-center justify-between w-full mb-6">
              <div className={styles.brand}>
                <div className={styles.brandMark}>
                  <Shield size={18} />
                </div>
                <span className={styles.brandName}>{t('common.appName')}</span>
              </div>
              <LanguageSwitcher variant="compact" />
            </div>

            {/* Heading block */}
            <div className={styles.headingBlock}>
              <p className={styles.accessLabel}>AUTHORIZED RESPONSE ACCESS</p>
              <h1 className={styles.heading}>{t('auth.loginTitle')}</h1>
              <p className={styles.subtext}>{t('auth.loginSubtitle')}</p>
            </div>

            {/* Official notice */}
            <div className={styles.notice}>
              <AlertCircle size={14} className={styles.noticeIcon} />
              <span><strong>{t('auth.loginTitle')}</strong> — {t('auth.loginSubtitle')}</span>
            </div>

            {/* Error banner */}
            {loginError && (
              <div role="alert" id={errorId} className={styles.errorBanner}>
                <strong>{ERROR_MESSAGES[loginError].heading}</strong>
                <p>{ERROR_MESSAGES[loginError].body}</p>
              </div>
            )}

            {/* Form */}
            <form className={styles.form} onSubmit={handleSubmit} noValidate aria-describedby={loginError ? errorId : undefined}>

              {/* Email */}
              <div className={styles.fieldGroup}>
                <div className={`${styles.fieldPill} ${fieldErrors.email ? styles.fieldPillError : ''}`}>
                  <input
                    id={emailId}
                    type="email"
                    value={email}
                    placeholder="officer@saksham.demo"
                    disabled={isSubmitting}
                    autoComplete="username email"
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: undefined }));
                      setLoginError(null);
                    }}
                    className={styles.fieldInput}
                  />
                  <span className={styles.fieldLabel}>{t('auth.emailPlaceholder')}</span>
                </div>
                {fieldErrors.email && <span className={styles.fieldError}>{fieldErrors.email}</span>}
              </div>

              {/* Password */}
              <div className={styles.fieldGroup}>
                <div className={`${styles.fieldPill} ${fieldErrors.password ? styles.fieldPillError : ''}`}>
                  <input
                    id={passwordId}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    placeholder="••••••••••••"
                    disabled={isSubmitting}
                    autoComplete="current-password"
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors(p => ({ ...p, password: undefined }));
                      setLoginError(null);
                    }}
                    className={styles.fieldInput}
                  />
                  <span className={styles.fieldLabel}>{t('auth.passwordPlaceholder')}</span>
                  <button
                    type="button"
                    className={styles.togglePw}
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {fieldErrors.password && <span className={styles.fieldError}>{fieldErrors.password}</span>}
              </div>

              {/* Forgot */}
              <div className={styles.forgotRow}>
                <Link to="/officer/forgot-password" className={styles.forgotLink}>{t('auth.forgotPassword')}</Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <><span className={styles.spinner} aria-hidden="true" /> {t('auth.signIn')}…</>
                ) : t('auth.signIn')}
              </button>
            </form>

            {/* Civilian */}
            <div className={styles.civilianRow}>
              <p>{t('auth.loginSubtitle')}</p>
              <Link to="/report" className={styles.civilianLink}>{t('landing.seekRelief')} &rarr;</Link>
            </div>

            {/* Demo panel */}
            {demoHints && (
              <div className={styles.demoPanel}>
                <span className={styles.demoPanelLabel}>DEMO ACCESS</span>
                {demoHints.map((h) => (
                  <button
                    key={h.email}
                    type="button"
                    className={styles.demoBtn}
                    onClick={() => {
                      setEmail(h.email);
                      const pwMap: Record<string, string> = {
                        OPERATOR: 'demo-op-2026',
                        REGIONAL_AUTHORITY: 'demo-auth-2026',
                        ADMIN: 'demo-admin-2026',
                      };
                      setPassword(pwMap[h.role] ?? '');
                      setLoginError(null);
                      setFieldErrors({});
                    }}
                  >
                    <span className={styles.demoRole}>{h.role.replace('_', ' ')}</span>
                    <span className={styles.demoEmail}>{h.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: GRAIN SHADER VISUAL COLUMN ── */}
        <div className={styles.visualCol}>
          <GrainGradient
            speed={0.8}
            scale={1}
            rotation={0}
            offsetX={0}
            offsetY={0}
            softness={0.5}
            intensity={0.55}
            noise={0.22}
            shape="corners"
            frame={2854.5}
            colors={["#FAF8F3", "#F47C20", "#1A2F23", "#F7F4EF"]}
            colorBack="#000000"
            style={{ position: 'absolute', inset: 0 }}
          />
          <div className={styles.visualContent}>
            <h2 className={styles.visualHeading}>
              Think fast,<br />Respond faster.
            </h2>
            <div className={styles.statsRow}>
              <div className={styles.stat}>
                <strong>1,240+</strong>
                <span>Response Officers</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <strong>48</strong>
                <span>Active Zones</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <strong>99.7%</strong>
                <span>System Uptime</span>
              </div>
            </div>
          </div>
        </div>

      </div>
      
      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLeft}>
            <span className={styles.footerSystemName}>SAKSHAM SECURE PORTAL</span>
            <span className={styles.footerDivider}>·</span>
            <span className={styles.footerSecurity}>SSL/TLS 256-BIT ENCRYPTION</span>
          </div>
          <div className={styles.footerCenter}>
            <span className={styles.footerCopyright}>&copy; 2026 SAKSHAM. All rights reserved. Unauthorized access is strictly prohibited and subject to monitoring.</span>
          </div>
          <div className={styles.footerRight}>
            <span className={styles.footerNode}>SYSTEM NODE: DEL_HQ_01</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
