import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const canonical = typeof window !== "undefined" ? window.location.href : "";

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Demo sign up", description: "Auth will be connected later. Redirecting home…" });
    setTimeout(() => navigate("/"), 600);
  };

  return (
    <main className="min-h-screen bg-background bg-grid spotlight">
      <Helmet>
        <title>Create your UNOCASH account</title>
        <meta name="description" content="Sign up to play skill-based UNO for SOL wagers on UNOCASH." />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <section className="container mx-auto px-6 py-16">
        <div className="mx-auto max-w-md">
          <Card>
            <CardContent className="p-6">
              <h1 className="text-2xl font-bold mb-6">Create account</h1>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" variant="hero" size="lg" className="w-full">Sign Up & Play</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
};

export default Signup;
