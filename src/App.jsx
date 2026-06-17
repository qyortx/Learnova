import { useState, useEffect } from 'react';
import { decodeGame } from './utils/share';
import TeacherDashboard from './components/TeacherDashboard';
import OpenTheBox from './components/OpenTheBox';
import MazeChase from './components/MazeChase';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { sound } from './utils/sound';

export default function App() {
  const [playConfig, setPlayConfig] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('play');
    if (token) {
      const decoded = decodeGame(token);
      if (decoded && decoded.title && decoded.questions && decoded.questions.length > 0) {
        return decoded;
      }
    }
    return null;
  });

  const [isStudentMode, setIsStudentMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('play');
    if (token) {
      const decoded = decodeGame(token);
      if (decoded && decoded.title && decoded.questions && decoded.questions.length > 0) {
        return true;
      }
    }
    return false;
  });

  const [errorMsg, setErrorMsg] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('play');
    if (token) {
      const decoded = decodeGame(token);
      if (!(decoded && decoded.title && decoded.questions && decoded.questions.length > 0)) {
        return 'Tautan kuis tidak valid atau data rusak. Pastikan link yang Anda buka sudah benar.';
      }
    }
    return '';
  });

  // Play incorrect sound if errorMsg is set on mount
  useEffect(() => {
    if (errorMsg) {
      sound.playIncorrect();
    }
  }, [errorMsg]);

  const handlePlayGameLocal = (game) => {
    sound.playClick();
    setPlayConfig(game);
    setIsStudentMode(false); // Played from dashboard (local test)
  };

  const handleCloseGame = () => {
    sound.playClick();
    setPlayConfig(null);
    // If student mode, clean URL query without page reload
    if (isStudentMode) {
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsStudentMode(false);
    }
  };

  const handleClearError = () => {
    sound.playClick();
    setErrorMsg('');
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  // 1. Error State
  if (errorMsg) {
    return (
      <div style={styles.fullscreenCenter}>
        <div className="glass-panel animate-fade-in" style={styles.errorCard}>
          <AlertCircle size={48} color="var(--danger)" />
          <h2 style={styles.errorTitle}>Ups, Terjadi Kesalahan!</h2>
          <p style={styles.errorDesc}>{errorMsg}</p>
          <button onClick={handleClearError} className="btn btn-primary">
            <ArrowLeft size={16} /> Ke Halaman Utama
          </button>
        </div>
      </div>
    );
  }

  // 2. Student / Local Game Play View
  if (playConfig) {
    return (
      <div style={styles.playContainer}>
        {playConfig.type === 'box' ? (
          <OpenTheBox game={playConfig} onBack={handleCloseGame} />
        ) : (
          <MazeChase game={playConfig} onBack={handleCloseGame} />
        )}
        <footer style={styles.studentFooter}>
          Dibuat dengan <strong style={{ color: 'var(--primary)' }}>Learnova 🎮</strong>
        </footer>
      </div>
    );
  }

  // 3. Teacher Dashboard View
  return (
    <div style={styles.appContainer}>
      <TeacherDashboard onPlayGame={handlePlayGameLocal} />
    </div>
  );
}

const styles = {
  appContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column'
  },
  playContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    background: 'radial-gradient(circle at 50% 0%, #111322 0%, #06070a 100%)'
  },
  fullscreenCenter: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    background: 'radial-gradient(circle at 50% 0%, #17182f 0%, #0a0b12 100%)'
  },
  errorCard: {
    maxWidth: '450px',
    padding: '40px 30px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px'
  },
  errorTitle: {
    fontSize: '1.6rem',
    color: 'white'
  },
  errorDesc: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    lineHeight: '1.5',
    marginBottom: '10px'
  },
  studentFooter: {
    textAlign: 'center',
    padding: '20px',
    color: 'rgba(255,255,255,0.25)',
    fontSize: '0.8rem',
    fontFamily: 'var(--font-display)',
    letterSpacing: '0.05em',
    borderTop: '1px solid rgba(255,255,255,0.02)'
  }
};
