import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "../../components/AuthLayout";
import { API_BASE } from "../../api";

export default function AuthPages({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // --- Backend Integration State ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Determine which API endpoint to hit
    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    const payload = isLogin 
      ? { email, password } 
      : { email, password, restaurant_name: restaurantName };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
          // Success: Pass token + user data up to App.jsx
          onLogin({ token: data.token, user: data.user }); 
        } else {
          // Success: Account created, switch to login view
          alert("Account created! Please sign in.");
          setIsLogin(true);
        }
      } else {
        // Error from backend (e.g., "Email already exists")
        alert(data.error || "Authentication failed");
      }
    } catch (error) {
      alert("Cannot connect to server. Make sure your Flask app is running!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">
          {isLogin ? "Welcome back" : "Create your account"}
        </h2>
        <p className="text-slate-500 mt-2">
          {isLogin
            ? "Sign in to manage your restaurant operations"
            : "Register your restaurant to get started"}
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        {/* --- Restaurant Name (Only shows for Register) --- */}
        {!isLogin && (
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">
              Restaurant Name
            </label>
            <input
              type="text"
              placeholder="The Golden Fork"
              required
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        )}

        {/* Email */}
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">
            Email address
          </label>
          <input
            type="email"
            placeholder="demo@restaurant.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* Password */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-700">
              Password
            </label>
            {isLogin && (
              <button
                type="button"
                className="text-xs text-emerald-600 font-bold hover:underline"
              >
                Forgot password?
              </button>
            )}
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-slate-400"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-slate-900 text-white p-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {loading ? "Processing..." : (isLogin ? "Sign in" : "Create Account")}
        </button>

        {/* Toggle login/register */}
        <p className="text-center text-sm text-slate-600 mt-6">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-emerald-600 font-bold hover:underline"
          >
            {isLogin ? "Register your restaurant" : "Sign in"}
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}