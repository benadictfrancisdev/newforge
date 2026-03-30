import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, User } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import InteractiveTutorial from "@/components/tutorial/InteractiveTutorial";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "@/hooks/useTheme";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getInitials = (email: string) => {
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl"
      style={{
        background: isLight ? "hsl(var(--glass-nav-bg))" : "hsl(var(--glass-nav-bg))",
        borderBottom: `1px solid hsl(var(--glass-nav-border))`,
      }}
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <Logo size="md" />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="/#features" className="text-muted-foreground hover:text-foreground transition-colors duration-200">
              Features
            </a>
            <a href="/#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors duration-200">
              How it Works
            </a>
            <Link to="/data-agent" className="text-muted-foreground hover:text-foreground transition-colors duration-200">
              Data Agent
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <InteractiveTutorial />
            <ThemeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {getInitials(user.email || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[150px] truncate">{user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/data-agent" className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      My Data
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button
                    variant="hero"
                    size="sm"
                    style={{ boxShadow: "0 0 20px rgba(26,111,244,0.4)" }}
                  >
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 pt-4 animate-fade-in" style={{ borderTop: `1px solid hsl(var(--glass-nav-border))` }}>
            <div className="flex flex-col gap-4">
              <a href="/#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="/#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
              <Link to="/data-agent" className="text-muted-foreground hover:text-foreground transition-colors">Data Agent</Link>
              <div className="flex gap-4 pt-4 items-center">
                <ThemeToggle showLabel />
                {user ? (
                  <Button variant="ghost" size="sm" className="flex-1" onClick={handleSignOut}>Sign Out</Button>
                ) : (
                  <>
                    <Link to="/auth" className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full">Sign In</Button>
                    </Link>
                    <Link to="/auth" className="flex-1">
                      <Button variant="hero" size="sm" className="w-full">Get Started</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
