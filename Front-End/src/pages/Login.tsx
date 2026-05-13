import {
  useState,
  useEffect,
  FormEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Cog as Gear, Wrench, Cpu, ShieldCheck } from "lucide-react";

// Import company logo (adjust the import path to match your project structure)
// The logo file should be placed in: src/media/Logo.jpg or public/media/Logo.jpg
import companyLogo from "@/assets/logo.jpg";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  const { login } = useAuth();      // <-- AuthContext now posts to /api/login/ for all roles
  const navigate = useNavigate();

  /* ---------- rotating gear animation (500 RPM) with red theme ---------- */
  useEffect(() => {
    const gears = document.querySelectorAll(".gear-animation");
    let af: number;

    const spin = (t: number) => {
      const rot = (t / 120) % 360;
      gears.forEach((g, i) => {
        const dir = i % 2 === 0 ? 1 : -1;
        (g as HTMLElement).style.transform = `rotate(${rot * dir}deg)`;
      });
      af = requestAnimationFrame(spin);
    };
    af = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(af);
  }, []);

  /* ---------- fade-in animation on page load ---------- */
  useEffect(() => {
    // Small delay to trigger fade-in effect
    setTimeout(() => setIsPageLoaded(true), 100);
  }, []);

  /* ---------- helpers ---------- */
  const showToast = (
    title: string,
    description: string,
    variant: "destructive" | "default" = "default",
  ) => toast({ title, description, variant });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast(
        "Validation Error",
        "Please enter both email and password.",
        "destructive",
      );
      return;
    }

    setIsSubmitting(true);
    const ok = await login(email, password);
    setIsSubmitting(false);

    if (ok) {
      showToast("Login Successful", "Welcome back!");
      navigate("/dashboard");
    } else {
      showToast("Login Failed", "Invalid credentials", "destructive");
    }
  };

  /* ---------- quick‑fill demo creds ---------- */
  const fillCredentials = (preset: string) => {
    switch (preset) {
      case "admin":
        setEmail("admin@system.com");
        setPassword("password");
        break;
      case "company_admin":
        setEmail("admin@company.com");
        setPassword("password");
        break;
      case "company_employee":
        setEmail("employee@company.com");
        setPassword("password");
        break;
      case "dealer_admin":
        setEmail("admin@dealer.com");
        setPassword("password");
        break;
      case "dealer_employee":
        setEmail("employee@dealer.com");
        setPassword("password");
        break;
    }
  };

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen flex flex-col bg-black relative overflow-hidden">
      {/* background gears with red tones */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 w-80 h-80">
          <Gear className="w-full h-full text-red-500/10 gear-animation origin-center" />
        </div>
        <div className="absolute -right-40 -bottom-40 w-96 h-96">
          <Gear className="w-full h-full text-red-700/10 gear-animation origin-center" />
        </div>
        <div className="absolute right-1/4 top-1/3 w-64 h-64">
          <Gear className="w-full h-full text-red-600/10 gear-animation origin-center" />
        </div>
      </div>

      {/* Modern Header with Logo and Company Name */}
      <header className="relative z-20 bg-white/90 backdrop-blur-md border-b border-red-100 shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Logo with hover effect */}
            <div className="flex-shrink-0 transition-transform duration-300 hover:scale-105 hover:drop-shadow-lg">
              <img
                src={companyLogo}
                alt="Comptech Logo"
                className="h-10 sm:h-12 w-auto object-contain"
                onError={(e) => {
                  // Fallback if logo fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            
            {/* Company Name and Tagline */}
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
                COMPTECH
              </h1>
              <p className="text-xs sm:text-sm text-red-600 font-medium">
                Shaping a better future
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Fade-in */}
      <div
        className={`flex-1 flex items-center justify-center px-4 py-8 sm:py-12 transition-all duration-700 ${
          isPageLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="w-full max-w-md relative z-10">
          <Card className="shadow-2xl bg-white/95 backdrop-blur-sm border border-red-100 rounded-2xl overflow-hidden">
            <CardHeader className="space-y-3 text-center pb-6">
              {/* Simple header without duplicate logo */}
              <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-gray-600 text-sm sm:text-base">
                Sign in to access your service portal
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* email field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-red-600"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@comptech.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-red-500 focus:ring-red-500 rounded-xl transition-all duration-200"
                  />
                </div>

                {/* password field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-red-600"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-red-500 focus:ring-red-500 rounded-xl transition-all duration-200"
                  />
                </div>

                {/* submit button - red theme */}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  disabled={isSubmitting}
                >
                  <div className="flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Authenticating...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        Sign In
                      </>
                    )}
                  </div>
                </Button>
              </form>

              {/* links - red accent */}
              <div className="mt-6 text-center text-sm space-y-2">
                <p className="text-gray-600">
                  Don&apos;t have an account?{" "}
                  <Link
                    to="/dealerregister"
                    className="text-red-600 hover:text-red-800 font-medium underline underline-offset-4 transition-colors"
                  >
                    Register
                  </Link>
                </p>
                <p className="text-gray-600">
                  Create Company?{" "}
                  <Link
                    to="/register"
                    className="text-red-600 hover:text-red-800 font-medium underline underline-offset-4 transition-colors"
                  >
                    Create Company
                  </Link>
                </p>
              </div>

              {/* demo buttons - refined red/white theme */}
              <div className="border-t border-red-100 pt-6 mt-6">
                <p className="text-center text-sm text-gray-600 mb-4">
                  Demo Accounts (click to autofill):
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    ["System Admin", "admin", "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200"],
                    ["Company Admin", "company_admin", "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"],
                    ["Company Employee", "company_employee", "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"],
                    ["Dealer Admin", "dealer_admin", "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"],
                    ["Dealer Employee", "dealer_employee", "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"],
                  ].map(([label, key, cls]) => (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => fillCredentials(key as string)}
                      className={`${cls} border rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 hover:scale-105`}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Simple footer (optional) */}
      <footer className="relative z-10 py-4 text-center text-xs text-gray-500 bg-white/50 backdrop-blur-sm">
        <p>© {new Date().getFullYear()} Comptech. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Login;