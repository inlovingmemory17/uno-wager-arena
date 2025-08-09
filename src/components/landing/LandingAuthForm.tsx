import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const LandingAuthForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, user } = useAuth();

  // Show user balance or different content if authenticated
  useEffect(() => {
    if (user) {
      // User is signed in, could show balance or different UI
    }
  }, [user]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Invalid email or password");
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success("Signed in successfully!");
  };

  // Show different content based on auth state
  if (user) {
    return (
      <Card className="bg-card/60 backdrop-blur border-border">
        <CardHeader>
          <CardTitle>Welcome back!</CardTitle>
          <CardDescription>You're signed in as {user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Ready to start wagering SOL in UNO matches?</p>
        </CardContent>
        <CardFooter>
          <Button variant="hero" className="w-full" onClick={() => navigate("/")}>
            Start Playing
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="bg-card/60 backdrop-blur border-border">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use your email to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading} variant="hero">
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-end">
        <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Create account</Button>
      </CardFooter>
    </Card>
  );
};

export default LandingAuthForm;
