import { useState } from 'preact/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuthStore } from '../stores/authStore';

interface LoginCardProps {
  isOpen: boolean;
  onToggle: () => void;
  isDraggable?: boolean;
  draggableId?: string;
  draggablePosition?: { x: number; y: number };
}

export default function LoginCard({
  isOpen,
  onToggle,
  isDraggable = false,
  draggableId = 'login',
  draggablePosition = { x: 100, y: 100 }
}: LoginCardProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);

  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInAnonymously,
    isSigningIn,
    error,
    clearError,
    user,
    isAuthenticated
  } = useAuthStore();

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!email || !password || (isSignUpMode && !username)) {
      return;
    }

    try {
      if (isSignUpMode) {
        await signUpWithEmail(email, password, username);
        // Switch to sign in mode after successful signup
        setIsSignUpMode(false);
      } else {
        await signInWithEmail(email, password);
        // Close the login card on successful authentication
        onToggle();
      }
    } catch (error) {
      // Error is handled by the store
      console.error('Authentication error:', error);
    }
  };

  const handleAnonymousSignIn = async () => {
    try {
      await signInAnonymously();
      // Close the login card on successful authentication
      onToggle();
    } catch (error) {
      console.error('Anonymous sign in error:', error);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      // Close the login card on successful authentication
      onToggle();
    } catch (error) {
      console.error('Google sign in error:', error);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setUsername('');
    clearError();
  };

  const toggleMode = () => {
    setIsSignUpMode(!isSignUpMode);
    resetForm();
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div
      className="fixed z-50"
      style={{
        left: draggablePosition.x,
        top: draggablePosition.y,
        pointerEvents: isDraggable ? 'auto' : 'auto'
      }}
    >
      <Card className="w-96 shadow-lg bg-slate-900 border-slate-700">
        <CardHeader className="bg-slate-800 border-b border-slate-700">
          <CardTitle className="text-white">
            {isSignUpMode ? 'Create Account' : 'Sign In'}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {isSignUpMode
              ? 'Create a new account to save your progress'
              : 'Sign in to your account to access your saved data'
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="bg-slate-900">
          {error && (
            <div className="mb-4 p-3 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-md">
              {error}
            </div>
          )}

          {isAuthenticated && user ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-900/20 border border-green-800 rounded-md">
                <h3 className="font-semibold text-green-400 mb-2">Successfully Signed In!</h3>
                <p className="text-sm text-gray-300">
                  <strong>User ID:</strong> {user.id}
                </p>
                {user.email && (
                  <p className="text-sm text-gray-300">
                    <strong>Email:</strong> {user.email}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Your data will now be saved to your account.
                </p>
              </div>

              <Button
                onClick={onToggle}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                variant="default"
              >
                Continue to App
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-200">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e: any) => setEmail(e.target.value)}
                  required
                  disabled={isSigningIn}
                  className="bg-slate-800 border-slate-600 text-white placeholder-gray-400"
                />
              </div>

              {isSignUpMode && (
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-200">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e: any) => setUsername(e.target.value)}
                    required
                    disabled={isSigningIn}
                    className="bg-slate-800 border-slate-600 text-white placeholder-gray-400"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-200">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e: any) => setPassword(e.target.value)}
                  required
                  disabled={isSigningIn}
                  minLength={6}
                  className="bg-slate-800 border-slate-600 text-white placeholder-gray-400"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-700 disabled:text-gray-400"
                disabled={isSigningIn || !email || !password || (isSignUpMode && !username)}
              >
                {isSigningIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {isSignUpMode ? 'Creating Account...' : 'Signing In...'}
                  </>
                ) : (
                  isSignUpMode ? 'Create Account' : 'Sign In'
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-600" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-900 px-2 text-gray-400">Or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full border-slate-600 text-white hover:bg-slate-800"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
              >
                {isSigningIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full border-slate-600 text-white hover:bg-slate-800"
                onClick={handleAnonymousSignIn}
                disabled={isSigningIn}
              >
                {isSigningIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Signing In...
                  </>
                ) : (
                  'Continue as Guest'
                )}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-blue-400 hover:text-blue-300"
                  onClick={toggleMode}
                  disabled={isSigningIn}
                >
                  {isSignUpMode
                    ? 'Already have an account? Sign in'
                    : "Don't have an account? Sign up"
                  }
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
