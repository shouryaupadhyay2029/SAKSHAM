import { GrainGradient } from "@paper-design/shaders-react";
import { useState, useEffect, useId } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
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

export default function OfficerLogin() {
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
      if (result.success) {
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
            <div className={styles.brand}>
              <div className={styles.brandMark}>
                <Shield size={18} />
              </div>
              <span className={styles.brandName}>SAKSHAM</span>
            </div>

            {/* Heading block */}
            <div className={styles.headingBlock}>
              <p className={styles.accessLabel}>AUTHORIZED RESPONSE ACCESS</p>
              <h1 className={styles.heading}>Officer Sign In</h1>
              <p className={styles.subtext}>Sign in to access the SAKSHAM operational network.</p>
            </div>

            {/* Official notice */}
            <div className={styles.notice}>
              <AlertCircle size={14} className={styles.noticeIcon} />
              <span><strong>OFFICIAL ACCESS ONLY</strong> — This portal is intended for authorized emergency-response personnel.</span>
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
                  <span className={styles.fieldLabel}>Official ID / Email</span>
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
                  <span className={styles.fieldLabel}>Password</span>
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
                <Link to="/officer/forgot-password" className={styles.forgotLink}>Forgot password?</Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <><span className={styles.spinner} aria-hidden="true" /> SIGNING IN…</>
                ) : 'SIGN IN'}
              </button>
            </form>

            {/* Civilian */}
            <div className={styles.civilianRow}>
              <p>Civilian? You do not need an account to request emergency assistance.</p>
              <Link to="/report" className={styles.civilianLink}>Get Emergency Help &rarr;</Link>
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
    </div>
  );
}
