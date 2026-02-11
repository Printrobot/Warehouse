import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Package, Loader2 } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoggingIn } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-20 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl opacity-20 translate-y-1/2"></div>
      </div>

      <Card className="w-full max-w-md p-8 bg-slate-950 border-slate-800 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/25">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">PrintLogix</h1>
          <p className="text-slate-400 mt-2">Warehouse Operating System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-slate-300">Username / ID</Label>
            <Input
              type="text"
              placeholder="operator123"
              className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 h-12"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Password</Label>
            <Input
              type="password"
              className="bg-slate-900 border-slate-800 text-white h-12"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-lg font-medium bg-primary hover:bg-primary/90"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : "Sign In"}
          </Button>

          <div className="text-center text-xs text-slate-500 mt-4">
            <p>Demo Credentials:</p>
            <p>Admin: admin / admin</p>
            <p>Operator: operator / operator</p>
          </div>
        </form>
      </Card>
    </div>
  );
}
