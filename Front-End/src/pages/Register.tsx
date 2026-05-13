import { useState, useEffect } from 'react';
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
import { Cog as Gear, Building2, Mail, Phone, MapPin, CreditCard, ShieldCheck } from 'lucide-react';
import companyLogo from '@/assets/logo.jpg'; // Adjust path if needed

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pin_code: '',
    phone: '',
    email: '',
    gst_no: '',
    pan_no: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const navigate = useNavigate();

  // Fade-in effect
  useEffect(() => {
    setTimeout(() => setIsPageLoaded(true), 100);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'New password and confirm password do not match.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/register/company/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          pin_code: formData.pin_code,
          phone: formData.phone,
          email: formData.email,
          gst_no: formData.gst_no,
          pan_no: formData.pan_no,
          password: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Registration Successful',
          description: 'Your company has been registered successfully.',
        });
        navigate('/login');
      } else {
        toast({
          title: 'Registration Failed',
          description: data.message || 'Something went wrong. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Server Error',
        description: 'Unable to register. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black relative overflow-hidden">
      {/* Background gears */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
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

      {/* Header with logo and company name */}
      <header className="relative z-20 bg-white/90 backdrop-blur-md border-b border-red-100 shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex-shrink-0 transition-transform duration-300 hover:scale-105 hover:drop-shadow-lg">
              <img
                src={companyLogo}
                alt="Comptech Logo"
                className="h-10 sm:h-12 w-auto object-contain"
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
        <div className="w-full max-w-2xl relative z-10">
          <Card className="shadow-2xl bg-white/95 backdrop-blur-sm border border-red-100 rounded-2xl overflow-hidden">
            <CardHeader className="space-y-2 text-center pb-4">
              <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Company Registration
              </CardTitle>
              <CardDescription className="text-gray-600 text-sm sm:text-base">
                Register your company to access the Comptech platform
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* GST Number */}
                  <div className="space-y-2">
                    <Label htmlFor="gst_no" className="text-gray-700 font-medium flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-red-600" />
                      GST Number
                    </Label>
                    <Input
                      id="gst_no"
                      name="gst_no"
                      type="text"
                      placeholder="Enter GST Number"
                      value={formData.gst_no}
                      onChange={handleChange}
                      required
                      className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl transition-all duration-200"
                    />
                  </div>

                  {/* Company Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-700 font-medium flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-red-600" />
                      Company Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Company Name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl"
                    />
                  </div>

                  {/* Address */}
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="address" className="text-gray-700 font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-600" />
                      Address
                    </Label>
                    <Input
                      id="address"
                      name="address"
                      type="text"
                      placeholder="Street Address"
                      value={formData.address}
                      onChange={handleChange}
                      required
                      className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl"
                    />
                  </div>

                  {/* City, State, Country */}
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-gray-700 font-medium">City</Label>
                    <Input
                      id="city"
                      name="city"
                      type="text"
                      placeholder="City"
                      value={formData.city}
                      onChange={handleChange}
                      required
                      className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-gray-700 font-medium">State</Label>
                    <Input
                      id="state"
                      name="state"
                      type="text"
                      placeholder="State"
                      value={formData.state}
                      onChange={handleChange}
                      required
                      className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-gray-700 font-medium">Country</Label>
                    <Input
                      id="country"
                      name="country"
                      type="text"
                      placeholder="Country"
                      value={formData.country}
                      onChange={handleChange}
                      required
                      className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl"
                    />
                  </div>

                  {/* PIN Code, Phone, Email, PAN */}
                  <div className="space-y-2">
                    <Label htmlFor="pin_code" className="text-gray-700 font-medium">PIN Code</Label>
                    <Input
                      id="pin_code"
                      name="pin_code"
                      type="text"
                      placeholder="PIN Code"
                      value={formData.pin_code}
                      onChange={handleChange}
                      required
                      className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-700 font-medium flex items-center gap-2">
                      <Phone className="w-4 h-4 text-red-600" />
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="Phone Number"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-red-600" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Email Address"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pan_no" className="text-gray-700 font-medium flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-red-600" />
                      PAN Number
                    </Label>
                    <Input
                      id="pan_no"
                      name="pan_no"
                      type="text"
                      placeholder="PAN Number"
                      value={formData.pan_no}
                      onChange={handleChange}
                      required
                      className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl"
                    />
                  </div>
                </div>

                {/* Password Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-gray-700 font-medium">New Password</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      placeholder="New Password"
                      value={formData.newPassword}
                      onChange={handleChange}
                      required
                      className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Confirm Password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-2.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
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
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Registering...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        Register Company
                      </>
                    )}
                  </div>
                </Button>

                <div className="text-center text-sm mt-4">
                  <span className="text-gray-600">
                    Already registered?{' '}
                    <Link to="/login" className="text-red-600 hover:text-red-800 font-medium underline underline-offset-4 transition-colors">
                      Login
                    </Link>
                  </span>
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
          animation: spin 12s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Register;