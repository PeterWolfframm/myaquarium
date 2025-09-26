import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useAuthStore } from '../stores/authStore';

interface UserAccountOverviewProps {
  isOpen: boolean;
  onToggle: () => void;
  isDraggable?: boolean;
  draggableId?: string;
  draggablePosition?: { x: number; y: number };
}

export default function UserAccountOverview({
  isOpen,
  onToggle,
  isDraggable = false,
  draggableId = 'user-account',
  draggablePosition = { x: 200, y: 150 }
}: UserAccountOverviewProps) {
  const {
    user,
    isAuthenticated,
    signOut,
    isSigningOut
  } = useAuthStore();

  const handleSignOut = async () => {
    try {
      await signOut();
      onToggle(); // Close the overview
    } catch (error) {
      console.error('Sign out error:', error);
    }
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
          <CardTitle className="text-white flex items-center justify-between">
            Account Overview
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </Button>
          </CardTitle>
          <CardDescription className="text-gray-400">
            Your account information and settings
          </CardDescription>
        </CardHeader>

        <CardContent className="bg-slate-900 space-y-4">
          {isAuthenticated && user ? (
            <>
              <div className="space-y-3">
                <div className="p-3 bg-slate-800 rounded-md border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">User Details</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">User ID:</span>
                      <code className="text-blue-400 bg-slate-700 px-2 py-1 rounded text-xs">
                        {user.id}
                      </code>
                    </div>
                    
                    {user.email && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Email:</span>
                        <span className="text-white">{user.email}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-gray-400">Account Type:</span>
                      <Badge variant="secondary" className="bg-slate-700 text-white">
                        {user.is_anonymous ? 'Guest' : 'Registered'}
                      </Badge>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-400">Created:</span>
                      <span className="text-white text-xs">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {user.last_sign_in_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Last Sign In:</span>
                        <span className="text-white text-xs">
                          {new Date(user.last_sign_in_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-800 rounded-md border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">Session Info</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <Badge className="bg-green-600 text-white">
                        Active
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-400">Data Sync:</span>
                      <Badge variant="secondary" className="bg-blue-600 text-white">
                        {user.is_anonymous ? 'Local Only' : 'Cloud Synced'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {user.is_anonymous && (
                  <div className="p-3 bg-amber-900/20 border border-amber-800 rounded-md">
                    <h4 className="font-semibold text-amber-400 mb-1">Guest Account Notice</h4>
                    <p className="text-sm text-gray-300">
                      You're using a guest account. Your data is temporary and will be lost when you clear your browser data. 
                      Consider creating a permanent account to save your progress.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSignOut}
                  variant="destructive"
                  className="flex-1"
                  disabled={isSigningOut}
                >
                  {isSigningOut ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Signing Out...
                    </>
                  ) : (
                    'Sign Out'
                  )}
                </Button>
                
                <Button
                  onClick={onToggle}
                  variant="outline"
                  className="flex-1 border-slate-600 text-white hover:bg-slate-800"
                >
                  Close
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="p-4 bg-red-900/20 border border-red-800 rounded-md">
                <h3 className="font-semibold text-red-400 mb-2">Not Signed In</h3>
                <p className="text-sm text-gray-300">
                  You're currently in guest mode. Sign in to sync your data across devices.
                </p>
              </div>
              
              <Button
                onClick={onToggle}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Close
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
