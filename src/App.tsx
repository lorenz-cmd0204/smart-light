import React, { useState, useEffect, Component, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Power, Lightbulb, Sun, Moon } from 'lucide-react';
import { db } from './firebase';
import { ref, onValue, set, serverTimestamp } from 'firebase/database';

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface DatabaseErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

function handleDatabaseError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: DatabaseErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Database Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if ((this as any).state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse((this as any).state.error?.message || "");
        if (parsed.error && parsed.error.includes("insufficient permissions")) {
          errorMessage = "You don't have permission to perform this action. Please make sure you're logged in.";
        }
      } catch {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-[#e0e5ec] flex items-center justify-center p-6 text-center">
          <div className="neo-out p-8 rounded-2xl max-w-md">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="neo-out-sm px-6 py-2 rounded-full text-gray-700 font-medium active:scale-95 transition-all"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

function SwitchApp() {
  const [isOn, setIsOn] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Sync with Realtime Database
  useEffect(() => {
    const statusRef = ref(db, 'status/led');
    console.log("Setting up Realtime Database listener at status/led");
    
    const unsubscribe = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log("Database update received:", data);
        setIsOn(data.isOn);
      } else {
        console.log("No data found at status/led");
      }
    }, (error) => {
      console.error("Database listener error:", error);
      handleDatabaseError(error, OperationType.GET, 'status/led');
    });

    return () => unsubscribe();
  }, []);

  const toggleSwitch = async () => {
    const newState = !isOn;
    const statusRef = ref(db, 'status/led');
    
    try {
      await set(statusRef, {
        isOn: newState,
        updatedAt: serverTimestamp(),
        updatedBy: 'anonymous'
      });
    } catch (error) {
      handleDatabaseError(error, OperationType.WRITE, 'status/led');
    }
  };

  // Dynamic styles based on theme
  const bgColor = isDarkMode ? 'bg-[#2d3436]' : 'bg-[#e0e5ec]';
  const textColor = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  const neoOut = isDarkMode ? 'neo-dark-out' : 'neo-out';
  const neoIn = isDarkMode ? 'neo-dark-in' : 'neo-in';
  const neoOutSm = isDarkMode ? 'neo-dark-out' : 'neo-out-sm';

  return (
    <div className={`min-h-screen ${bgColor} transition-colors duration-500 flex flex-col items-center justify-center p-4`}>
      {/* Top Bar */}
      <div className="absolute top-8 left-8 right-8 flex justify-end items-center">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${neoOutSm} active:scale-95`}
          id="theme-toggle"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-yellow-400" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-600" />
          )}
        </button>
      </div>

      <div className="flex flex-col items-center gap-12">
        {/* Light Status Indicator */}
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{
              scale: isOn ? [1, 1.05, 1] : 1,
              opacity: isOn ? 1 : 0.5,
            }}
            transition={{
              duration: 2,
              repeat: isOn ? Infinity : 0,
              ease: "easeInOut"
            }}
            className={`w-24 h-24 rounded-full flex items-center justify-center ${neoOut} relative`}
          >
            <Lightbulb 
              className={`w-12 h-12 transition-colors duration-500 ${
                isOn ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]' : 'text-gray-400'
              }`} 
            />
            {isOn && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 rounded-full bg-yellow-400/10 blur-xl"
              />
            )}
          </motion.div>
          <h1 className={`text-xl font-semibold tracking-tight ${textColor}`}>
            {isOn ? 'Lights On' : 'Lights Off'}
          </h1>
        </div>

        {/* Main Switch */}
        <div className="relative">
          <motion.button
            onClick={toggleSwitch}
            initial={false}
            animate={{
              scale: isOn ? 0.96 : 1,
              boxShadow: isOn 
                ? (isDarkMode 
                    ? "inset 6px 6px 12px #23282a, inset -6px -6px 12px #374042" 
                    : "inset 6px 6px 12px #a3b1c6, inset -6px -6px 12px #ffffff")
                : (isDarkMode 
                    ? "9px 9px 16px #23282a, -9px -9px 16px #374042" 
                    : "9px 9px 16px #a3b1c6, -9px -9px 16px #ffffff")
            }}
            whileTap={{ scale: 0.92 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              mass: 0.8
            }}
            className={`group relative w-32 h-32 rounded-full flex items-center justify-center bg-inherit transition-colors duration-300`}
            id="main-switch"
          >
            <motion.div
              animate={{
                rotate: isOn ? 180 : 0,
                scale: isOn ? 0.9 : 1
              }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <Power 
                className={`w-12 h-12 transition-all duration-500 ${
                  isOn ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'text-gray-400'
                }`} 
              />
            </motion.div>
            
            {/* LED Indicator on the button */}
            <div className="absolute bottom-6 flex gap-1">
              <motion.div 
                animate={{
                  scale: isOn ? [1, 1.2, 1] : 1,
                  opacity: isOn ? 1 : 0.3
                }}
                transition={{
                  duration: 1.5,
                  repeat: isOn ? Infinity : 0,
                  ease: "easeInOut"
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                  isOn ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : 'bg-gray-400/30'
                }`} 
              />
            </div>
          </motion.button>
          
          {/* Decorative Ring */}
          <motion.div 
            animate={{
              scale: isOn ? 1.1 : 0.9,
              opacity: isOn ? 0.4 : 0,
              rotate: isOn ? 90 : 0
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`absolute -inset-4 rounded-full border-2 border-emerald-500/30 pointer-events-none`} 
          />
        </div>

        {/* Status Text */}
        <div className={`max-w-xs text-center space-y-2 ${textColor} opacity-60`}>
          <p className="text-sm font-medium uppercase tracking-widest">Real-time Control</p>
          <p className="text-xs">
            Your switch is synced with Realtime Database. Changes will reflect instantly for all users.
          </p>
        </div>
      </div>

      {/* Background Glow Effect */}
      <AnimatePresence>
        {isOn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 -z-10 pointer-events-none"
            style={{
              background: isDarkMode 
                ? 'radial-gradient(circle at center, rgba(250,204,21,0.05) 0%, transparent 70%)'
                : 'radial-gradient(circle at center, rgba(250,204,21,0.1) 0%, transparent 70%)'
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SwitchApp />
    </ErrorBoundary>
  );
}
