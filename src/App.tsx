import { useState, useEffect } from 'react';
import Workspace from './pages/Workspace';
import InstallationWizard from './components/Installation/InstallationWizard';
import { tauriApi } from './api/tauri';
import { Toaster } from './components/ui/toaster';
import { DropdownMenuProvider } from './components/ui/dropdown-menu';

function App() {
  const [isFirstInstall, setIsFirstInstall] = useState<boolean | null>(null);
  const [showInstallation, setShowInstallation] = useState(false);

  useEffect(() => {
    const checkInstallation = async () => {
      try {
        const firstInstall = await tauriApi.isFirstInstall();
        setIsFirstInstall(firstInstall);
        setShowInstallation(firstInstall);
      } catch (error) {
        console.error('Failed to check installation status:', error);
        // If we can't check, assume not first install and proceed to workspace
        setIsFirstInstall(false);
        setShowInstallation(false);
      }
    };

    checkInstallation();
  }, []);

  const handleInstallationComplete = () => {
    setShowInstallation(false);
    setIsFirstInstall(false);
  };

  const handleSkipInstallation = () => {
    setShowInstallation(false);
  };

  // Show loading state while checking
  if (isFirstInstall === null) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show installation wizard if first install
  if (showInstallation) {
    return (
      <InstallationWizard
        onComplete={handleInstallationComplete}
        onSkip={handleSkipInstallation}
      />
    );
  }

  // Otherwise show main workspace
  return (
    <DropdownMenuProvider>
      <Workspace />
      <Toaster />
    </DropdownMenuProvider>
  );
}

export default App;
