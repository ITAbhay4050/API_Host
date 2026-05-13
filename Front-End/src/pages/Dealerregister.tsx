import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Cog as Gear, ShieldCheck, Building2, Mail, Phone, MapPin, CreditCard } from 'lucide-react';
import companyLogo from "@/assets/logo.jpg";

interface Company {
  id: number;
  name: string;
}

const DealerRegister = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pin_code: '',
    gst_no: '',
    pan_no: '',
    company: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [tempDealerData, setTempDealerData] = useState<typeof formData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const navigate = useNavigate();

  const [isNameEditable, setIsNameEditable] = useState(true);
  const [isEmailEditable, setIsEmailEditable] = useState(true);
  const [isPanNoEditable, setIsPanNoEditable] = useState(true);

  // Fetch companies
  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/companies/')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCompanies(data);
        } else {
          setCompanies([]);
        }
      })
      .catch(() =>
        toast({
          title: 'Error',
          description: 'Failed to load company list.',
          variant: 'destructive',
        })
      );
  }, []);

  // Fade-in animation
  useEffect(() => {
    setTimeout(() => setIsPageLoaded(true), 100);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });

    if (e.target.name === 'gst_no') {
      setIsNameEditable(true);
      setIsEmailEditable(true);
      setIsPanNoEditable(true);
    }
  };

  const handleGetDealerData = async () => {
    if (!formData.gst_no) {
      toast({
        title: 'Input Required',
        description: 'Please enter a GST number.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/party/get-details-by-gst/?gst_no=${formData.gst_no}`
      );
      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => ({
          ...prev,
          name: data.name || '',
          email: data.email || '',
          pan_no: data.pan_no || '',
        }));
        setIsNameEditable(false);
        setIsEmailEditable(false);
        setIsPanNoEditable(false);

        toast({
          title: 'Success',
          description: 'Dealer data fetched.',
        });
      } else {
        const errorData = await res.json();
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to fetch dealer data.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Network error while fetching dealer data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'Passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const res = await fetch('http://127.0.0.1:8000/api/send-otp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });

      if (res.ok) {
        setTempDealerData(formData);
        setShowOtp(true);
        toast({
          title: 'OTP Sent',
          description: 'Check your email for the OTP.',
        });
      } else {
        toast({
          title: 'Failed',
          description: 'Could not send OTP.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Network Error',
        description: 'Unable to send OTP.',
        variant: 'destructive',
      });
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/verify-otp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tempDealerData?.email, otp }),
      });

      if (res.ok) {
        const registerRes = await fetch('http://127.0.0.1:8000/api/dealers/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...tempDealerData,
            password: tempDealerData?.newPassword,
          }),
        });

        if (registerRes.ok) {
          toast({
            title: 'Success',
            description: 'Dealer registered successfully!',
          });
          setTimeout(() => navigate('/login'), 2000);
        } else {
          const errorData = await registerRes.json();
          const errorMessage = errorData.detail || errorData.email || 'Dealer registration failed.';
          toast({
            title: 'Error',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      } else {
        const errorData = await res.json();
        const errorMessage = errorData.detail || 'OTP verification failed.';
        toast({
          title: 'Invalid OTP',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to verify OTP or network error during registration.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black relative overflow-hidden">
      {/* Background gears */}
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

      {/* Header with logo */}
      <header className="relative z-20 bg-white/90 backdrop-blur-md border-b border-red-100 shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex-shrink-0 transition-transform duration-300 hover:scale-105 hover:drop-shadow-lg">
              <img
                src={companyLogo}
                alt="Comptech Logo"
                className="h-10 sm:h-12 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
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

      {/* Main content with fade-in */}
      <div
        className={`flex-1 flex items-center justify-center px-4 py-8 sm:py-12 transition-all duration-700 ${
          isPageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="w-full max-w-3xl relative z-10">
          <Card className="shadow-2xl bg-white/95 backdrop-blur-sm border border-red-100 rounded-2xl overflow-hidden">
            <CardHeader className="space-y-2 text-center pb-4">
              <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Dealer Registration
              </CardTitle>
              <CardDescription className="text-gray-600 text-sm sm:text-base">
                Join Comptech as a dealer and access our services
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* GST section */}
                <div className="space-y-2">
                  <Label htmlFor="gst_no" className="text-gray-700 font-medium flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-red-600" />
                    GST Number
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      id="gst_no"
                      name="gst_no"
                      type="text"
                      value={formData.gst_no}
                      onChange={handleChange}
                      placeholder="Enter GST Number"
                      className="flex-1 bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl transition-all duration-200"
                      required
                    />
                    <Button
                      type="button"
                      onClick={handleGetDealerData}
                      disabled={!formData.gst_no || isLoading}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
                    >
                      {isLoading ? 'Fetching...' : 'Get Data'}
                    </Button>
                  </div>
                </div>

                {/* Main form fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-700 font-medium flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-red-600" />
                      Dealer Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      readOnly={!isNameEditable}
                      className={`bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl transition-all duration-200 ${!isNameEditable ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-red-600" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      readOnly={!isEmailEditable}
                      className={`bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl transition-all duration-200 ${!isEmailEditable ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      required
                    />
                  </div>

                  {/* PAN */}
                  <div className="space-y-2">
                    <Label htmlFor="pan_no" className="text-gray-700 font-medium flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-red-600" />
                      PAN Number
                    </Label>
                    <Input
                      id="pan_no"
                      name="pan_no"
                      type="text"
                      value={formData.pan_no}
                      onChange={handleChange}
                      readOnly={!isPanNoEditable}
                      className={`bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl transition-all duration-200 ${!isPanNoEditable ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-700 font-medium flex items-center gap-2">
                      <Phone className="w-4 h-4 text-red-600" />
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="text"
                      value={formData.phone}
                      onChange={handleChange}
                      className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl"
                      required
                    />
                  </div>

                  {/* Address */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address" className="text-gray-700 font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-600" />
                      Address
                    </Label>
                    <Input
                      id="address"
                      name="address"
                      type="text"
                      value={formData.address}
                      onChange={handleChange}
                      className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl"
                      required
                    />
                  </div>

                  {/* City, State, Country, Pin Code */}
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      type="text"
                      value={formData.city}
                      onChange={handleChange}
                      className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      name="state"
                      type="text"
                      value={formData.state}
                      onChange={handleChange}
                      className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      name="country"
                      type="text"
                      value={formData.country}
                      onChange={handleChange}
                      className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pin_code">Pin Code</Label>
                    <Input
                      id="pin_code"
                      name="pin_code"
                      type="text"
                      value={formData.pin_code}
                      onChange={handleChange}
                      className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl"
                      required
                    />
                  </div>

                  {/* Company selection */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="company" className="text-gray-700 font-medium flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-red-600" />
                      Select Company
                    </Label>
                    <select
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full border rounded-xl p-2 h-10 bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 transition-all duration-200"
                      required
                    >
                      <option value="">-- Select Company --</option>
                      {companies.map((comp) => (
                        <option key={comp.id} value={comp.id}>
                          {comp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Password fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={handleChange}
                      className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl"
                      required
                    />
                  </div>
                </div>

                {/* OTP section */}
                {!showOtp ? (
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-2.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <ShieldCheck className="w-5 h-5" />
                      Send OTP
                    </div>
                  </Button>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="otp">Enter OTP</Label>
                      <Input
                        id="otp"
                        name="otp"
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter OTP sent to your email"
                        className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl"
                        required
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleVerifyOtp}
                      className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-2.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    >
                      Verify & Register
                    </Button>
                  </>
                )}

                <div className="text-center text-sm mt-4">
                  Already registered?{' '}
                  <Link to="/login" className="text-red-600 hover:text-red-800 font-medium underline underline-offset-4 transition-colors">
                    Login
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-gray-500 bg-white/50 backdrop-blur-sm">
        <p>© {new Date().getFullYear()} Comptech. All rights reserved.</p>
      </footer>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .gear-animation {
          animation: spin 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default DealerRegister;