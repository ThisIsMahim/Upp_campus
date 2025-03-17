import { Link, useLocation } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/auth-context';
import { Button } from './ui/button';

export function Navbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  // Don't show navbar on auth pages
  if (location.pathname.startsWith('/auth')) {
    return null;
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container flex items-center justify-between px-4 py-4 mx-auto">
        <Link to="/" className="text-xl font-bold text-indigo-600">UPP Campus</Link>
        
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <Link to="/feed" className="text-gray-700 hover:text-indigo-600">
                Feed
              </Link>
              <Link to="/profile" className="flex items-center text-gray-700 hover:text-indigo-600">
                <User className="w-5 h-5 mr-1" />
                Profile
              </Link>
              <Button 
                variant="ghost" 
                onClick={signOut}
                className="flex items-center text-gray-700 hover:text-indigo-600"
              >
                <LogOut className="w-5 h-5 mr-1" />
                Sign Out
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button>Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}