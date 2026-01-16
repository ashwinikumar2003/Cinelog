import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, X, Star, Film, MapPin, Calendar, Trash2, Heart, Search, 
  Monitor, Smartphone, ChevronDown, ChevronUp, Settings, 
  CloudLightning, RefreshCw, Edit2, Play, Check 
} from 'lucide-react';

// --- Utility Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', type = "button", disabled = false }) => {
  const baseStyle = "px-4 py-2 rounded-xl font-medium transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:shadow-purple-500/30 hover:-translate-y-0.5",
    secondary: "bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 hover:border-gray-500",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
    ghost: "text-gray-400 hover:text-white hover:bg-white/5",
    glass: "bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20"
  };

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Badge = ({ children, color = 'blue' }) => {
  const colors = {
    blue: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    purple: "bg-purple-500/10 text-purple-300 border-purple-500/20",
    green: "bg-green-500/10 text-green-300 border-green-500/20",
    gold: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20"
  };

  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium border ${colors[color] || colors.blue}`}>
      {children}
    </span>
  );
};

const RatingStars = ({ rating, max = 5, size = 16, interactive = false, onRate }) => {
  return (
    <div className="flex gap-1">
      {[...Array(max)].map((_, i) => (
        <div key={i} onClick={() => interactive && onRate(i + 1)} className={interactive ? "cursor-pointer" : ""}>
          <Star
            size={size}
            className={`${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"} transition-colors`}
          />
        </div>
      ))}
    </div>
  );
};

// --- Main Application ---

export default function CineLog() {
  const [view, setView] = useState('welcome'); // 'welcome', 'app'
  const [movies, setMovies] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [cloudUrl, setCloudUrl] = useState("");
  const [syncStatus, setSyncStatus] = useState("idle"); // idle, syncing, success, error

  // --- Initialization & PWA ---
  useEffect(() => {
    // Load local settings
    const savedMovies = localStorage.getItem('cinelog_movies');
    const savedUrl = localStorage.getItem('cinelog_cloud_url');
    const hasVisited = localStorage.getItem('cinelog_visited');

    if (savedMovies) setMovies(JSON.parse(savedMovies));
    if (savedUrl) setCloudUrl(savedUrl);
    if (hasVisited) setView('app');

    // Service Worker Registration Logic (Simulated for this file)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW Fail', err));
    }
  }, []);

  // --- Sync Engine ---
  const syncWithCloud = async (currentMovies = movies, url = cloudUrl) => {
    if (!url) return;
    setSyncStatus("syncing");
    
    try {
      // For this MVP, we treat the Cloud as the "Source of Truth" for lists on load,
      // but we push local changes to it. 
      // A true sync engine is complex, so we will use a "Push/Pull" model.
      
      // Pull latest
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && Array.isArray(data.data)) {
        setMovies(data.data);
        localStorage.setItem('cinelog_movies', JSON.stringify(data.data));
        setSyncStatus("success");
      }
    } catch (error) {
      console.error("Sync Error", error);
      setSyncStatus("error");
    } finally {
      setTimeout(() => setSyncStatus("idle"), 2000);
    }
  };

  const pushToCloud = async (newMovies, url = cloudUrl) => {
    localStorage.setItem('cinelog_movies', JSON.stringify(newMovies));
    if (!url) return;

    setSyncStatus("syncing");
    try {
        // We send the ENTIRE list to overwrite the sheet for simplicity in this MVP
        // In a production app, you'd send only the diff (POST/PUT/DELETE)
        await fetch(url, {
            method: 'POST',
            mode: 'no-cors', // Google Apps Script Web App constraint for simple setup
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'sync_all', data: newMovies })
        });
        setSyncStatus("success");
    } catch (e) {
        setSyncStatus("error");
    } finally {
        setTimeout(() => setSyncStatus("idle"), 2000);
    }
  };

  // --- Actions ---

  const handleEnterApp = () => {
    setView('app');
    localStorage.setItem('cinelog_visited', 'true');
    if(cloudUrl) syncWithCloud();
  };

  const handleSaveMovie = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const movieData = {
      id: editingMovie ? editingMovie.id : Date.now(),
      title: formData.get('title'),
      director: formData.get('director'),
      year: formData.get('year'),
      country: formData.get('country'),
      rating: parseInt(formData.get('rating')),
      image: formData.get('image') || "https://placehold.co/400x600/1a1a1a/666666?text=No+Poster",
      review: formData.get('review'),
      tags: formData.get('tags').split(',').map(tag => tag.trim()).filter(t => t),
      dateWatched: formData.get('dateWatched') || new Date().toISOString().split('T')[0]
    };

    let updatedList;
    if (editingMovie) {
      updatedList = movies.map(m => m.id === movieData.id ? movieData : m);
    } else {
      updatedList = [movieData, ...movies];
    }

    setMovies(updatedList);
    pushToCloud(updatedList);
    setIsModalOpen(false);
    setEditingMovie(null);
  };

  const handleDelete = (id) => {
    if(confirm("Delete this entry permanently?")) {
      const updatedList = movies.filter(m => m.id !== id);
      setMovies(updatedList);
      pushToCloud(updatedList);
    }
  };

  const handleEdit = (movie) => {
    setEditingMovie(movie);
    setIsModalOpen(true);
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    const url = e.target.cloudUrl.value;
    setCloudUrl(url);
    localStorage.setItem('cinelog_cloud_url', url);
    setIsSettingsOpen(false);
    syncWithCloud(movies, url);
  };

  // --- Views ---

  const WelcomeView = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center relative overflow-hidden">
      <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 to-blue-900/40" />
          <img 
            src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070&auto=format&fit=crop" 
            alt="Cinema Background" 
            className="w-full h-full object-cover opacity-20"
          />
      </div>
      
      <div className="relative z-10 max-w-lg space-y-8 animate-in fade-in zoom-in duration-700">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-500 to-blue-500 shadow-2xl shadow-purple-500/50 mb-4">
            <Film size={40} className="text-white" />
        </div>
        <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400 tracking-tighter">
          CineLog
        </h1>
        <p className="text-xl text-gray-300 font-light leading-relaxed">
          The minimalist journal for the modern cinephile. <br/>
          Curate your journey through world cinema.
        </p>
        <Button onClick={handleEnterApp} variant="glass" className="!px-8 !py-4 !text-lg mx-auto !rounded-full group">
          Enter Journal <ChevronDown className="group-hover:translate-y-1 transition-transform" />
        </Button>
      </div>
    </div>
  );

  const DashboardView = () => {
    const filteredMovies = movies.filter(movie => 
      movie.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movie.director.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movie.country.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 md:px-8 pb-24">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 sticky top-0 z-40 py-4 bg-[#0f1115]/80 backdrop-blur-xl border-b border-white/5 -mx-4 px-4 md:-mx-8 md:px-8">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
                <Film size={20} className="text-white" />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">CineLog</h1>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                    {movies.length} Films Watched
                </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="relative group flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-56 bg-gray-900 border border-gray-700 rounded-xl py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
              />
            </div>
            
            <button 
                onClick={() => syncWithCloud()} 
                className={`p-2 rounded-xl border border-gray-700 hover:bg-gray-800 transition-colors ${syncStatus === 'syncing' ? 'animate-spin text-purple-400' : 'text-gray-400'}`}
                title="Sync Status"
            >
                {syncStatus === 'syncing' ? <RefreshCw size={20} /> : 
                 syncStatus === 'success' ? <Check size={20} className="text-green-400" /> :
                 syncStatus === 'error' ? <CloudLightning size={20} className="text-red-400" /> :
                 <CloudLightning size={20} />}
            </button>

            <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-xl border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
                <Settings size={20} />
            </button>

            <Button onClick={() => { setEditingMovie(null); setIsModalOpen(true); }} className="whitespace-nowrap">
              <Plus size={18} /> <span className="hidden sm:inline">Log Movie</span>
            </Button>
          </div>
        </header>

        {/* Content */}
        {filteredMovies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500 border-2 border-dashed border-gray-800 rounded-3xl bg-gray-900/20">
            <Film size={64} className="mb-4 opacity-30" />
            <p className="text-xl font-medium">Library is empty</p>
            <p className="text-sm mt-2 opacity-60">Tap 'Log Movie' to start your collection</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMovies.map((movie) => (
              <div 
                key={movie.id}
                className="group relative bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all duration-300 flex flex-col shadow-lg hover:shadow-purple-900/10"
              >
                <div className="relative aspect-[2/3] overflow-hidden bg-gray-800">
                  <img 
                    src={movie.image} 
                    alt={movie.title} 
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {e.target.src = 'https://placehold.co/400x600/1a1a1a/666666?text=No+Image'}}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-90" />
                  
                  <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
                    <span className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-mono text-gray-300 border border-white/10">
                        {movie.year}
                    </span>
                  </div>

                  <div className="absolute bottom-0 left-0 w-full p-4 transform transition-transform duration-300 group-hover:-translate-y-2">
                    <h3 className="text-lg font-bold text-white leading-tight mb-1 line-clamp-2">{movie.title}</h3>
                    <p className="text-sm text-gray-400 mb-2">{movie.director}</p>
                    <div className="flex justify-between items-center">
                        <RatingStars rating={movie.rating} />
                    </div>
                  </div>
                </div>

                <div className={`bg-gray-800/50 backdrop-blur-md border-t border-white/5 transition-all duration-300 overflow-hidden ${expandedCardId === movie.id ? 'max-h-[500px]' : 'max-h-0'}`}>
                  <div className="p-4 space-y-3 text-sm">
                     <div className="flex items-center justify-between text-xs text-gray-400">
                        <span className="flex items-center gap-1"><MapPin size={12} /> {movie.country}</span>
                        <span className="flex items-center gap-1"><Calendar size={12} /> {movie.dateWatched}</span>
                     </div>
                     
                     <div className="flex flex-wrap gap-1.5">
                       {movie.tags.map((tag, idx) => (
                         <Badge key={idx} color="purple">{tag}</Badge>
                       ))}
                     </div>

                     <p className="text-gray-300 italic leading-relaxed border-l-2 border-purple-500/50 pl-3 py-1">
                       "{movie.review}"
                     </p>

                     <div className="pt-3 flex gap-2 border-t border-white/5 mt-2">
                        <Button variant="secondary" className="!w-full !py-1.5 !text-xs" onClick={() => handleEdit(movie)}>
                            <Edit2 size={12} /> Edit
                        </Button>
                        <Button variant="danger" className="!w-full !py-1.5 !text-xs" onClick={() => handleDelete(movie.id)}>
                          <Trash2 size={12} />
                        </Button>
                     </div>
                  </div>
                </div>

                <button 
                  onClick={() => setExpandedCardId(expandedCardId === movie.id ? null : movie.id)}
                  className="absolute bottom-3 right-3 z-20 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-purple-600 transition-colors border border-white/10"
                >
                  {expandedCardId === movie.id ? <ChevronUp size={16}/> : <ChevronDown size={16} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-gray-100 font-sans selection:bg-purple-500/30 overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-purple-900/20 rounded-full blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-3xl opacity-20"></div>
      </div>

      {view === 'welcome' ? <WelcomeView /> : <DashboardView />}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#16181d] border-t sm:border border-gray-700 w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-[#16181d] sticky top-0 z-10">
              <h2 className="text-xl font-bold text-white">{editingMovie ? 'Edit Entry' : 'Log Movie'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white bg-gray-800 p-1 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveMovie} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="space-y-1">
                 <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Movie Title</label>
                 <input defaultValue={editingMovie?.title} required name="title" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all" placeholder="e.g. In the Mood for Love" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Director</label>
                  <input defaultValue={editingMovie?.director} required name="director" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all" placeholder="Wong Kar-wai" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Year</label>
                  <input defaultValue={editingMovie?.year} required name="year" type="number" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all" placeholder="2000" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Country</label>
                  <input defaultValue={editingMovie?.country} required name="country" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all" placeholder="Hong Kong" />
                </div>
                 <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Date Watched</label>
                  <input defaultValue={editingMovie?.dateWatched} name="dateWatched" type="date" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Poster URL</label>
                <div className="flex gap-2">
                    <input defaultValue={editingMovie?.image} name="image" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm" placeholder="https://..." />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Rating</label>
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 flex items-center justify-between">
                    <input required name="rating" type="range" min="1" max="5" defaultValue={editingMovie?.rating || 3} className="w-3/4 accent-purple-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                    <Star size={20} className="text-yellow-400 fill-yellow-400" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Tags</label>
                <input defaultValue={editingMovie?.tags?.join(', ')} name="tags" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all" placeholder="Romance, Visuals" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Review</label>
                <textarea defaultValue={editingMovie?.review} required name="review" rows="3" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all resize-none" placeholder="Thoughts..."></textarea>
              </div>

              <div className="pt-4 flex gap-3 pb-safe">
                <Button variant="secondary" className="w-full" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button variant="primary" type="submit" className="w-full">Save Entry</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
             <div className="bg-[#16181d] border border-gray-700 w-full max-w-md rounded-2xl p-6 shadow-2xl">
                 <h2 className="text-xl font-bold text-white mb-4">Sync Settings</h2>
                 <p className="text-sm text-gray-400 mb-4">
                     Paste your Google Apps Script Web App URL here to sync data across devices.
                 </p>
                 <form onSubmit={handleSaveSettings} className="space-y-4">
                     <input 
                        name="cloudUrl" 
                        defaultValue={cloudUrl}
                        placeholder="https://script.google.com/macros/s/..." 
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                     />
                     <div className="flex justify-end gap-2">
                         <Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>Close</Button>
                         <Button variant="primary" type="submit">Connect</Button>
                     </div>
                 </form>
             </div>
        </div>
      )}

      {/* Global CSS for PWA safe areas and Scrollbar */}
      <style>{`
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }
      `}</style>
    </div>
  );
}