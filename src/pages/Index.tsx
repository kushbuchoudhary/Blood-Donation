import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import StatsCard from "@/components/StatsCard";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Users, Building2, Activity, ArrowRight, CheckCircle2 } from "lucide-react";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    donors: 0,
    hospitals: 0,
    requests: 0,
    donations: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    fetchStats();

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [donorsData, hospitalsData, requestsData, donationsData] = await Promise.all([
        supabase.from("donors").select("id", { count: "exact", head: true }),
        supabase.from("hospitals").select("id", { count: "exact", head: true }),
        supabase.from("blood_requests").select("id", { count: "exact", head: true }),
        supabase.from("donations").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        donors: donorsData.count || 0,
        hospitals: hospitalsData.count || 0,
        requests: requestsData.count || 0,
        donations: donationsData.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} profile={profile} />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="container relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
              <Heart className="mr-2 h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Save Lives, Donate Blood</span>
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight lg:text-6xl">
              Connect Donors,{" "}
              <span className="text-gradient">Save Lives</span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground">
              AI-powered blood donation platform connecting donors, hospitals, and recipients.
              Find donors instantly, manage requests efficiently, and save lives together.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/donors">
                <Button size="lg" className="shadow-glow">
                  Find Donors
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button size="lg" variant="outline">
                  Register as Donor
                </Button>
              </Link>
              <Link to="/auth?mode=signup&role=hospital">
                <Button size="lg" variant="outline">
                  Hospital Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 lg:py-16">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Active Donors"
              value={stats.donors}
              icon={Users}
              loading={loading}
              trend="Ready to help"
            />
            <StatsCard
              title="Registered Hospitals"
              value={stats.hospitals}
              icon={Building2}
              loading={loading}
              trend="Verified partners"
            />
            <StatsCard
              title="Blood Requests"
              value={stats.requests}
              icon={Activity}
              loading={loading}
              trend="Total requests"
            />
            <StatsCard
              title="Lives Saved"
              value={stats.donations}
              icon={Heart}
              loading={loading}
              trend="Successful donations"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose LifeFlow?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Advanced technology meets compassionate care
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Activity}
              title="AI-Powered Matching"
              description="Smart algorithms match donors with requests based on location, blood type, and availability"
            />
            <FeatureCard
              icon={CheckCircle2}
              title="Real-time Updates"
              description="Instant notifications for urgent requests and donation confirmations"
            />
            <FeatureCard
              icon={Users}
              title="Verified Network"
              description="All donors and hospitals are verified for safety and reliability"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-glow p-12 text-center text-primary-foreground">
            <h2 className="text-3xl font-bold mb-4">Ready to Make a Difference?</h2>
            <p className="text-lg mb-8 opacity-90">
              Join thousands of donors and hospitals in our mission to save lives
            </p>
            <Link to="/auth?mode=signup">
              <Button size="lg" variant="secondary" className="shadow-lg">
                Register Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Heart className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold">LifeFlow</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Connecting donors and hospitals to save lives
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/donors" className="hover:text-foreground">Find Donors</Link></li>
                <li><Link to="/requests" className="hover:text-foreground">Blood Requests</Link></li>
                <li><Link to="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Contact Us</a></li>
                <li><a href="#" className="hover:text-foreground">FAQ</a></li>
                <li><a href="#" className="hover:text-foreground">Help Center</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground">Terms of Service</a></li>
                <li><a href="#" className="hover:text-foreground">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>© 2025 LifeFlow. All rights reserved. Built with ❤️ for humanity.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

interface FeatureCardProps {
  icon: any;
  title: string;
  description: string;
}

const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => {
  return (
    <div className="p-6 rounded-lg border border-border bg-card hover:shadow-lg transition-smooth">
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

export default Index;