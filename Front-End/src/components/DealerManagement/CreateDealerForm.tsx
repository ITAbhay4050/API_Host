import { useState } from "react";
import axios from "axios";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

import { Dealer, User, UserRole, UserStatus } from "@/types";

interface CreateDealerFormProps {
  onDealerCreated?: (dealer: Dealer, adminUser: User) => void;
  onCancel: () => void;
  companies: Array<{ id: string; name: string }>;
}

const CreateDealerForm = ({
  onDealerCreated,
  onCancel,
  companies,
}: CreateDealerFormProps) => {
  const { user } = useAuth();

  /* ---------------- local state ---------------- */
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    country: "",
    pinCode: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    gstNumber: "",
    panNumber: "",
    companyId: user?.companyId || "",
    password: "",
    confirmPassword: "",
    isDirect: true,
  });

  /* ---------------- handlers ---------------- */
  const handleChange =
    (field: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormData({ ...formData, [field]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    /* front‑end validation */
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    const required: Array<[keyof typeof formData, string]> = [
      ["name", "Dealer Name"],
      ["address", "Address"],
      ["city", "City"],
      ["state", "State"],
      ["country", "Country"],
      ["pinCode", "PIN Code"],
      ["contactPerson", "Contact Person"],
      ["contactEmail", "Email"],
      ["contactPhone", "Phone"],
      ["gstNumber", "GST Number"],
      ["panNumber", "PAN Number"],
      ["companyId", "Company"],
      ["password", "Password"],
    ];
    const miss = required.find(([k]) => !formData[k]);
    if (miss) {
      toast({
        title: "Error",
        description: `${miss[1]} is required`,
        variant: "destructive",
      });
      return;
    }

    /* payload to backend */
    const payload = {
      company: formData.companyId,
      name: formData.name,
      email: formData.contactEmail,
      phone: formData.contactPhone,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      country: formData.country,
      pin_code: formData.pinCode,
      gst_no: formData.gstNumber,
      pan_no: formData.panNumber,
      password: formData.password,
      isDirect: true,
    };

    try {
      setSubmitting(true);
      const res = await axios.post("http://127.0.0.1:8000/api/dealers/", payload);

      toast({ title: "Success", description: "Dealer created successfully" });

      /* optional callback */
      if (onDealerCreated) {
        const dealer: Dealer = { ...res.data, status: UserStatus.ACTIVE } as Dealer;
        const adminUser: User = {
          id: "",
          name: formData.contactPerson,
          email: formData.contactEmail,
          phone: formData.contactPhone,
          username: formData.contactEmail, // email acts as username
          role: UserRole.DEALER_ADMIN,
          status: UserStatus.ACTIVE,
          companyId: formData.companyId,
          dealerId: res.data.id,
          createdAt: new Date().toISOString(),
        };
        onDealerCreated(dealer, adminUser);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Server error.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- UI ---------------- */
  const filteredCompanies =
    user?.role === UserRole.COMPANY_ADMIN && user.companyId
      ? companies.filter((c) => c.id === user.companyId)
      : companies;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* dealer + gst */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Dealer Name *</Label>
          <Input required value={formData.name} onChange={handleChange("name")} />
        </div>
        <div>
          <Label>GST Number *</Label>
          <Input required value={formData.gstNumber} onChange={handleChange("gstNumber")} />
        </div>
      </div>

      {/* address */}
      <Label>Address *</Label>
      <Input required value={formData.address} onChange={handleChange("address")} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>City *</Label>
          <Input required value={formData.city} onChange={handleChange("city")} />
        </div>
        <div>
          <Label>State *</Label>
          <Input required value={formData.state} onChange={handleChange("state")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Country *</Label>
          <Input required value={formData.country} onChange={handleChange("country")} />
        </div>
        <div>
          <Label>PIN Code *</Label>
          <Input required value={formData.pinCode} onChange={handleChange("pinCode")} />
        </div>
      </div>

      {/* contact */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Contact Person *</Label>
          <Input required value={formData.contactPerson} onChange={handleChange("contactPerson")} />
        </div>
        <div>
          <Label>Phone *</Label>
          <Input required value={formData.contactPhone} onChange={handleChange("contactPhone")} />
        </div>
      </div>

      <Label>Email (login) *</Label>
      <Input
        type="email"
        required
        value={formData.contactEmail}
        onChange={handleChange("contactEmail")}
      />

      <Label>PAN Number *</Label>
      <Input required value={formData.panNumber} onChange={handleChange("panNumber")} />

      {/* company */}
      {user?.role === UserRole.APPLICATION_ADMIN ? (
        <>
          <Label>Company *</Label>
          <Select
            value={formData.companyId}
            onValueChange={(v) => setFormData({ ...formData, companyId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {filteredCompanies.find((c) => c.id === formData.companyId)?.name ||
            "No company selected"}
        </p>
      )}

      {/* passwords */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Password *</Label>
          <Input
            type="password"
            required
            value={formData.password}
            onChange={handleChange("password")}
          />
        </div>
        <div>
          <Label>Confirm Password *</Label>
          <Input
            type="password"
            required
            value={formData.confirmPassword}
            onChange={handleChange("confirmPassword")}
          />
        </div>
      </div>

      {/* actions */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={submitting} type="submit">
          {submitting ? "Creating..." : "Create Dealer"}
        </Button>
      </div>
    </form>
  );
};

export default CreateDealerForm;
