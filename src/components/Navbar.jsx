import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ExternalLink, LogOut, LayoutDashboard, FileText, Users, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname === '/login';

  return (
    <header className="bg-[#1a1612] text-gray-100 border-b border-[#352c22] sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Brand: College Logo */}
          <div className="flex items-center gap-3">
            <Link to={isAdmin ? "/admin/dashboard" : "/"} className="flex items-center gap-3 group">
              <img
                src="/sheat-logo.png"
                alt="SHEAT College of Engineering"
                className="h-10 sm:h-11 w-auto object-contain brightness-105"
              />
              <div className="border-l border-amber-500/30 pl-3 hidden sm:block">
                <span className="font-semibold text-base sm:text-lg tracking-tight text-white group-hover:text-amber-400 transition-colors block leading-tight">
                  Skill Lab
                </span>
                <span className="text-[10px] text-amber-500/80 block font-mono tracking-wider">
                  SHEAT COLLEGE OF ENGG.
                </span>
              </div>
            </Link>

            {isAdmin && (
              <span className="ml-2 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Staff Portal
              </span>
            )}
          </div>

          {/* Navigation Links for Admin */}
          {isAdmin && (
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/admin/dashboard"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  location.pathname === '/admin/dashboard'
                    ? 'bg-[#2a2219] text-amber-400'
                    : 'text-gray-300 hover:text-white hover:bg-[#251e16]'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <Link
                to="/admin/submissions"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  location.pathname === '/admin/submissions'
                    ? 'bg-[#2a2219] text-amber-400'
                    : 'text-gray-300 hover:text-white hover:bg-[#251e16]'
                }`}
              >
                <FileText className="w-4 h-4" />
                Submissions
              </Link>
              <Link
                to="/admin/classes"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  location.pathname === '/admin/classes'
                    ? 'bg-[#2a2219] text-amber-400'
                    : 'text-gray-300 hover:text-white hover:bg-[#251e16]'
                }`}
              >
                <Users className="w-4 h-4" />
                Classes & Roster
              </Link>
            </nav>
          )}

          {/* Right Action: Hall of Fame & Auth */}
          <div className="flex items-center gap-3">
            {/* Top-right Button: Hall of Fame + Arrow icon only */}
            <a
              href="http://skilllab.sheat.ac.in"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-md bg-[#2d2419] hover:bg-[#382d20] text-amber-300 hover:text-amber-200 border border-amber-600/30 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-all shadow-sm"
              title="Open SHEAT Hall of Fame"
            >
              <span>Hall of Fame</span>
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            </a>

            {isAdmin ? (
              <div className="flex items-center gap-2 pl-2 border-l border-[#352c22]">
                <span className="text-xs text-gray-400 hidden lg:inline-block max-w-[140px] truncate font-mono">
                  {user?.email}
                </span>
                <button
                  onClick={async () => {
                    await logout();
                    navigate('/login');
                  }}
                  className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : !isAdminRoute ? (
              <Link
                to="/login"
                className="hidden sm:flex text-xs text-gray-400 hover:text-white px-2 py-1 rounded transition-colors items-center gap-1"
              >
                <Shield className="w-3.5 h-3.5" />
                Staff login
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
