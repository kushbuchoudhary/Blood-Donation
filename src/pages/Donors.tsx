import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Phone, User, Loader2, Sparkles, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const Donors = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [donors, setDonors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState<any>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [filters, setFilters] = useState({
    blood_group: "",
    city: "",
    pincode: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("donors")
        .select("*")
        .eq("available", true);

      if (filters.blood_group) {
        query = query.eq("blood_group", filters.blood_group as any);
      }
      if (filters.city) {
        query = query.ilike("city", `%${filters.city}%`);
      }
      if (filters.pincode) {
        query = query.eq("pincode", filters.pincode);
      }

      const { data, error } = await query;

      if (error) throw error;

      setDonors(data || []);
      
      if (data?.length === 0) {
        toast({
          title: "No donors found",
          description: "Try adjusting your search filters",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAIMatch = async () => {
    if (!filters.blood_group) {
      toast({
        title: "Blood group required",
        description: "Please select a blood group for AI matching",
        variant: "destructive",
      });
      return;
    }

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("match-donors", {
        body: {
          blood_group: filters.blood_group,
          city: filters.city,
          urgency: "high",
        },
      });

      if (error) throw error;

      if (data?.matches) {
        setDonors(data.matches);
        toast({
          title: "AI Match Complete",
          description: `Found ${data.matches.length} best matches using AI`,
        });
      }
    } catch (error: any) {
      toast({
        title: "AI matching unavailable",
        description: "Falling back to regular search",
      });
      handleSearch();
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to contact donors",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!selectedDonor) return;

    setSendingRequest(true);
    try {
      // Get hospital ID from profile
      const { data: hospital } = await supabase
        .from("hospitals")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!hospital) {
        toast({
          title: "Hospital profile required",
          description: "Only hospitals can send connection requests",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("donor_connection_requests")
        .insert({
          hospital_id: hospital.id,
          donor_id: selectedDonor.id,
          message: requestMessage,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Request sent",
        description: `Your request has been sent to ${selectedDonor.name}`,
      });

      setSelectedDonor(null);
      setRequestMessage("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingRequest(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} profile={profile} />
      
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Find Blood Donors</h1>
          <p className="text-muted-foreground">
            Search for available donors by blood group, location, and more
          </p>
        </div>

        {/* Search Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="blood_group">Blood Group</Label>
                <Select 
                  value={filters.blood_group} 
                  onValueChange={(value) => setFilters({ ...filters, blood_group: value })}
                >
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
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Enter city"
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  placeholder="Enter pincode"
                  value={filters.pincode}
                  onChange={(e) => setFilters({ ...filters, pincode: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="invisible">Action</Label>
                <div className="flex gap-2">
                  <Button onClick={handleSearch} disabled={loading} className="flex-1">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                  <Button onClick={handleAIMatch} disabled={aiLoading} variant="outline" className="flex-1">
                    {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              <Sparkles className="inline h-4 w-4 mr-1" />
              Use AI Match for intelligent donor recommendations based on your criteria
            </p>
          </CardContent>
        </Card>

        {/* Results */}
        {donors.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              Found {donors.length} Available Donor{donors.length !== 1 ? "s" : ""}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {donors.map((donor) => (
                <Card key={donor.id} className="hover:shadow-lg transition-smooth">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{donor.name}</h3>
                          <Badge variant="default" className="mt-1">
                            {donor.blood_group}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                        {donor.city}, {donor.pincode}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                        Contact via internal request
                      </div>
                      {donor.total_donations > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">
                            {donor.total_donations} life saved{donor.total_donations !== 1 ? "" : ""}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            onClick={() => setSelectedDonor(donor)}
                            variant="default" 
                            className="w-full"
                            size="sm"
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Request Contact
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Request Contact with {donor.name}</DialogTitle>
                            <DialogDescription>
                              Send a message to request blood donation. The donor will see your hospital details and message.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                              <Label>Message (Optional)</Label>
                              <Textarea
                                placeholder="Add any specific details about the blood requirement..."
                                value={requestMessage}
                                onChange={(e) => setRequestMessage(e.target.value)}
                                rows={4}
                              />
                            </div>
                            <Button 
                              onClick={handleSendRequest}
                              disabled={sendingRequest}
                              className="w-full"
                            >
                              {sendingRequest ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Mail className="h-4 w-4 mr-2" />
                              )}
                              Send Request
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {!loading && donors.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No donors found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your search filters or use AI Match for better results
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Donors;