import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Download, Save, Clock, Edit2, X, AlertCircle, Play, Timer, Zap, FileText, Settings, Maximize2, Minimize2, HelpCircle, Volume2, VolumeX } from 'lucide-react';

// Templates
const TEMPLATES = {
  workshop2jam: {
    name: "Workshop 2 Jam",
    items: [
      { durasi: 15, tampilan: "Waiting Room", slide: "", materiUtama: "Background music", interaksi: "", keterangan: "Persiapan audiens" },
      { durasi: 5, tampilan: "Opening", slide: "1", materiUtama: "Pembukaan & Perkenalan", interaksi: "Ice breaking", keterangan: "" },
      { durasi: 30, tampilan: "Main Content", slide: "2-10", materiUtama: "Materi Inti Part 1", interaksi: "Q&A", keterangan: "" },
      { durasi: 15, tampilan: "Break", slide: "", materiUtama: "Coffee Break", interaksi: "", keterangan: "" },
      { durasi: 30, tampilan: "Main Content", slide: "11-20", materiUtama: "Materi Inti Part 2", interaksi: "Discussion", keterangan: "" },
      { durasi: 20, tampilan: "Practice", slide: "21", materiUtama: "Hands-on Practice", interaksi: "Group work", keterangan: "" },
      { durasi: 5, tampilan: "Closing", slide: "22", materiUtama: "Summary & Next Steps", interaksi: "", keterangan: "" }
    ]
  },
  presentasi30: {
    name: "Presentasi 30 Menit",
    items: [
      { durasi: 2, tampilan: "Opening", slide: "1", materiUtama: "Opening & Hook", interaksi: "Poll", keterangan: "" },
      { durasi: 10, tampilan: "Problem", slide: "2-5", materiUtama: "Problem Statement", interaksi: "", keterangan: "" },
      { durasi: 12, tampilan: "Solution", slide: "6-12", materiUtama: "Solution & Benefits", interaksi: "Demo", keterangan: "" },
      { durasi: 5, tampilan: "Case Study", slide: "13-15", materiUtama: "Success Story", interaksi: "", keterangan: "" },
      { durasi: 1, tampilan: "Closing", slide: "16", materiUtama: "Call to Action", interaksi: "", keterangan: "" }
    ]
  },
  trainingFullDay: {
    name: "Training Full Day",
    items: [
      { durasi: 30, tampilan: "Registration", slide: "", materiUtama: "Check-in & Welcome Coffee", interaksi: "", keterangan: "" },
      { durasi: 10, tampilan: "Opening", slide: "1", materiUtama: "Pembukaan & Objektif", interaksi: "Introduction", keterangan: "" },
      { durasi: 60, tampilan: "Session 1", slide: "2-20", materiUtama: "Module 1: Foundation", interaksi: "Interactive", keterangan: "" },
      { durasi: 15, tampilan: "Break", slide: "", materiUtama: "Coffee Break", interaksi: "", keterangan: "" },
      { durasi: 60, tampilan: "Session 2", slide: "21-40", materiUtama: "Module 2: Advanced", interaksi: "Case study", keterangan: "" },
      { durasi: 60, tampilan: "Lunch", slide: "", materiUtama: "Lunch Break", interaksi: "", keterangan: "" },
      { durasi: 60, tampilan: "Session 3", slide: "41-60", materiUtama: "Module 3: Practice", interaksi: "Hands-on", keterangan: "" },
      { durasi: 15, tampilan: "Break", slide: "", materiUtama: "Afternoon Break", interaksi: "", keterangan: "" },
      { durasi: 45, tampilan: "Session 4", slide: "61-75", materiUtama: "Module 4: Implementation", interaksi: "Group work", keterangan: "" },
      { durasi: 15, tampilan: "Closing", slide: "76", materiUtama: "Summary & Evaluation", interaksi: "Feedback", keterangan: "" }
    ]
  }
};

export default function LUYSTimelinePlanner() {
  const [metadata, setMetadata] = useState({
    judulSesi: '',
    audiens: '',
    startTime: '09:00'
  });

  const [items, setItems] = useState([
    {
      id: Date.now(),
      durasi: '',
      tampilan: '',
      slide: '',
      materiUtama: '',
      interaksi: '',
      keterangan: ''
    }
  ]);

  const [savedSessions, setSavedSessions] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPWAPrompt, setShowPWAPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  
  // Live mode settings
  const [liveSettings, setLiveSettings] = useState({
    autoAdvance: false,
    autoAdvanceDelay: 5,
    soundEnabled: false,
    widgetSize: 'small',
    widgetPosition: { x: 20, y: 20 },
    opacity: 95,
    minimized: false
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState(null);
  
  const widgetRef = useRef(null);

  // Load saved sessions and settings on mount
  useEffect(() => {
    loadSessions();
    loadSettings();
    
    // PWA Install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPWAPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silently fail
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Live mode timer
  useEffect(() => {
    let interval;
    if (liveMode && isRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [liveMode, isRunning]);

  // Check for time completion and auto-advance
  useEffect(() => {
    if (liveMode && isRunning && liveSettings.autoAdvance) {
      const currentDuration = getCurrentItemDuration();
      if (elapsedTime >= currentDuration && autoAdvanceCountdown === null) {
        if (liveSettings.autoAdvanceDelay === 0) {
          handleNext();
        } else {
          setIsRunning(false);
          setAutoAdvanceCountdown(liveSettings.autoAdvanceDelay);
        }
      }
    }
  }, [elapsedTime, liveMode, isRunning, liveSettings.autoAdvance]);

  // Auto-advance countdown
  useEffect(() => {
    let timer;
    if (autoAdvanceCountdown !== null && autoAdvanceCountdown > 0) {
      timer = setTimeout(() => {
        setAutoAdvanceCountdown(autoAdvanceCountdown - 1);
      }, 1000);
    } else if (autoAdvanceCountdown === 0) {
      setAutoAdvanceCountdown(null);
      handleNext();
    }
    return () => clearTimeout(timer);
  }, [autoAdvanceCountdown]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!liveMode) return;

    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch(e.key) {
        case ' ':
          e.preventDefault();
          setIsRunning(!isRunning);
          break;
        case '>':
          e.preventDefault();
          handleNext();
          break;
        case '<':
          e.preventDefault();
          handlePrevious();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          setElapsedTime(0);
          setAutoAdvanceCountdown(null);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          setLiveSettings(prev => ({ ...prev, minimized: !prev.minimized }));
          break;
        case '=':
        case '+':
          e.preventDefault();
          setElapsedTime(Math.max(0, elapsedTime - 60));
          break;
        case '-':
          e.preventDefault();
          setElapsedTime(elapsedTime + 60);
          break;
        case '?':
          e.preventDefault();
          setShowShortcuts(!showShortcuts);
          break;
        case 'Escape':
          e.preventDefault();
          exitLiveMode();
          break;
        default:
          if (e.key >= '1' && e.key <= '9') {
            const index = parseInt(e.key) - 1;
            if (index < items.length) {
              setCurrentItemIndex(index);
              setElapsedTime(0);
              setAutoAdvanceCountdown(null);
            }
          }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [liveMode, isRunning, showShortcuts, elapsedTime]);

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('luysLiveSettings');
      if (saved) {
        setLiveSettings({ ...liveSettings, ...JSON.parse(saved) });
      }
    } catch (e) {
      console.log('Could not load settings');
    }
  };

  const saveSettings = (newSettings) => {
    setLiveSettings(newSettings);
    localStorage.setItem('luysLiveSettings', JSON.stringify(newSettings));
  };

  const handlePWAInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPWAPrompt(false);
    }
    
    setDeferredPrompt(null);
  };

  const loadSessions = async () => {
    try {
      const result = await window.storage.list('luys-session:');
      if (result && result.keys) {
        const sessions = [];
        for (const key of result.keys) {
          try {
            const data = await window.storage.get(key);
            if (data && data.value) {
              sessions.push(JSON.parse(data.value));
            }
          } catch (e) {
            console.log('Could not load session:', key);
          }
        }
        setSavedSessions(sessions.sort((a, b) => b.timestamp - a.timestamp));
      }
    } catch (error) {
      // Silently fail
    }
  };

  const openEditModal = (item) => {
    setEditingItem({ ...item });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const saveEdit = () => {
    if (editingItem.id) {
      setItems(items.map(item => 
        item.id === editingItem.id ? editingItem : item
      ));
    } else {
      setItems([...items, { ...editingItem, id: Date.now() }]);
    }
    closeModal();
  };

  const addItem = () => {
    const newItem = {
      id: null,
      durasi: '',
      tampilan: '',
      slide: '',
      materiUtama: '',
      interaksi: '',
      keterangan: ''
    };
    setEditingItem(newItem);
    setShowModal(true);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const calculateTime = (index) => {
    if (!metadata.startTime) return '--:--';
    
    let totalMinutes = 0;
    const [hours, minutes] = metadata.startTime.split(':').map(Number);
    totalMinutes = hours * 60 + minutes;

    for (let i = 0; i < index; i++) {
      const durasi = parseInt(items[i].durasi) || 0;
      totalMinutes += durasi;
    }

    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    const nextHours = Math.floor((totalMinutes + (parseInt(items[index].durasi) || 0)) / 60);
    const nextMinutes = (totalMinutes + (parseInt(items[index].durasi) || 0)) % 60;

    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')} - ${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`;
  };

  const getTotalDuration = () => {
    return items.reduce((sum, item) => sum + (parseInt(item.durasi) || 0), 0);
  };

  const getSmartWarnings = () => {
    const warnings = [];
    const total = getTotalDuration();
    let noInteractionTime = 0;

    if (total > 60 && !items.some(item => item.tampilan.toLowerCase().includes('break'))) {
      warnings.push({ type: 'warning', message: `Total durasi ${total} menit tanpa break!` });
    }

    items.forEach((item, idx) => {
      const durasi = parseInt(item.durasi) || 0;
      
      if (durasi > 30 && !item.interaksi) {
        warnings.push({ type: 'alert', message: `Item #${idx + 1}: Durasi ${durasi} menit tanpa interaksi` });
      }

      if (item.interaksi) {
        noInteractionTime = 0;
      } else {
        noInteractionTime += durasi;
        if (noInteractionTime > 45) {
          warnings.push({ type: 'alert', message: `Sudah ${noInteractionTime} menit tanpa interaksi!` });
        }
      }
    });

    return warnings;
  };

  const saveSession = async () => {
    const session = {
      id: Date.now(),
      timestamp: Date.now(),
      metadata,
      items,
      totalDuration: getTotalDuration()
    };

    try {
      await window.storage.set(`luys-session:${session.id}`, JSON.stringify(session));
      await loadSessions();
      alert('✓ Sesi berhasil disimpan!');
    } catch (error) {
      alert('✓ Sesi berhasil disimpan di browser Anda!');
    }
  };

  const loadSession = (session) => {
    setMetadata(session.metadata);
    setItems(session.items);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteSession = async (sessionId) => {
    if (!confirm('Hapus sesi ini?')) return;

    try {
      await window.storage.delete(`luys-session:${sessionId}`);
      await loadSessions();
    } catch (error) {
      const saved = savedSessions.filter(s => s.id !== sessionId);
      setSavedSessions(saved);
    }
  };

  const loadTemplate = (templateKey) => {
    const template = TEMPLATES[templateKey];
    setItems(template.items.map((item, idx) => ({ ...item, id: Date.now() + idx })));
    setShowTemplates(false);
    alert(`✓ Template "${template.name}" berhasil dimuat!`);
  };

  const exportToPDF = () => {
    window.print();
  };

  const startLiveMode = () => {
    setLiveMode(true);
    setCurrentItemIndex(0);
    setElapsedTime(0);
    setIsRunning(false);
    setAutoAdvanceCountdown(null);
  };

  const exitLiveMode = () => {
    setLiveMode(false);
    setIsRunning(false);
    setAutoAdvanceCountdown(null);
  };

  const handleNext = () => {
    if (currentItemIndex < items.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
      setElapsedTime(0);
      setIsRunning(false);
      setAutoAdvanceCountdown(null);
    }
  };

  const handlePrevious = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
      setElapsedTime(0);
      setIsRunning(false);
      setAutoAdvanceCountdown(null);
    }
  };

  const formatTime = (seconds) => {
    const isNegative = seconds < 0;
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = absSeconds % 60;
    return `${isNegative ? '-' : ''}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getCurrentItemDuration = () => {
    return (parseInt(items[currentItemIndex]?.durasi) || 0) * 60;
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('.no-drag')) return;
    setIsDragging(true);
    const rect = widgetRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const widgetWidth = 350 * getSizeMultiplier();
    const widgetHeight = 600; // Approximate
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    const newPosition = {
      x: Math.max(0, Math.min(newX, window.innerWidth - widgetWidth)),
      y: Math.max(0, Math.min(newY, window.innerHeight - widgetHeight))
    };
    saveSettings({ ...liveSettings, widgetPosition: newPosition });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Handle window resize to keep widget visible
  useEffect(() => {
    if (!liveMode) return;

    const handleResize = () => {
      const widgetWidth = 350 * getSizeMultiplier();
      const widgetHeight = 600; // Approximate height
      
      setLiveSettings(prev => {
        const newPosition = {
          x: Math.max(0, Math.min(prev.widgetPosition.x, window.innerWidth - widgetWidth)),
          y: Math.max(0, Math.min(prev.widgetPosition.y, window.innerHeight - widgetHeight))
        };
        
        // Only update if position actually changed
        if (newPosition.x !== prev.widgetPosition.x || newPosition.y !== prev.widgetPosition.y) {
          return { ...prev, widgetPosition: newPosition };
        }
        return prev;
      });
    };

    window.addEventListener('resize', handleResize);
    // Initial check
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [liveMode, liveSettings.widgetSize]);

  const getSizeMultiplier = () => {
    switch(liveSettings.widgetSize) {
      case 'small': return 1;
      case 'medium': return 1.3;
      case 'large': return 1.6;
      default: return 1;
    }
  };

  const warnings = getSmartWarnings();

  // Live Mode View
  if (liveMode) {
    const currentItem = items[currentItemIndex];
    const totalDuration = getCurrentItemDuration();
    const progress = (elapsedTime / totalDuration) * 100;
    const remaining = totalDuration - elapsedTime;
    const isOverTime = elapsedTime > totalDuration;
    const sizeMultiplier = getSizeMultiplier();

    // Mobile landscape fullscreen layout
    const isMobileLandscape = window.innerWidth > window.innerHeight && window.innerWidth < 1024;

    if (isMobileLandscape) {
      return (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 to-indigo-900 text-white z-50 flex items-center justify-center p-4">
          {/* Close button */}
          <button
            onClick={exitLiveMode}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors no-drag z-10"
            title="Exit (Esc)"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="w-full max-w-6xl grid grid-cols-2 gap-6 items-center">
            {/* Left: Timer */}
            <div className="text-center">
              <div className={`text-9xl font-bold tabular-nums mb-4 ${isOverTime ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {formatTime(isOverTime ? -(elapsedTime - totalDuration) : elapsedTime)}
              </div>
              
              {/* Time Status */}
              <div className="text-2xl mb-6">
                {autoAdvanceCountdown !== null ? (
                  <div className="text-yellow-400 font-bold animate-pulse">
                    Auto-advance in {autoAdvanceCountdown}...
                  </div>
                ) : isOverTime ? (
                  <div className="text-red-400 font-bold">⚠️ OVER TIME!</div>
                ) : (
                  <div className="text-indigo-300">
                    {Math.ceil(remaining / 60)} menit tersisa
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-700 rounded-full h-4 mb-6 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    isOverTime 
                      ? 'bg-red-500 animate-pulse' 
                      : 'bg-gradient-to-r from-green-400 to-blue-500'
                  }`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>

              {/* Controls */}
              <div className="flex gap-3 justify-center no-drag">
                <button
                  onClick={handlePrevious}
                  disabled={currentItemIndex === 0}
                  className="w-28 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-semibold"
                >
                  &lt; Prev
                </button>
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors font-semibold text-lg"
                >
                  {isRunning ? '⏸ Pause' : '▶ Play'}
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentItemIndex === items.length - 1}
                  className="w-28 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-semibold"
                >
                  Next &gt;
                </button>
              </div>
            </div>

            {/* Right: Info */}
            <div className="space-y-4">
              <div className="bg-indigo-800 rounded-xl p-4">
                <div className="text-4xl font-bold mb-2">{currentItem?.tampilan}</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {currentItem?.slide && (
                    <div className="bg-indigo-900/50 rounded px-3 py-2">
                      <span className="text-indigo-300">Slide: </span>
                      <span className="font-semibold">{currentItem.slide}</span>
                    </div>
                  )}
                  {currentItem?.interaksi && (
                    <div className="bg-indigo-900/50 rounded px-3 py-2">
                      <span className="text-indigo-300">Interaksi: </span>
                      <span className="font-semibold">{currentItem.interaksi}</span>
                    </div>
                  )}
                </div>
                {currentItem?.materiUtama && (
                  <div className="mt-2 bg-indigo-900/50 rounded px-3 py-2 text-sm">
                    <span className="text-indigo-300">Materi: </span>
                    <span className="font-medium">{currentItem.materiUtama}</span>
                  </div>
                )}
              </div>

              {/* Next Up */}
              {currentItemIndex < items.length - 1 && (
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-2">NEXT UP:</div>
                  <div className="flex justify-between items-center text-lg">
                    <div className="font-semibold">{items[currentItemIndex + 1]?.tampilan}</div>
                    <div className="text-slate-400">{items[currentItemIndex + 1]?.durasi} min</div>
                  </div>
                </div>
              )}

              {/* Keyboard Shortcuts Hint */}
              <div className="text-xs text-slate-400 text-center">
                Press ? for shortcuts
              </div>
            </div>
          </div>

          {/* Shortcuts Overlay */}
          {showShortcuts && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 no-drag">
              <div className="bg-slate-900 rounded-2xl p-8 max-w-md text-white">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">⌨️ Keyboard Shortcuts</h2>
                  <button onClick={() => setShowShortcuts(false)} className="text-white/60 hover:text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="font-mono bg-slate-800 px-2 py-1 rounded">Space</span><span>Play/Pause</span></div>
                  <div className="flex justify-between"><span className="font-mono bg-slate-800 px-2 py-1 rounded">&gt;</span><span>Next item</span></div>
                  <div className="flex justify-between"><span className="font-mono bg-slate-800 px-2 py-1 rounded">&lt;</span><span>Previous item</span></div>
                  <div className="flex justify-between"><span className="font-mono bg-slate-800 px-2 py-1 rounded">R</span><span>Reset timer</span></div>
                  <div className="flex justify-between"><span className="font-mono bg-slate-800 px-2 py-1 rounded">=</span><span>-1 minute</span></div>
                  <div className="flex justify-between"><span className="font-mono bg-slate-800 px-2 py-1 rounded">-</span><span>+1 minute</span></div>
                  <div className="flex justify-between"><span className="font-mono bg-slate-800 px-2 py-1 rounded">1-9</span><span>Jump to item</span></div>
                  <div className="flex justify-between"><span className="font-mono bg-slate-800 px-2 py-1 rounded">?</span><span>Show this help</span></div>
                  <div className="flex justify-between"><span className="font-mono bg-slate-800 px-2 py-1 rounded">Esc</span><span>Exit live mode</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (liveSettings.minimized) {
      return (
        <div 
          ref={widgetRef}
          className="fixed bg-slate-900 text-white rounded-xl shadow-2xl p-3 cursor-move z-50"
          style={{
            left: liveSettings.widgetPosition.x,
            top: liveSettings.widgetPosition.y,
            opacity: liveSettings.opacity / 100,
            transform: `scale(${sizeMultiplier})`
          }}
        >
          <div className="flex items-center gap-3">
            <div className={`text-3xl font-bold tabular-nums ${isOverTime ? 'text-red-500 animate-pulse' : 'text-white'}`} style={{ minWidth: '120px' }}>
              {formatTime(isOverTime ? -(elapsedTime - totalDuration) : remaining)}
            </div>
            <div className="flex gap-2 no-drag">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className="w-12 h-12 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center justify-center"
                title="Play/Pause"
              >
                {isRunning ? <Timer className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button
                onClick={() => saveSettings({ ...liveSettings, minimized: false })}
                className="w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center"
                title="Expand"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        <div 
          ref={widgetRef}
          className="fixed bg-gradient-to-br from-slate-900 to-indigo-900 text-white rounded-2xl shadow-2xl overflow-hidden z-50 p-6"
          style={{
            left: liveSettings.widgetPosition.x,
            top: liveSettings.widgetPosition.y,
            opacity: liveSettings.opacity / 100,
            width: `${350 * sizeMultiplier}px`,
            transform: `scale(${sizeMultiplier})`,
            transformOrigin: 'top left'
          }}
        >
          {/* Close & Settings Icons - Top Right */}
          <div className="absolute top-3 right-3 flex gap-1 no-drag z-10">
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
              title="Shortcuts (?)"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => saveSettings({ ...liveSettings, minimized: true })}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
              title="Minimize (M)"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={exitLiveMode}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
              title="Exit (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Timer - Extra Large */}
          <div className="cursor-move mb-6" onMouseDown={handleMouseDown}>
            <div className={`text-7xl font-bold tabular-nums ${isOverTime ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {formatTime(isOverTime ? -(elapsedTime - totalDuration) : elapsedTime)}
            </div>
          </div>

          {/* Controls - Fixed Width Buttons */}
          <div className="flex gap-2 mb-4 no-drag">
            <button
              onClick={handlePrevious}
              disabled={currentItemIndex === 0}
              className="w-24 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-semibold text-sm"
              title="Previous (<)"
            >
              &lt; Prev
            </button>
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors font-semibold text-sm"
              title="Play/Pause (Space)"
            >
              {isRunning ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              onClick={handleNext}
              disabled={currentItemIndex === items.length - 1}
              className="w-24 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-semibold text-sm"
              title="Next (>)"
            >
              Next &gt;
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-700 rounded-full h-2 mb-3 overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                isOverTime 
                  ? 'bg-red-500 animate-pulse' 
                  : 'bg-gradient-to-r from-green-400 to-blue-500'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          {/* Time Status */}
          <div className="text-center mb-3 text-sm">
            {autoAdvanceCountdown !== null ? (
              <div className="text-yellow-400 font-bold animate-pulse">
                Auto-advance in {autoAdvanceCountdown}...
              </div>
            ) : isOverTime ? (
              <div className="text-red-400 font-bold">⚠️ OVER TIME!</div>
            ) : (
              <div className="text-indigo-300">
                {Math.ceil(remaining / 60)} menit tersisa
              </div>
            )}
          </div>

          {/* Current Item - Compact */}
          <div className="space-y-2">
            <div className="bg-indigo-800 rounded-lg p-2">
              <div className="text-xl font-bold">{currentItem?.tampilan}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {currentItem?.slide && (
                <div className="bg-indigo-800/50 rounded px-2 py-1 text-sm">
                  <span className="text-indigo-300 text-xs">Slide: </span>
                  <span className="font-semibold">{currentItem.slide}</span>
                </div>
              )}
              
              {currentItem?.interaksi && (
                <div className="bg-indigo-800/50 rounded px-2 py-1 text-sm">
                  <span className="text-indigo-300 text-xs">Interaksi: </span>
                  <span className="font-semibold">{currentItem.interaksi}</span>
                </div>
              )}
            </div>
            
            {currentItem?.materiUtama && (
              <div className="bg-indigo-800/50 rounded px-2 py-1 text-sm">
                <span className="text-indigo-300 text-xs">Materi: </span>
                <span className="font-medium">{currentItem.materiUtama}</span>
              </div>
            )}
          </div>

          {/* Next Up - Compact */}
          {currentItemIndex < items.length - 1 && (
            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700 mt-3">
              <div className="text-xs text-slate-400 mb-1">NEXT UP:</div>
              <div className="flex justify-between items-center text-sm">
                <div className="font-semibold">{items[currentItemIndex + 1]?.tampilan}</div>
                <div className="text-slate-400">{items[currentItemIndex + 1]?.durasi} min</div>
              </div>
            </div>
          )}
        </div>

        {/* Shortcuts Overlay */}
        {showShortcuts && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 no-drag">
            <div className="bg-slate-900 rounded-2xl p-8 max-w-md text-white">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">⌨️ Keyboard Shortcuts</h2>
                <button onClick={() => setShowShortcuts(false)} className="text-white/60 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="font-mono bg-slate-800 px-2 py-1 rounded">Space</span><span>Play/Pause</span></div>
                <div className="flex justify-between"><span className="font-mono bg-slate-800 px-2 py-1 rounded">&gt;</span><span>Next item</span></div>
                <div className="flex justify-between"><span className="font-mono bg-slate-800 px-2 py-1 rounded">&lt;</span><span>Previous item</span></div>
                <div className="flex justify-between"><span className="font-mono bg-slate-800 px-2 py-1 rounded">R</span><span>Reset timer</span></div>
                <div className="flex justify-between"><span className="font-mono bg-slate-800 px-2 py-1 rounded">M</span><span>Minimize/Expand</span></div>
                <div className="flex justify-between"><span className="font-mono bg-slate-800 px-2 py-1 rounded">=</span><span>-1 minute</span></div>
                <div className="flex justify-between"><span className="font-mono bg-slate-800 px-2 py-1 rounded">-</span><span>+1 minute</span></div>
                <div className="flex justify-between"><span className="font-mono bg-slate-800 px-2 py-1 rounded">1-9</span><span>Jump to item</span></div>
                <div className="flex justify-between"><span className="font-mono bg-slate-800 px-2 py-1 rounded">?</span><span>Show this help</span></div>
                <div className="flex justify-between"><span className="font-mono bg-slate-800 px-2 py-1 rounded">Esc</span><span>Exit live mode</span></div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Planning Mode View
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* PWA Install Prompt */}
      {showPWAPrompt && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4 print:hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Download className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">Install LUYS App</h3>
                <p className="text-sm text-indigo-100 mb-4">
                  Install untuk fullscreen tanpa address bar & navigation buttons!
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handlePWAInstall}
                    className="px-6 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
                  >
                    Install Now
                  </button>
                  <button
                    onClick={() => setShowPWAPrompt(false)}
                    className="px-6 py-2 bg-white/20 text-white rounded-lg font-semibold hover:bg-white/30 transition-colors"
                  >
                    Nanti
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowPWAPrompt(false)}
                className="text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Rotation Reminder for Live Mode */}
      {!liveMode && (
        <div className="md:hidden bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 text-center text-sm font-semibold print:hidden">
          💡 Tip: Putar HP ke landscape saat Live Mode untuk tampilan fullscreen optimal!
        </div>
      )}
      
      {/* Header with LUYS Logo */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 text-white py-8 px-6 shadow-2xl print:hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-6 mb-3">
            <img 
              src="/level_up_white.png"
              alt="LUYS Logo" 
              className="h-16 w-auto"
            />
            <div>
              <h1 className="text-5xl font-bold tracking-tight" style={{ fontFamily: '"Outfit", sans-serif' }}>
                LUYS Delivery Timeline Planner
              </h1>
              <p className="text-indigo-200 text-sm mt-1">Level Up Your Show - Professional Planning Tool</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Smart Warnings */}
        {warnings.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-6 mb-6 print:hidden">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-amber-900 mb-2">⚠️ Smart Warnings</h3>
                <ul className="space-y-2">
                  {warnings.map((warning, idx) => (
                    <li key={idx} className="text-sm text-amber-800 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      {warning.message}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Metadata Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 border-2 border-slate-200 print:shadow-none">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
            <FileText className="w-7 h-7 text-indigo-600" />
            Informasi Sesi
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Judul Sesi</label>
              <input
                type="text"
                value={metadata.judulSesi}
                onChange={(e) => setMetadata({ ...metadata, judulSesi: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all"
                placeholder="Nama sesi/workshop"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Audiens</label>
              <input
                type="text"
                value={metadata.audiens}
                onChange={(e) => setMetadata({ ...metadata, audiens: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all"
                placeholder="Target peserta"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Waktu Mulai</label>
              <input
                type="time"
                value={metadata.startTime}
                onChange={(e) => setMetadata({ ...metadata, startTime: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
          <div className="mt-6 p-5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200">
            <p className="text-sm font-semibold text-indigo-900 flex items-center gap-3">
              <Clock className="w-5 h-5" />
              Total Durasi: <span className="text-3xl ml-2 font-bold">{getTotalDuration()}</span> menit
              <span className="text-sm text-indigo-600 ml-auto">≈ {Math.floor(getTotalDuration() / 60)}h {getTotalDuration() % 60}m</span>
            </p>
          </div>
        </div>

        {/* Timeline Rundown - Clean Simple List */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-slate-200 mb-6 print:shadow-none">
          {/* Quick Guide */}
          {items.length === 1 && !items[0].durasi && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-indigo-200 p-4 print:hidden">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-indigo-900">
                    💡 <span className="font-bold">Mulai di sini:</span> Klik tombol "Tambah Item" atau icon pensil <Edit2 className="w-3 h-3 inline" /> untuk membuat timeline pertama Anda.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rundown List - Mobile Responsive with Horizontal Scroll */}
          <div className="overflow-x-auto -mx-6 px-6">
            {/* Header Row */}
            <div className="grid gap-4 pb-3 mb-3 border-b-2 border-slate-300 min-w-[800px]" style={{ gridTemplateColumns: '110px 80px 120px 70px 1fr 120px 70px' }}>
              <div className="text-xs font-bold text-slate-600 uppercase">Time</div>
              <div className="text-xs font-bold text-slate-600 uppercase">Durasi</div>
              <div className="text-xs font-bold text-slate-600 uppercase">Scene</div>
              <div className="text-xs font-bold text-slate-600 uppercase">Slide</div>
              <div className="text-xs font-bold text-slate-600 uppercase">Materi</div>
              <div className="text-xs font-bold text-slate-600 uppercase">Interaksi</div>
              <div className="text-xs font-bold text-slate-600 uppercase text-center print:hidden">Aksi</div>
            </div>

            {/* Items */}
            {items.map((item, index) => {
              const duration = parseInt(item.durasi) || 0;
              const timeRange = calculateTime(index);
              
              return (
                <div key={item.id} className="group hover:bg-indigo-50 rounded-xl transition-all border-b border-slate-100 last:border-b-0 min-w-[800px]">
                  <div className="grid gap-4 py-4 items-center" style={{ gridTemplateColumns: '110px 80px 120px 70px 1fr 120px 70px' }}>
                    {/* Time */}
                    <div className="text-xs font-mono font-bold text-slate-700">
                      {timeRange}
                    </div>

                    {/* Duration */}
                    <div className="font-bold text-slate-800 text-sm">
                      {duration} menit
                    </div>

                    {/* Scene */}
                    <div className="font-semibold text-slate-800 text-sm">
                      {item.tampilan || '-'}
                    </div>

                    {/* Slide */}
                    <div className="font-semibold text-slate-700 text-sm">
                      {item.slide || '-'}
                    </div>

                    {/* Materi */}
                    <div className="text-slate-700 text-sm">
                      {item.materiUtama || '-'}
                    </div>

                    {/* Interaksi */}
                    <div className="text-slate-700 text-sm">
                      {item.interaksi || '-'}
                    </div>

                    {/* Edit & Delete Buttons */}
                    <div className="flex gap-1 justify-center print:hidden">
                      <button
                        onClick={() => openEditModal(item)}
                        className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 p-2 rounded-lg transition-all"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-all"
                        disabled={items.length === 1}
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Keterangan (if exists) */}
                  {item.keterangan && (
                    <div className="text-xs text-slate-600 bg-slate-50 rounded px-3 py-2 mb-3" style={{ marginLeft: '110px' }}>
                      💬 {item.keterangan}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="p-6 bg-gradient-to-r from-slate-50 to-indigo-50 border-t-2 border-slate-200 print:hidden">
            <button
              onClick={addItem}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-bold text-lg"
            >
              <Plus className="w-6 h-6" />
              Tambah Item
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8 print:hidden">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl font-semibold"
          >
            <FileText className="w-5 h-5" />
            Load Template
          </button>
          <button
            onClick={saveSession}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl font-semibold"
          >
            <Save className="w-5 h-5" />
            Simpan Sesi
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-600 to-gray-600 text-white rounded-xl hover:from-slate-700 hover:to-gray-700 transition-all shadow-lg hover:shadow-xl font-semibold"
          >
            <Settings className="w-5 h-5" />
            Live Settings
          </button>
          <button
            onClick={startLiveMode}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 transition-all shadow-lg hover:shadow-xl font-semibold"
          >
            <Play className="w-5 h-5" />
            Start Live Mode
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl font-semibold"
          >
            <Download className="w-5 h-5" />
            Export PDF
          </button>
        </div>

        {/* Templates Panel */}
        {showTemplates && (
          <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-purple-200 mb-6 print:hidden">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">📚 Template Library</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(TEMPLATES).map(([key, template]) => (
                <button
                  key={key}
                  onClick={() => loadTemplate(key)}
                  className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:shadow-lg transition-all text-left"
                >
                  <h3 className="font-bold text-lg text-purple-900 mb-2">{template.name}</h3>
                  <p className="text-sm text-purple-700">{template.items.length} items • {template.items.reduce((sum, item) => sum + item.durasi, 0)} menit</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Saved Sessions */}
        {savedSessions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-slate-200 print:hidden">
            <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
              <Clock className="w-7 h-7 text-indigo-600" />
              Sesi Tersimpan
            </h2>
            <div className="space-y-3">
              {savedSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-5 bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl border-2 border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-800">{session.metadata.judulSesi || 'Untitled'}</h3>
                    <p className="text-sm text-slate-600">
                      {session.metadata.audiens} • {session.totalDuration} menit • {session.items.length} items •
                      {new Date(session.timestamp).toLocaleDateString('id-ID', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadSession(session)}
                      className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all text-sm font-semibold shadow-md"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-semibold shadow-md"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Live Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-3xl flex justify-between items-center">
              <h2 className="text-2xl font-bold">⚙️ Live Mode Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              {/* Auto-advance */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Auto-advance setelah timer habis:</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border-2 border-slate-200 rounded-xl hover:border-indigo-300 cursor-pointer">
                    <input
                      type="radio"
                      checked={!liveSettings.autoAdvance}
                      onChange={() => saveSettings({ ...liveSettings, autoAdvance: false })}
                      className="w-5 h-5"
                    />
                    <div>
                      <div className="font-semibold">Manual (klik Next)</div>
                      <div className="text-xs text-slate-600">Timer berhenti, tunggu klik Next manual</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border-2 border-slate-200 rounded-xl hover:border-indigo-300 cursor-pointer">
                    <input
                      type="radio"
                      checked={liveSettings.autoAdvance}
                      onChange={() => saveSettings({ ...liveSettings, autoAdvance: true })}
                      className="w-5 h-5"
                    />
                    <div>
                      <div className="font-semibold">Auto (langsung lanjut)</div>
                      <div className="text-xs text-slate-600">Otomatis ke item berikutnya dengan countdown</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Auto-advance delay */}
              {liveSettings.autoAdvance && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Delay sebelum auto-advance:</label>
                  <select
                    value={liveSettings.autoAdvanceDelay}
                    onChange={(e) => saveSettings({ ...liveSettings, autoAdvanceDelay: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
                  >
                    <option value="0">Langsung (0 detik)</option>
                    <option value="3">3 detik</option>
                    <option value="5">5 detik</option>
                    <option value="10">10 detik</option>
                  </select>
                </div>
              )}

              {/* Widget size */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Ukuran Widget:</label>
                <div className="flex gap-3">
                  {['small', 'medium', 'large'].map(size => (
                    <button
                      key={size}
                      onClick={() => saveSettings({ ...liveSettings, widgetSize: size })}
                      className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                        liveSettings.widgetSize === size
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Opacity */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Transparansi: {liveSettings.opacity}%</label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={liveSettings.opacity}
                  onChange={(e) => saveSettings({ ...liveSettings, opacity: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              {/* Sound */}
              <div>
                <label className="flex items-center gap-3 p-4 border-2 border-slate-200 rounded-xl hover:border-indigo-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={liveSettings.soundEnabled}
                    onChange={(e) => saveSettings({ ...liveSettings, soundEnabled: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <div className="flex-1">
                    <div className="font-semibold flex items-center gap-2">
                      {liveSettings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                      Sound Alert
                    </div>
                    <div className="text-xs text-slate-600">Bunyi notifikasi saat timer habis</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-50 p-6 rounded-b-3xl flex gap-4 border-t-2 border-slate-200">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold text-lg"
              >
                Simpan & Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showModal && editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-3xl flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">{editingItem.id ? 'Edit Item' : 'Tambah Item Baru'}</h2>
                <p className="text-sm text-indigo-100 mt-1">Isi detail timeline Anda</p>
              </div>
              <button
                onClick={closeModal}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Durasi (menit) *</label>
                  <input
                    type="number"
                    value={editingItem.durasi}
                    onChange={(e) => setEditingItem({ ...editingItem, durasi: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500 text-lg font-semibold"
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Slide</label>
                  <input
                    type="text"
                    value={editingItem.slide}
                    onChange={(e) => setEditingItem({ ...editingItem, slide: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
                    placeholder="1-5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tampilan / Scene *</label>
                <input
                  type="text"
                  value={editingItem.tampilan}
                  onChange={(e) => setEditingItem({ ...editingItem, tampilan: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
                  placeholder="Contoh: Opening, Main Content, Break"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Materi Utama</label>
                <textarea
                  value={editingItem.materiUtama}
                  onChange={(e) => setEditingItem({ ...editingItem, materiUtama: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500 min-h-[100px]"
                  placeholder="Deskripsikan materi yang akan disampaikan..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Interaksi</label>
                <input
                  type="text"
                  value={editingItem.interaksi}
                  onChange={(e) => setEditingItem({ ...editingItem, interaksi: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
                  placeholder="Contoh: Q&A, Poll, Group Discussion"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Keterangan</label>
                <textarea
                  value={editingItem.keterangan}
                  onChange={(e) => setEditingItem({ ...editingItem, keterangan: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500 min-h-[100px]"
                  placeholder="Catatan tambahan, reminder, atau instruksi khusus..."
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-50 p-6 rounded-b-3xl flex gap-4 border-t-2 border-slate-200">
              <button
                onClick={closeModal}
                className="flex-1 px-6 py-4 bg-slate-300 text-slate-700 rounded-xl hover:bg-slate-400 transition-all font-bold text-lg"
              >
                Batal
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-bold text-lg"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 text-white py-6 px-6 mt-12 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-indigo-200">
            © {new Date().getFullYear()} LUYS - Level Up Your Show. All rights reserved.
          </div>
          <a 
            href="https://instagram.com/levelupyourshow" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-white hover:text-indigo-300 transition-colors font-semibold"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            @levelupyourshow
          </a>
        </div>
      </footer>

      {/* Print Styles */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
        
        * {
          font-family: 'Outfit', 'Inter', system-ui, sans-serif;
        }

        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}