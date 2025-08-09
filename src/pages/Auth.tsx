import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const Auth = () => {
  const navigate = useNavigate();
  const { signUp, signIn, user, loading } = useAuth();
  const [isSignUpLoading, setIsSignUpLoading] = useState(false);
  const [isSignInLoading, setIsSignInLoading] = useState(false);
  const canonical = typeof window !== "undefined" ? window.location.href : "";

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsSignUpLoading(true);
    const { error } = await signUp(email, password);
    setIsSignUpLoading(false);

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("This email is already registered. Try signing in instead.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success("Check your email to confirm your account!");
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("signin-email") || "");
    const password = String(formData.get("signin-password") || "");

    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setIsSignInLoading(true);
    const { error } = await signIn(email, password);
    setIsSignInLoading(false);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Invalid email or password");
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success("Signed in successfully!");
    navigate("/");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background bg-grid spotlight flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background bg-grid spotlight">
      <Helmet>
        <title>Sign in to UNOCASH</title>
        <meta name="description" content="Sign in or create your account to play skill-based UNO for SOL wagers." />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <header className="container mx-auto flex items-center justify-between py-6">
        <div className="font-black tracking-tight text-2xl md:text-3xl bg-clip-text text-transparent bg-gradient-to-b from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.6)]">
          UNOCASH
        </div>
        <Button variant="ghost" onClick={() => navigate("/")}>← Back to Home</Button>
      </header>

      <section className="container mx-auto px-6 py-16">
        <div className="mx-auto max-w-md">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <Card className="bg-card/60 backdrop-blur border-border">
                <CardHeader>
                  <CardTitle>Welcome back</CardTitle>
                  <CardDescription>Sign in to your UNOCASH account</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input id="signin-email" name="signin-email" type="email" placeholder="you@example.com" autoComplete="email" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input id="signin-password" name="signin-password" type="password" autoComplete="current-password" required />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSignInLoading} variant="hero">
                      {isSignInLoading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signup">
              <Card className="bg-card/60 backdrop-blur border-border">
                <CardHeader>
                  <CardTitle>Create account</CardTitle>
                  <CardDescription>Join UNOCASH and start wagering</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" name="password" type="password" placeholder="At least 6 characters" autoComplete="new-password" required />
                    </div>
                    <Button type="submit" variant="hero" className="w-full" disabled={isSignUpLoading}>
                      {isSignUpLoading ? "Creating account..." : "Sign Up & Play"}
                    </Button>
                  </form>
                </CardContent>
                <CardFooter>
                  <p className="text-sm text-muted-foreground">
                    By signing up, you agree to our terms of service.
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </main>
  );
};

export default Auth;