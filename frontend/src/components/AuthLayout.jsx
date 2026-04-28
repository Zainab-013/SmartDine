import { ChefHat } from "lucide-react";

export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Left side: Hero */}
      <div className="relative hidden w-1/2 lg:block bg-slate-900">
        <img
          src="/images/login-hero.jpg"
          alt="Restaurant"
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 flex flex-col justify-end p-12 text-white">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-500 p-2 rounded-xl">
              <ChefHat className="size-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">SmartDine</h1>
              <p className="text-sm text-gray-400">Intelligent Management Platform</p>
            </div>
          </div>
          <p className="text-lg text-gray-200 max-w-md mb-10">
            AI-powered demand forecasting, automated inventory management, and real-time profit analytics for modern restaurants.
          </p>
         
        </div>
      </div>
      {/* Right side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}