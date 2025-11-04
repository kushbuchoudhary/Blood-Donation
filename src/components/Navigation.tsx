import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Droplet, Menu, X, LogOut, User } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NavigationProps {
  user?: any;
  profile?: any;
}

const Navigation = ({ user, profile }: NavigationProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Signed out successfully",
      });
      navigate("/");
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <Droplet className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold text-gradient">LifeFlow</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <Link to="/" className="text-foreground/80 hover:text-foreground transition-colors">
            Home
          </Link>
          <Link to="/donors" className="text-foreground/80 hover:text-foreground transition-colors">
            Find Donors
          </Link>
          <Link to="/requests" className="text-foreground/80 hover:text-foreground transition-colors">
            Blood Requests
          </Link>
          {user && (
            <Link to="/dashboard" className="text-foreground/80 hover:text-foreground transition-colors">
              Dashboard
            </Link>
          )}
        </div>

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center space-x-3">
          {user ? (
            <>
              <Link to="/profile">
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  {profile?.role || "Profile"}
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="container py-4 space-y-3">
            <Link to="/" className="block py-2 text-foreground/80 hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/donors" className="block py-2 text-foreground/80 hover:text-foreground transition-colors">
              Find Donors
            </Link>
            <Link to="/requests" className="block py-2 text-foreground/80 hover:text-foreground transition-colors">
              Blood Requests
            </Link>
            {user && (
              <Link to="/dashboard" className="block py-2 text-foreground/80 hover:text-foreground transition-colors">
                Dashboard
              </Link>
            )}
            <div className="pt-3 space-y-2">
              {user ? (
                <>
                  <Link to="/profile">
                    <Button variant="outline" className="w-full" size="sm">
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/auth" className="block">
                    <Button variant="ghost" className="w-full" size="sm">Sign In</Button>
                  </Link>
                  <Link to="/auth?mode=signup" className="block">
                    <Button className="w-full" size="sm">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;