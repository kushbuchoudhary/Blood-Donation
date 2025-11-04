import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import StatsCard from "@/components/StatsCard";
import { Heart, Calendar, Award, Inbox, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DonorDashboardProps {
  user: any;
}

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const DonorDashboard = ({ user }: DonorDashboardProps) => {
  const [donor, setDonor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    city: "",
    pincode: "",
    blood_group: "",
    phone: "",
    available: true,
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDonor();
    fetchPendingRequests();
  }, [user]);

  const fetchDonor = async () => {
    const { data } = await supabase
      .from("donors")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setDonor(data);
      setFormData({
        name: data.name,
        age: data.age.toString(),
        gender: data.gender,
        city: data.city,
        pincode: data.pincode,
        blood_group: data.blood_group,
        phone: data.phone,
        available: data.available,
      });
    }
    setLoading(false);
  };

  const fetchPendingRequests = async () => {
    try {
      const { data: donorData } = await supabase
        .from("donors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (donorData) {
        const { count } = await supabase
          .from("donor_connection_requests")
          .select("*", { count: "exact", head: true })
          .eq("donor_id", donorData.id)
          .eq("status", "pending");

        setPendingRequests(count || 0);
      }
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const donorData = {
        user_id: user.id,
        name: formData.name,
        age: parseInt(formData.age),
        gender: formData.gender,
        city: formData.city,
        pincode: formData.pincode,
        blood_group: formData.blood_group as any,
        phone: formData.phone,
        available: formData.available,
      };

      if (donor) {
        const { error } = await supabase
          .from("donors")
          .update(donorData)
          .eq("id", donor.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("donors")
          .insert([donorData]);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Your profile has been updated successfully",
      });
      fetchDonor();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const calculateNextDonation = () => {
    if (!donor?.last_donation_date) return "Ready to donate";
    const lastDate = new Date(donor.last_donation_date);
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + 90);
    const today = new Date();
    
    if (today >= nextDate) return "Eligible now!";
    
    const daysLeft = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return `${daysLeft} days until eligible`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Donor Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your profile and track your donation history
        </p>
      </div>

      {donor && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Lives Saved"
            value={donor.total_donations}
            icon={Heart}
            trend="Total donations"
          />
          <StatsCard
            title="Next Donation"
            value={calculateNextDonation()}
            icon={Calendar}
          />
          <StatsCard
            title="Status"
            value={donor.available ? "Available" : "Unavailable"}
            icon={Award}
          />
          <button 
            onClick={() => navigate("/donor-requests")}
            className="relative text-left"
          >
            <StatsCard
              title="Requests"
              value={pendingRequests}
              icon={Inbox}
              trend="Pending"
            />
            {pendingRequests > 0 && (
              <div className="absolute top-2 right-2 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {donor ? "Update Your Profile" : "Complete Your Profile"}
          </CardTitle>
          <CardDescription>
            Keep your information up to date to help save more lives
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Age *</Label>
                <Input
                  id="age"
                  type="number"
                  min="18"
                  max="65"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="blood_group">Blood Group *</Label>
                <Select value={formData.blood_group} onValueChange={(value) => setFormData({ ...formData, blood_group: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    {bloodGroups.map((group) => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="available"
                checked={formData.available}
                onCheckedChange={(checked) => setFormData({ ...formData, available: checked })}
              />
              <Label htmlFor="available">I am available to donate</Label>
            </div>

            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {donor ? "Update Profile" : "Save Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DonorDashboard;