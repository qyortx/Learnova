import { useState } from 'react';
import { 
  Plus, Trash2, Edit2, Share2, Play, Copy, Check, ArrowLeft, 
  HelpCircle, Sparkles, LayoutGrid, Gamepad2, FileText,
  BookOpen, Lightbulb
} from 'lucide-react';
import { encodeGame } from '../utils/share';
import { sound } from '../utils/sound';

export default function TeacherDashboard({ onPlayGame }) {
  const [games, setGames] = useState(() => {
    const saved = localStorage.getItem('learnova_games');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [gameType, setGameType] = useState('box'); // 'box' or 'maze'
  const [questions, setQuestions] = useState([
    { q: '', options: ['', '', '', ''], correct: 0 }
  ]);
  
  // Feedback States
  const [sharedLink, setSharedLink] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Stats Calculations
  const totalQuizzes = games.length;
  const totalQuestions = games.reduce((acc, g) => acc + (g.questions?.length || 0), 0);
  const totalBoxQuizzes = games.filter(g => g.type === 'box').length;
  const totalMazeQuizzes = games.filter(g => g.type === 'maze').length;

  const saveGamesToStorage = (newGames) => {
    localStorage.setItem('learnova_games', JSON.stringify(newGames));
    setGames(newGames);
  };

  const handleStartCreate = () => {
    sound.playClick();
    setIsEditing(true);
    setEditingId(null);
    setTitle('');
    setDesc('');
    setGameType('box');
    setQuestions([{ q: '', options: ['', '', '', ''], correct: 0 }]);
  };

  const handleEdit = (game) => {
    sound.playClick();
    setIsEditing(true);
    setEditingId(game.id);
    setTitle(game.title);
    setDesc(game.desc || '');
    setGameType(game.type);
    setQuestions(game.questions.map(q => ({
      q: q.q,
      options: [...q.options],
      correct: q.correct
    })));
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (confirm('Apakah Anda yakin ingin menghapus kuis ini?')) {
      sound.playIncorrect();
      const updated = games.filter(g => g.id !== id);
      saveGamesToStorage(updated);
    }
  };

  const handleAddQuestion = () => {
    sound.playClick();
    setQuestions([...questions, { q: '', options: ['', '', '', ''], correct: 0 }]);
  };

  const handleRemoveQuestion = (index) => {
    sound.playClick();
    if (questions.length === 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index, value) => {
    const updated = [...questions];
    updated[index].q = value;
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = value;
    setQuestions(updated);
  };

  const handleCorrectChange = (qIndex, optIndex) => {
    const updated = [...questions];
    updated[qIndex].correct = optIndex;
    setQuestions(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sound.playClick();

    // Basic validation
    if (!title.trim()) {
      alert('Judul kuis tidak boleh kosong!');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.q.trim()) {
        alert(`Pertanyaan #${i + 1} tidak boleh kosong!`);
        return;
      }
      const filledOptions = q.options.filter(o => o.trim() !== '');
      if (filledOptions.length < 2) {
        alert(`Pertanyaan #${i + 1} minimal harus memiliki 2 pilihan jawaban!`);
        return;
      }
    }

    const cleanQuestions = questions.map(q => ({
      q: q.q.trim(),
      options: q.options.map(o => o.trim()).filter(o => o !== ''),
      correct: q.correct
    }));

    const newGame = {
      id: editingId || Date.now().toString(),
      title: title.trim(),
      desc: desc.trim(),
      type: gameType,
      questions: cleanQuestions,
      updatedAt: new Date().toLocaleDateString('id-ID')
    };

    let updatedGames;
    if (editingId) {
      updatedGames = games.map(g => g.id === editingId ? newGame : g);
    } else {
      updatedGames = [newGame, ...games];
    }

    saveGamesToStorage(updatedGames);
    setIsEditing(false);
    sound.playCorrect();
  };

  const handleShare = (game, e) => {
    e.stopPropagation();
    sound.playClick();
    
    const token = encodeGame(game);
    const origin = window.location.origin + window.location.pathname;
    const url = `${origin}?play=${token}`;
    
    setSharedLink(url);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(game.id);
      setTimeout(() => setCopiedId(null), 3000);
      sound.playCorrect();
    });
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logoContainer}>
          <div style={styles.logoBadge}>🎮</div>
          <div>
            <h1 style={styles.logoText}>Learnova</h1>
            <p style={styles.logoSub}>Media Belajar Edukatif & Menyenangkan</p>
          </div>
        </div>
        {!isEditing && (
          <button onClick={handleStartCreate} className="btn btn-primary animate-pulse-glow">
            <Plus size={18} /> Buat Kuis Baru
          </button>
        )}
      </header>

      {isEditing ? (
        /* Game Editor Form */
        <div className="glass-panel animate-fade-in" style={styles.editorPanel}>
          <div style={styles.editorHeader}>
            <button onClick={() => { sound.playClick(); setIsEditing(false); }} style={styles.backBtn}>
              <ArrowLeft size={20} /> Kembali
            </button>
            <h2 style={styles.editorTitle}>
              {editingId ? 'Edit Kuis' : 'Buat Kuis Baru'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGrid}>
              {/* Left Side: General settings */}
              <div style={styles.formSection}>
                <h3 style={styles.sectionTitle}><Sparkles size={16} color="var(--primary)" /> Informasi Umum</h3>
                
                <div className="form-group">
                  <label className="form-label">Judul Kuis</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Contoh: Matematika Satuan Panjang"
                    value={title} 
                    onChange={e => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Deskripsi / Petunjuk</label>
                  <textarea 
                    className="form-input" 
                    style={{ height: '80px', resize: 'none' }}
                    placeholder="Contoh: Jawablah pertanyaan dengan memilih kartu yang tepat."
                    value={desc} 
                    onChange={e => setDesc(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Pilih Template Game</label>
                  <div style={styles.typeSelector}>
                    {/* Game Type 1: Box */}
                    <div 
                      onClick={() => { sound.playClick(); setGameType('box'); }}
                      style={{
                        ...styles.typeCard,
                        borderColor: gameType === 'box' ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                        background: gameType === 'box' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(10, 11, 18, 0.4)'
                      }}
                    >
                      <div style={{...styles.typeIcon, background: 'linear-gradient(135deg, var(--primary), var(--accent))'}}>
                        <LayoutGrid size={24} />
                      </div>
                      <div style={styles.typeTextContent}>
                        <h4 style={styles.typeName}>Buka Kotak</h4>
                        <p style={styles.typeDesc}>Grid kartu misterius yang memicu kuis interaktif saat dibuka.</p>
                      </div>
                    </div>

                    {/* Game Type 2: Maze */}
                    <div 
                      onClick={() => { sound.playClick(); setGameType('maze'); }}
                      style={{
                        ...styles.typeCard,
                        borderColor: gameType === 'maze' ? 'var(--secondary)' : 'rgba(255,255,255,0.08)',
                        background: gameType === 'maze' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(10, 11, 18, 0.4)'
                      }}
                    >
                      <div style={{...styles.typeIcon, background: 'linear-gradient(135deg, var(--secondary), #ec4899)'}}>
                        <Gamepad2 size={24} />
                      </div>
                      <div style={styles.typeTextContent}>
                        <h4 style={styles.typeName}>Pengejaran Labirin</h4>
                        <p style={styles.typeDesc}>Gerakkan karakter di labirin untuk mencari jawaban & hindari monster.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Questions */}
              <div style={styles.formSection}>
                <div style={styles.sectionHeader}>
                  <h3 style={styles.sectionTitle}><HelpCircle size={16} color="var(--accent)" /> Daftar Pertanyaan</h3>
                  <button type="button" onClick={handleAddQuestion} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                    <Plus size={16} /> Tambah Soal
                  </button>
                </div>

                <div style={styles.questionsList}>
                  {questions.map((q, qIndex) => (
                    <div key={qIndex} style={styles.questionCard}>
                      <div style={styles.questionCardHeader}>
                        <span style={styles.questionNumber}>Soal #{qIndex + 1}</span>
                        {questions.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveQuestion(qIndex)}
                            style={styles.deleteQBtn}
                            title="Hapus Soal"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="form-group" style={{ marginBottom: '12px' }}>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="Ketik pertanyaan di sini..."
                          value={q.q} 
                          onChange={e => handleQuestionChange(qIndex, e.target.value)}
                          required
                        />
                      </div>

                      <div style={styles.optionsGrid}>
                        {q.options.map((option, optIndex) => (
                          <div key={optIndex} style={styles.optionInputGroup}>
                            <span style={{
                              ...styles.optionLabel,
                              backgroundColor: q.correct === optIndex ? 'var(--success)' : 'rgba(255,255,255,0.1)'
                            }}>
                              {String.fromCharCode(65 + optIndex)}
                            </span>
                            <input 
                              type="text" 
                              className="form-input" 
                              style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                              placeholder={`Pilihan ${String.fromCharCode(65 + optIndex)}`}
                              value={option} 
                              onChange={e => handleOptionChange(qIndex, optIndex, e.target.value)}
                              required={optIndex < 2} // At least 2 options required
                            />
                            <input 
                              type="radio" 
                              name={`correct-${qIndex}`} 
                              checked={q.correct === optIndex} 
                              onChange={() => handleCorrectChange(qIndex, optIndex)}
                              style={styles.correctRadio}
                              title="Set sebagai Jawaban Benar"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={styles.formActions}>
              <button type="button" onClick={() => { sound.playClick(); setIsEditing(false); }} className="btn btn-secondary">
                Batal
              </button>
              <button type="submit" className="btn btn-primary">
                Simpan & Rilis Kuis
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Games Directory Dashboard */
        <div style={styles.dashboardContent} className="animate-fade-in">
          {/* Welcome Hero Banner */}
          <div className="dashboard-hero">
            <div className="hero-content">
              <h2 className="hero-title">
                <Sparkles size={24} color="var(--accent)" className="animate-float" /> Selamat Datang di Portal Guru Learnova!
              </h2>
              <p className="hero-desc">
                Ciptakan pengalaman belajar yang interaktif dan menyenangkan untuk siswa Anda. Buat kuis dengan template menarik, bagikan tautannya, dan mainkan bersama di kelas!
              </p>
              
              {/* Stats Grid */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}>
                    <FileText size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">{totalQuizzes}</span>
                    <span className="stat-label">Total Kuis Anda</span>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'linear-gradient(135deg, var(--success), #059669)' }}>
                    <HelpCircle size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">{totalQuestions}</span>
                    <span className="stat-label">Total Pertanyaan</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'linear-gradient(135deg, var(--secondary), #db2777)' }}>
                    <Gamepad2 size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">{totalBoxQuizzes} Kotak | {totalMazeQuizzes} Labirin</span>
                    <span className="stat-label">Varian Template</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Two-Column Dashboard Layout */}
          <div className="dashboard-layout">
            {/* Left Column: Sidebar Info & Guide */}
            <aside className="sidebar-container">
              {/* Quick Guide Card */}
              <div className="glass-panel sidebar-card">
                <h3 className="sidebar-card-title">
                  <BookOpen size={18} color="var(--primary)" /> Panduan Penggunaan
                </h3>
                <div className="guide-step">
                  <div className="guide-number">1</div>
                  <div className="guide-text">
                    <strong>Buat Kuis Baru</strong> dengan menekan tombol di kanan atas header. Masukkan judul kuis dan deskripsi.
                  </div>
                </div>
                <div className="guide-step">
                  <div className="guide-number">2</div>
                  <div className="guide-text">
                    <strong>Pilih Template</strong> game: <em>Buka Kotak</em> (kuis grid kartu) atau <em>Pengejaran Labirin</em> (arcade 2D).
                  </div>
                </div>
                <div className="guide-step">
                  <div className="guide-number">3</div>
                  <div className="guide-text">
                    <strong>Bagikan Tautan</strong> kuis kepada para siswa Anda. Mereka dapat langsung bermain tanpa pendaftaran akun!
                  </div>
                </div>
              </div>

              {/* Tips Card */}
              <div className="glass-panel sidebar-card">
                <h3 className="sidebar-card-title">
                  <Lightbulb size={18} color="var(--warning)" /> Tips Mengajar
                </h3>
                <ul className="tips-list">
                  <li>Gunakan game kuis di awal kelas sebagai aktivitas pemanasan (ice breaker) yang menyenangkan bagi murid.</li>
                  <li>Template <em>Labirin</em> sangat baik untuk menguji refleks sekaligus pemahaman materi para siswa.</li>
                  <li>Isilah deskripsi kuis untuk memberi instruksi cara pengerjaan yang jelas bagi siswa.</li>
                </ul>
              </div>
            </aside>

            {/* Right Column: Main Content */}
            <main className="dashboard-main-content">
              <div className="dashboard-section-header">
                <h3 className="dashboard-section-title">Kuis Saya</h3>
              </div>

              {games.length === 0 ? (
                <div className="glass-panel" style={styles.emptyState}>
                  <div style={styles.emptyIcon}>🎮</div>
                  <h3 style={styles.emptyTitle}>Belum ada kuis yang dibuat</h3>
                  <p style={styles.emptyDesc}>
                    Buat kuis interaktif pertama Anda dan bagikan tautannya langsung kepada para siswa Anda.
                  </p>
                  <button onClick={handleStartCreate} className="btn btn-primary" style={{ marginTop: '16px' }}>
                    <Plus size={18} /> Mulai Buat Kuis
                  </button>
                </div>
              ) : (
                <div style={styles.gamesGrid}>
                  {games.map(game => (
                    <div key={game.id} className="glass-panel" style={styles.gameCard}>
                      <div style={styles.gameCardTypeBadge}>
                        {game.type === 'box' ? (
                          <span style={{ ...styles.badge, background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                            <LayoutGrid size={12} /> Buka Kotak
                          </span>
                        ) : (
                          <span style={{ ...styles.badge, background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
                            <Gamepad2 size={12} /> Labirin
                          </span>
                        )}
                      </div>

                      <h3 style={styles.gameCardTitle}>{game.title}</h3>
                      <p style={styles.gameCardDesc}>{game.desc || 'Tidak ada deskripsi.'}</p>
                      
                      <div style={styles.gameMeta}>
                        <span>📝 {game.questions.length} Soal</span>
                        <span>📅 {game.updatedAt}</span>
                      </div>

                      {copiedId === game.id && (
                        <div style={styles.copiedAlert} className="animate-fade-in">
                          <Check size={14} color="var(--success)" /> Tautan berhasil disalin!
                        </div>
                      )}

                      <div style={styles.gameCardActions}>
                        <button 
                          onClick={() => onPlayGame(game)} 
                          className="btn btn-success" 
                          style={styles.cardBtn}
                          title="Mainkan Game"
                        >
                          <Play size={16} /> Main
                        </button>
                        <button 
                          onClick={(e) => handleShare(game, e)} 
                          className="btn btn-primary" 
                          style={styles.cardBtn}
                          title="Bagikan Tautan Kuis"
                        >
                          <Share2 size={16} /> Bagikan
                        </button>
                        <button 
                          onClick={() => handleEdit(game)} 
                          className="btn btn-secondary" 
                          style={{ ...styles.cardBtn, padding: '10px' }}
                          title="Edit Kuis"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => handleDelete(game.id, e)} 
                          className="btn btn-danger" 
                          style={{ ...styles.cardBtn, padding: '10px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}
                          title="Hapus Kuis"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </main>
          </div>
        </div>
      )}
      {sharedLink && (
        <div style={styles.modalOverlay} onClick={() => setSharedLink('')}>
          <div className="glass-panel animate-fade-in" style={styles.shareModal} onClick={e => e.stopPropagation()}>
            <div style={styles.shareModalHeader}>
              <h3 style={styles.shareModalTitle}>Bagikan Kuis</h3>
              <button onClick={() => setSharedLink('')} style={styles.closeModalBtn}>×</button>
            </div>
            <p style={styles.shareModalDesc}>
              Bagikan link di bawah ini ke murid-murid Anda untuk mulai memainkan kuis secara langsung:
            </p>
            <div style={styles.shareInputContainer}>
              <input 
                type="text" 
                readOnly 
                value={sharedLink} 
                style={styles.shareInput}
                onClick={e => e.target.select()}
              />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(sharedLink);
                  sound.playCorrect();
                  alert('Tautan berhasil disalin!');
                }} 
                className="btn btn-primary"
                style={styles.shareCopyBtn}
              >
                <Copy size={16} /> Salin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '30px 20px',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    gap: '30px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '20px'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  logoBadge: {
    fontSize: '2.5rem',
    background: 'rgba(255,255,255,0.05)',
    padding: '8px',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  logoText: {
    fontSize: '2rem',
    background: 'linear-gradient(135deg, #fff 30%, #818cf8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: '800'
  },
  logoSub: {
    fontSize: '0.9rem',
    color: 'var(--text-muted)'
  },
  editorPanel: {
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    gap: '25px'
  },
  editorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '15px'
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '1rem',
    fontFamily: 'var(--font-display)',
    fontWeight: '600',
    transition: 'color 0.2s',
    outline: 'none'
  },
  editorTitle: {
    fontSize: '1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '30px',
    alignItems: 'start'
  },
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  sectionTitle: {
    fontSize: '1.1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '8px',
    color: '#e2e8f0'
  },
  typeSelector: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  typeCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '16px',
    borderRadius: '12px',
    border: '2px solid',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)'
  },
  typeIcon: {
    padding: '12px',
    borderRadius: '10px',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  typeTextContent: {
    flex: '1',
    textAlign: 'left'
  },
  typeName: {
    fontSize: '1rem',
    color: 'white',
    marginBottom: '2px'
  },
  typeDesc: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    lineHeight: '1.3'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  questionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxHeight: '500px',
    overflowY: 'auto',
    paddingRight: '8px'
  },
  questionCard: {
    background: 'rgba(10, 11, 18, 0.4)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  questionCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  questionNumber: {
    fontWeight: '600',
    fontSize: '0.9rem',
    color: 'var(--accent)'
  },
  deleteQBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(239, 68, 68, 0.6)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
    transition: 'var(--transition-smooth)'
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px'
  },
  optionInputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(10, 11, 18, 0.2)',
    borderRadius: '10px',
    padding: '2px 8px 2px 2px',
    border: '1px solid rgba(255,255,255,0.03)'
  },
  optionLabel: {
    width: '26px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: '700',
    color: 'white',
    flexShrink: 0
  },
  correctRadio: {
    cursor: 'pointer',
    width: '16px',
    height: '16px',
    accentColor: 'var(--success)',
    flexShrink: 0
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '15px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    paddingTop: '20px'
  },
  dashboardContent: {
    width: '100%'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 40px',
    textAlign: 'center',
    maxWidth: '600px',
    margin: '40px auto'
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '20px'
  },
  emptyTitle: {
    fontSize: '1.4rem',
    marginBottom: '10px'
  },
  emptyDesc: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    lineHeight: '1.5'
  },
  gamesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px'
  },
  gameCard: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    textAlign: 'left',
    height: '220px'
  },
  gameCardTypeBadge: {
    marginBottom: '12px'
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 8px',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '600'
  },
  gameCardTitle: {
    fontSize: '1.2rem',
    color: 'white',
    marginBottom: '6px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  gameCardDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    display: '-webkit-box',
    WebkitLineClamp: '2',
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginBottom: '15px',
    lineHeight: '1.4',
    flex: '1'
  },
  gameMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.4)',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    paddingTop: '10px',
    marginBottom: '12px'
  },
  copiedAlert: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '8px',
    padding: '4px 8px',
    fontSize: '0.75rem',
    color: '#34d399',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  gameCardActions: {
    display: 'flex',
    gap: '8px'
  },
  cardBtn: {
    padding: '8px 12px',
    fontSize: '0.8rem',
    flex: '1'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(5, 5, 10, 0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: '20px'
  },
  shareModal: {
    width: '100%',
    maxWidth: '500px',
    padding: '25px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  shareModalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '10px'
  },
  shareModalTitle: {
    fontSize: '1.2rem',
    color: 'white'
  },
  closeModalBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '1.5rem',
    cursor: 'pointer',
    outline: 'none'
  },
  shareModalDesc: {
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    lineHeight: '1.4'
  },
  shareInputContainer: {
    display: 'flex',
    gap: '10px'
  },
  shareInput: {
    flex: '1',
    background: 'rgba(10, 11, 18, 0.6)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: 'white',
    fontSize: '0.85rem',
    outline: 'none'
  },
  shareCopyBtn: {
    padding: '10px 18px',
    fontSize: '0.9rem',
    borderRadius: '10px'
  }
};

