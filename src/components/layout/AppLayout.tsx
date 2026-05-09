import { Link, Outlet, useLocation } from "react-router-dom";
import { Copy, Users, UserCircle, Grid, Settings, LayoutDashboard, FileText, Menu, LogOut, LogIn } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "../../store";
import { signOut, signIn } from "../../firebase";

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Official Correspondance', href: '/correspondance', icon: FileText },
  { name: 'Branch Offices', href: '/branches', icon: Grid },
  { name: 'Our Customers', href: '/customers', icon: Users },
  { name: 'Our Agents', href: '/agents', icon: UserCircle },
  { name: 'Others', href: '/others', icon: Copy },
  { name: 'Admin Portal', href: '/admin', icon: Settings },
];

export function AppLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useAppStore(state => state.user);
  const [signInError, setSignInError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setSignInError(null);
      await signIn();
    } catch (error) {
      console.error('Sign-in error:', error);
      setSignInError((error as Error).message);
    }
  };

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) return name.substring(0, 2).toUpperCase();
    if (email) return email.substring(0, 2).toUpperCase();
    return 'U';
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 bg-gray-100 rounded-md">
            <Menu className="w-5 h-5 text-gray-500" />
          </button>
          <div className="w-10 h-10 bg-[#E31837] rounded-lg flex items-center justify-center text-white hidden md:flex">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-[#E31837]">Dhenkanal RS SO</h1>
            <p className="text-xs text-[#FFC20E] font-bold uppercase tracking-wider hidden md:block">Staff Management</p>
          </div>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          {user ? (
            <>
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-gray-900">{user.displayName || 'Staff Member'}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <div className="h-10 w-10 flex items-center justify-center rounded-full bg-red-100 border-2 border-white shadow-sm font-bold text-[#E31837]">
                {getInitials(user.displayName, user.email)}
              </div>
              <button onClick={signOut} className="p-2 hover:bg-gray-100 rounded-md text-gray-500 ml-2 relative group" title="Sign Out">
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-end">
              <button 
                onClick={handleSignIn}
                className="inline-flex items-center justify-center rounded-lg bg-[#E31837] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-red-700 transition-colors"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </button>
              {signInError && <p className="text-xs text-red-500 mt-1 absolute top-16 right-4 bg-white p-2 border border-red-200 rounded shadow-md z-50 max-w-xs">{signInError}</p>}
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={cn(
          "bg-white border-r border-gray-200 w-full md:w-64 flex-shrink-0 transition-all duration-300 ease-in-out md:flex flex-col p-4",
          sidebarOpen ? "block" : "hidden"
        )}>
          <nav className="flex-1 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors group",
                    isActive 
                      ? "bg-[#E31837] text-white shadow-sm" 
                      : "text-gray-600 hover:bg-red-50 hover:text-[#E31837]"
                  )}
                >
                  <item.icon className={cn(
                    "mr-3 flex-shrink-0 h-5 w-5 transition-colors",
                    isActive ? "text-[#FFC20E]" : "text-gray-400 group-hover:text-[#E31837]"
                  )} aria-hidden="true" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
