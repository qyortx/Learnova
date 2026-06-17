import { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Clock, RotateCcw, ArrowLeft, 
  CheckCircle, XCircle, HelpCircle, Star, Home
} from 'lucide-react';
import { sound } from '../utils/sound';

export default function OpenTheBox({ game, onBack }) {
  const { title, desc, questions } = game;
  
  // Game states
  const [boxes, setBoxes] = useState(
    questions.map((_, idx) => ({ id: idx, opened: false, isCorrect: null }))
  );
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswering, setIsAnswering] = useState(false); // Controls transition locking
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(0);
  const [gameState, setGameState] = useState('intro'); // 'intro', 'playing', 'ended'
  
  const timerRef = useRef(null);

  // Handle timer
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTime(t => t + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [gameState]);

  const handleStartGame = () => {
    sound.playClick();
    setGameState('playing');
    setTime(0);
    setScore(0);
    setBoxes(questions.map((_, idx) => ({ id: idx, opened: false, isCorrect: null })));
  };

  const handleBoxClick = (idx) => {
    if (gameState !== 'playing' || boxes[idx].opened || isAnswering) return;
    
    sound.playClick();
    setActiveQuestionIdx(idx);
    setSelectedAnswer(null);
  };

  const handleSelectAnswer = (optIndex) => {
    if (selectedAnswer !== null || isAnswering) return;
    
    setSelectedAnswer(optIndex);
    setIsAnswering(true);
    
    const isCorrect = optIndex === questions[activeQuestionIdx].correct;
    
    // Play corresponding sound
    if (isCorrect) {
      sound.playCorrect();
      setScore(s => s + 100);
    } else {
      sound.playIncorrect();
    }

    // Update boxes state
    setBoxes(prev => prev.map(b => b.id === activeQuestionIdx ? { ...b, opened: true, isCorrect } : b));

    // Wait 1.8 seconds before closing active question
    setTimeout(() => {
      setActiveQuestionIdx(null);
      setSelectedAnswer(null);
      setIsAnswering(false);

      // Check if all boxes are opened
      const allOpened = boxes.every((b, idx) => idx === activeQuestionIdx ? true : b.opened);
      if (allOpened) {
        setGameState('ended');
        sound.playWin();
      }
    }, 1800);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getAccuracy = () => {
    const correctCount = boxes.filter(b => b.isCorrect).length;
    return Math.round((correctCount / questions.length) * 100);
  };

  return (
    <div className="game-container">
      {/* Top Header Navigation */}
      <div style={styles.headerNav}>
        <button onClick={() => { sound.playClick(); onBack(); }} style={styles.backBtn}>
          <ArrowLeft size={18} /> Keluar
        </button>
        <span style={styles.gameTitleText}>{title}</span>
      </div>

      {gameState === 'intro' && (
        /* Game Introduction Screen */
        <div className="glass-panel animate-fade-in intro-split-layout">
          <div className="intro-info">
            <div style={styles.gameBadge}>📦 Buka Kotak</div>
            <h2 style={{ ...styles.title, textAlign: 'left', margin: 0 }}>{title}</h2>
            <p style={{ ...styles.desc, textAlign: 'left' }}>{desc || 'Sentuh kotak bernomor untuk membuka pertanyaan dan pilihlah jawaban yang benar.'}</p>
            
            <button onClick={handleStartGame} className="btn btn-primary btn-lg" style={styles.startBtn}>
              Mulai Bermain
            </button>
          </div>
          
          <div className="intro-illustration">
            <h3 className="intro-ill-title"><Star size={16} color="var(--primary)" /> Informasi Kuis</h3>
            <div style={styles.metaRow}>
              <div style={styles.metaItem}>
                <HelpCircle size={20} color="var(--primary)" />
                <span>{questions.length} Pertanyaan</span>
              </div>
            </div>
            <div style={styles.metaRow}>
              <div style={styles.metaItem}>
                <Trophy size={20} color="var(--warning)" />
                <span>100 Poin per Soal</span>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4', marginTop: '10px' }}>
              <strong>Cara bermain:</strong> Klik pada grid kotak bernomor di sebelah kiri. Jawablah soal pilihan ganda yang muncul dengan benar untuk mendapatkan skor!
            </p>
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        /* Main Playing Area with Split Layout */
        <div className="game-split-layout animate-fade-in">
          {/* Left Panel: Grid of Boxes */}
          <div className="box-grid-panel">
            <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'center', marginBottom: '8px' }}>
              Pilih Kotak Soal:
            </div>
            <div style={styles.boxGrid}>
              {boxes.map((box, idx) => (
                <div 
                  key={box.id}
                  onClick={() => handleBoxClick(idx)}
                  style={{
                    ...styles.box,
                    cursor: box.opened ? 'default' : 'pointer',
                    transform: box.opened ? 'rotateY(180deg)' : 'none',
                    opacity: box.opened ? 0.75 : 1,
                    boxShadow: box.opened ? 'none' : 'var(--shadow-lg)'
                  }}
                  className={!box.opened ? "animate-pulse-glow" : ""}
                >
                  {/* Front Side: Numbered box */}
                  <div style={styles.boxFront}>
                    <div style={styles.boxGlow}></div>
                    <span style={styles.boxNumber}>{idx + 1}</span>
                  </div>

                  {/* Back Side: Solved Indicator */}
                  <div style={{
                    ...styles.boxBack,
                    background: box.isCorrect 
                      ? 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, rgba(6, 95, 70, 0.4) 100%)' 
                      : 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, rgba(153, 27, 27, 0.4) 100%)',
                    borderColor: box.isCorrect ? 'var(--success)' : 'var(--danger)'
                  }}>
                    {box.isCorrect ? (
                      <CheckCircle size={48} color="var(--success)" style={{ transform: 'scaleX(-1)' }} />
                    ) : (
                      <XCircle size={48} color="var(--danger)" style={{ transform: 'scaleX(-1)' }} />
                    )}
                    <span style={{ ...styles.boxBackNumber, transform: 'scaleX(-1)' }}>#{idx + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel: Stats / Active Question Card */}
          <div className="game-sidebar">
            {activeQuestionIdx === null ? (
              /* If no box is selected, show general stats & guide */
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', fontWeight: '600' }}>
                  Status Permainan
                </h3>
                
                {/* Stats list in card layout */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ ...styles.stat, justifyContent: 'flex-start', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <Trophy size={20} color="var(--warning)" />
                    <div>
                      <span style={styles.statLabel}>SKOR</span>
                      <span style={styles.statValue}>{score}</span>
                    </div>
                  </div>
                  
                  <div style={{ ...styles.stat, justifyContent: 'flex-start', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <Clock size={20} color="var(--primary)" />
                    <div>
                      <span style={styles.statLabel}>WAKTU</span>
                      <span style={styles.statValue}>{formatTime(time)}</span>
                    </div>
                  </div>
                  
                  <div style={{ ...styles.stat, justifyContent: 'flex-start', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <Star size={20} color="var(--secondary)" />
                    <div>
                      <span style={styles.statLabel}>PROGRES</span>
                      <span style={styles.statValue}>
                        {boxes.filter(b => b.opened).length} / {questions.length} Kotak
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px dashed rgba(99, 102, 241, 0.2)', borderRadius: '10px', padding: '14px', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4', textAlign: 'center' }}>
                  💡 <strong>Petunjuk:</strong> Pilih kotak bernomor di sebelah kiri untuk membuka pertanyaan kuis. Jawablah secepat mungkin untuk performa terbaik!
                </div>
              </div>
            ) : (
              /* If a box is selected, show active question directly here! */
              <div 
                className={`glass-panel active-q-card animate-fade-in ${selectedAnswer !== null && selectedAnswer !== questions[activeQuestionIdx].correct ? 'animate-shake' : ''}`}
                style={{
                  borderColor: selectedAnswer === null 
                    ? 'var(--panel-border)' 
                    : selectedAnswer === questions[activeQuestionIdx].correct 
                      ? 'var(--success)' 
                      : 'var(--danger)'
                }}
              >
                <div className="active-q-header">
                  PERTANYAAN KOTAK #{activeQuestionIdx + 1}
                </div>
                
                <h3 className="active-q-text">{questions[activeQuestionIdx].q}</h3>

                <div style={styles.optionsContainer}>
                  {questions[activeQuestionIdx].options.map((option, optIdx) => {
                    const isCorrectAnswer = optIdx === questions[activeQuestionIdx].correct;
                    const isSelected = optIdx === selectedAnswer;
                    
                    let optionStyle = { ...styles.optionButton };
                    if (selectedAnswer !== null) {
                      if (isCorrectAnswer) {
                        optionStyle.borderColor = 'var(--success)';
                        optionStyle.background = 'rgba(16, 185, 129, 0.2)';
                        optionStyle.color = '#34d399';
                      } else if (isSelected) {
                        optionStyle.borderColor = 'var(--danger)';
                        optionStyle.background = 'rgba(239, 68, 68, 0.2)';
                        optionStyle.color = '#f87171';
                      } else {
                        optionStyle.opacity = 0.4;
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        disabled={selectedAnswer !== null}
                        onClick={() => handleSelectAnswer(optIdx)}
                        style={optionStyle}
                        className={selectedAnswer === null ? "btn-secondary" : ""}
                      >
                        <span style={{
                          ...styles.optionBadge,
                          background: selectedAnswer === null 
                            ? 'rgba(255,255,255,0.08)' 
                            : isCorrectAnswer 
                              ? 'var(--success)' 
                              : isSelected 
                                ? 'var(--danger)' 
                                : 'rgba(255,255,255,0.05)'
                        }}>
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span style={styles.optionText}>{option}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {gameState === 'ended' && (
        /* Scoreboard Screen with Split Layout */
        <div className="glass-panel animate-fade-in ended-split-layout">
          {/* Left Column: Stats */}
          <div className="ended-stats-panel">
            <div style={styles.trophyIcon}>🏆</div>
            <h2 style={styles.victoryTitle}>Kuis Selesai!</h2>
            <p style={styles.victorySubtitle}>Kerja bagus! Anda telah menyelesaikan semua tantangan.</p>

            <div style={styles.scoreBoardGrid}>
              <div style={styles.scoreItem}>
                <span style={styles.scoreVal}>{score}</span>
                <span style={styles.scoreLbl}>Total Skor</span>
              </div>
              <div style={styles.scoreItem}>
                <span style={styles.scoreVal}>{formatTime(time)}</span>
                <span style={styles.scoreLbl}>Waktu Total</span>
              </div>
              <div style={styles.scoreItem}>
                <span style={styles.scoreVal}>{getAccuracy()}%</span>
                <span style={styles.scoreLbl}>Akurasi</span>
              </div>
            </div>

            <div style={styles.endActions}>
              <button onClick={() => { sound.playClick(); onBack(); }} className="btn btn-secondary" style={{ flex: 1 }}>
                <Home size={18} /> Menu
              </button>
              <button onClick={handleStartGame} className="btn btn-primary" style={{ flex: 1 }}>
                <RotateCcw size={18} /> Main Lagi
              </button>
            </div>
          </div>

          {/* Right Column: Answer Review */}
          <div className="ended-review-panel">
            <h3 style={{ ...styles.summaryTitle, marginTop: 0 }}>Tinjauan Jawaban</h3>
            <div style={{ ...styles.summaryList, maxHeight: '380px' }}>
              {questions.map((q, idx) => {
                const box = boxes.find(b => b.id === idx);
                return (
                  <div key={idx} style={styles.summaryRow}>
                    <div style={styles.summaryQInfo}>
                      <span style={{
                        ...styles.summaryNumber,
                        background: box?.isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: box?.isCorrect ? 'var(--success)' : 'var(--danger)'
                      }}>
                        #{idx + 1}
                      </span>
                      <span style={styles.summaryQText}>{q.q}</span>
                    </div>
                    <div style={styles.summaryAnsInfo}>
                      <span style={styles.correctLabel}>Kunci: {q.options[q.correct]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px 15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    minHeight: '100vh',
    justifyContent: 'center'
  },
  headerNav: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    width: '100%',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    fontWeight: '600',
    fontSize: '0.95rem'
  },
  gameTitleText: {
    fontWeight: '700',
    fontSize: '1.2rem',
    color: 'white',
    fontFamily: 'var(--font-display)'
  },
  introCard: {
    padding: '40px 30px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px'
  },
  gameBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    background: 'rgba(99, 102, 241, 0.15)',
    color: '#818cf8',
    fontSize: '0.85rem',
    fontWeight: '700',
    fontFamily: 'var(--font-display)'
  },
  title: {
    fontSize: '2.2rem',
    background: 'linear-gradient(135deg, #fff 40%, #a855f7 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  desc: {
    color: 'var(--text-muted)',
    lineHeight: '1.6',
    fontSize: '1.05rem',
    maxWidth: '550px'
  },
  metaRow: {
    display: 'flex',
    gap: '20px',
    marginTop: '10px'
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.95rem',
    color: 'white',
    background: 'rgba(255,255,255,0.03)',
    padding: '8px 16px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.05)'
  },
  startBtn: {
    marginTop: '15px',
    padding: '14px 36px',
    fontSize: '1.1rem'
  },
  playArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  statsBar: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '15px',
    alignItems: 'center'
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  statLabel: {
    display: 'block',
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontWeight: '700',
    letterSpacing: '0.05em'
  },
  statValue: {
    display: 'block',
    fontSize: '1.2rem',
    fontWeight: '800',
    color: 'white',
    fontFamily: 'var(--font-display)'
  },
  boxGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, 165px)',
    gap: '15px',
    perspective: '1000px',
    justifyContent: 'center'
  },
  box: {
    height: '165px',
    borderRadius: '16px',
    transformStyle: 'preserve-3d',
    transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative'
  },
  boxFront: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
    border: '2px solid rgba(99, 102, 241, 0.25)',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  boxGlow: {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 60%)',
    pointerEvents: 'none'
  },
  boxNumber: {
    fontSize: '3.2rem',
    fontWeight: '800',
    fontFamily: 'var(--font-display)',
    color: '#818cf8',
    textShadow: '0 0 10px rgba(99, 102, 241, 0.5)'
  },
  boxBack: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    transform: 'rotateY(180deg)',
    borderRadius: '16px',
    border: '2px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  boxBackNumber: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)'
  },
  questionOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(5, 5, 10, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '20px'
  },
  questionModal: {
    width: '100%',
    maxWidth: '600px',
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    borderWidth: '2px'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'center'
  },
  questionLabel: {
    fontSize: '0.8rem',
    fontWeight: '800',
    color: 'var(--primary)',
    letterSpacing: '0.1em'
  },
  questionText: {
    fontSize: '1.4rem',
    color: 'white',
    lineHeight: '1.4',
    textAlign: 'center',
    margin: '10px 0'
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  optionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '16px 24px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.02)',
    color: 'white',
    cursor: 'pointer',
    fontSize: '1.15rem',
    textAlign: 'left',
    transition: 'all 0.2s ease-in-out'
  },
  optionBadge: {
    width: '38px',
    height: '38px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1rem',
    fontWeight: '800',
    color: 'white',
    flexShrink: 0
  },
  optionText: {
    fontWeight: '500'
  },
  endedCard: {
    padding: '40px 30px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    maxWidth: '650px',
    margin: '0 auto'
  },
  trophyIcon: {
    fontSize: '4.5rem',
    animation: 'float 3s ease-in-out infinite'
  },
  victoryTitle: {
    fontSize: '2.2rem',
    color: 'white'
  },
  victorySubtitle: {
    color: 'var(--text-muted)',
    fontSize: '1rem',
    marginTop: '-8px'
  },
  scoreBoardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
    width: '100%',
    margin: '10px 0'
  },
  scoreItem: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '16px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  scoreVal: {
    fontSize: '1.6rem',
    fontWeight: '800',
    color: '#818cf8',
    fontFamily: 'var(--font-display)'
  },
  scoreLbl: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontWeight: '600'
  },
  summaryTitle: {
    fontSize: '1.2rem',
    alignSelf: 'flex-start',
    marginTop: '15px',
    color: 'white',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    width: '100%',
    textAlign: 'left',
    paddingBottom: '8px'
  },
  summaryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
    maxHeight: '220px',
    overflowY: 'auto',
    paddingRight: '6px',
    textAlign: 'left'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(10,11,18,0.2)',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.03)',
    flexWrap: 'wrap',
    gap: '10px'
  },
  summaryQInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  summaryNumber: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '0.8rem'
  },
  summaryQText: {
    fontSize: '0.9rem',
    color: 'white',
    fontWeight: '500'
  },
  summaryAnsInfo: {
    fontSize: '0.85rem'
  },
  correctLabel: {
    color: 'var(--success)',
    fontWeight: '600'
  },
  endActions: {
    display: 'flex',
    gap: '15px',
    marginTop: '15px',
    width: '100%'
  }
};
