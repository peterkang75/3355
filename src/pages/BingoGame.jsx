import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { io } from 'socket.io-client';
import { checkIsOperator } from '../utils';
import PageHeader from '../components/common/PageHeader';

function BingoGame() {
  const navigate = useNavigate();
  const { user, members } = useApp();
  const socketRef = useRef(null);
  
  const [serverGridSize, setServerGridSize] = useState(5);
  const [serverTargetLines, setServerTargetLines] = useState(5);
  const [localGridSize, setLocalGridSize] = useState(5);
  const [localTargetLines, setLocalTargetLines] = useState(5);
  
  const [bingoGrid, setBingoGrid] = useState([]);
  const [selectedCells, setSelectedCells] = useState([]);
  const [isEditMode, setIsEditMode] = useState(true);
  const [bingoLines, setBingoLines] = useState([]);
  const [showBingo, setShowBingo] = useState(false);
  const [usedMembers, setUsedMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [showOperatorSettings, setShowOperatorSettings] = useState(false);

  const isOperator = checkIsOperator(user);
  const storageKey = `bingoBoard:${user?.id || 'guest'}`;

  useEffect(() => {
    loadSettings();
    
    const socket = io();
    socketRef.current = socket;
    
    socket.on('bingo:settings', (settings) => {
      if (settings) {
        setServerGridSize(settings.gridSize);
        setServerTargetLines(settings.bingoTargetLines);
      }
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (serverGridSize > 0 && serverTargetLines > 0) {
      const gridChanged = serverGridSize !== localGridSize;
      const targetChanged = serverTargetLines !== localTargetLines;

      // 운영자는 직접 설정을 변경하므로 알림 불필요
      if (!isOperator) {
        if (gridChanged) {
          setSettingsChanged(true);
        } else if (targetChanged) {
          setLocalTargetLines(serverTargetLines);
        }
      }
    }
  }, [serverGridSize, serverTargetLines, localGridSize]);

  useEffect(() => {
    if (!isEditMode && bingoGrid.length > 0) {
      checkBingo();
    }
  }, [selectedCells, isEditMode, bingoGrid, localTargetLines]);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/bingo-settings');
      if (response.ok) {
        const settings = await response.json();
        setServerGridSize(settings.gridSize);
        setServerTargetLines(settings.bingoTargetLines);
        
        const savedBoard = localStorage.getItem(storageKey);
        if (savedBoard) {
          const parsed = JSON.parse(savedBoard);
          if (parsed.gridSize === settings.gridSize) {
            setLocalGridSize(parsed.gridSize);
            setLocalTargetLines(settings.bingoTargetLines);
            setBingoGrid(parsed.bingoGrid || []);
            setUsedMembers(parsed.usedMembers || []);
            setSelectedCells(parsed.selectedCells || []);
            setIsEditMode(parsed.isEditMode !== false);
          } else {
            initializeGrid(settings.gridSize);
            setLocalGridSize(settings.gridSize);
            setLocalTargetLines(settings.bingoTargetLines);
          }
        } else {
          initializeGrid(settings.gridSize);
          setLocalGridSize(settings.gridSize);
          setLocalTargetLines(settings.bingoTargetLines);
        }
      }
    } catch (error) {
      console.error('Error loading bingo settings:', error);
      initializeGrid(5);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeGrid = (size) => {
    const newGrid = Array(size).fill(null).map(() => Array(size).fill(''));
    setBingoGrid(newGrid);
    setSelectedCells([]);
    setBingoLines([]);
    setShowBingo(false);
    setIsEditMode(true);
    setUsedMembers([]);
    setSelectedMember(null);
  };

  const handleApplyNewSettings = () => {
    const newGrid = Array(serverGridSize).fill(null).map(() => Array(serverGridSize).fill(''));
    setBingoGrid(newGrid);
    setSelectedCells([]);
    setBingoLines([]);
    setShowBingo(false);
    setIsEditMode(true);
    setUsedMembers([]);
    setSelectedMember(null);
    setLocalGridSize(serverGridSize);
    setLocalTargetLines(serverTargetLines);
    setSettingsChanged(false);
    
    localStorage.setItem(storageKey, JSON.stringify({
      gridSize: serverGridSize,
      bingoGrid: newGrid,
      usedMembers: [],
      selectedCells: [],
      isEditMode: true
    }));
  };

  const handleOperatorGridSizeChange = (newSize) => {
    if (newSize >= 3 && newSize <= 10 && isOperator) {
      setLocalGridSize(newSize);
      setLocalTargetLines(newSize);
    }
  };

  const handleOperatorTargetLinesChange = (newLines) => {
    if (isOperator) {
      setLocalTargetLines(newLines);
    }
  };

  const handleOperatorSaveSettings = async () => {
    if (!isOperator) return;
    
    const gridSizeChanged = localGridSize !== serverGridSize;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/bingo-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gridSize: localGridSize,
          bingoTargetLines: localTargetLines
        })
      });
      
      if (response.ok) {
        setServerGridSize(localGridSize);
        setServerTargetLines(localTargetLines);
        setSettingsChanged(false);
        
        if (gridSizeChanged) {
          initializeGrid(localGridSize);
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.error('Error saving bingo settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMemberSelect = (nickname) => {
    if (!isEditMode) return;
    if (selectedMember === nickname) {
      setSelectedMember(null);
    } else {
      setSelectedMember(nickname);
    }
  };

  const handleCellClick = (row, col) => {
    if (isEditMode) {
      if (selectedMember) {
        const newGrid = bingoGrid.map(r => [...r]);
        const oldValue = newGrid[row][col];
        let newUsedMembers = usedMembers;
        if (oldValue) {
          newUsedMembers = usedMembers.filter(m => m !== oldValue);
        }
        newGrid[row][col] = selectedMember;
        newUsedMembers = [...newUsedMembers.filter(m => m !== selectedMember), selectedMember];
        setBingoGrid(newGrid);
        setUsedMembers(newUsedMembers);
        setSelectedMember(null);
        
        localStorage.setItem(storageKey, JSON.stringify({
          gridSize: localGridSize,
          bingoGrid: newGrid,
          usedMembers: newUsedMembers,
          selectedCells: [],
          isEditMode: true
        }));
      } else if (bingoGrid[row][col]) {
        const removedMember = bingoGrid[row][col];
        const newGrid = bingoGrid.map(r => [...r]);
        newGrid[row][col] = '';
        const newUsedMembers = usedMembers.filter(m => m !== removedMember);
        setBingoGrid(newGrid);
        setUsedMembers(newUsedMembers);
        
        localStorage.setItem(storageKey, JSON.stringify({
          gridSize: localGridSize,
          bingoGrid: newGrid,
          usedMembers: newUsedMembers,
          selectedCells: [],
          isEditMode: true
        }));
      }
    } else {
      const cellKey = `${row}-${col}`;
      if (bingoGrid[row][col]) {
        if (selectedCells.includes(cellKey)) {
          setSelectedCells(selectedCells.filter(c => c !== cellKey));
        } else {
          setSelectedCells([...selectedCells, cellKey]);
        }
      }
    }
  };

  const handleDragStart = (e, nickname) => {
    if (!isEditMode) return;
    setSelectedMember(nickname);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', nickname);
  };

  const handleDragEnd = () => {
    setDragOverCell(null);
  };

  const handleDragOver = (e, row, col) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCell(`${row}-${col}`);
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = (e, row, col) => {
    if (!isEditMode) return;
    e.preventDefault();
    setDragOverCell(null);
    const nickname = e.dataTransfer.getData('text/plain') || selectedMember;
    
    if (nickname && isEditMode) {
      const newGrid = bingoGrid.map(r => [...r]);
      const oldValue = newGrid[row][col];
      let newUsedMembers = usedMembers;
      if (oldValue) {
        newUsedMembers = usedMembers.filter(m => m !== oldValue);
      }
      newGrid[row][col] = nickname;
      newUsedMembers = [...newUsedMembers.filter(m => m !== nickname), nickname];
      setBingoGrid(newGrid);
      setUsedMembers(newUsedMembers);
      setSelectedMember(null);
      
      localStorage.setItem(storageKey, JSON.stringify({
        gridSize: localGridSize,
        bingoGrid: newGrid,
        usedMembers: newUsedMembers,
        selectedCells: [],
        isEditMode: true
      }));
    }
  };

  const saveToLocalStorage = (overrides = {}) => {
    localStorage.setItem(storageKey, JSON.stringify({
      gridSize: localGridSize,
      bingoGrid,
      usedMembers,
      selectedCells,
      isEditMode,
      ...overrides
    }));
  };

  const handleSaveBoard = () => {
    setIsEditMode(false);
    setSelectedMember(null);
    setSelectedCells([]);
    localStorage.setItem(storageKey, JSON.stringify({
      gridSize: localGridSize,
      bingoGrid,
      usedMembers,
      selectedCells: [],
      isEditMode: false
    }));
  };

  const handleResetBoard = () => {
    initializeGrid(localGridSize);
    localStorage.removeItem(storageKey);
  };

  const handleEditMode = () => {
    setIsEditMode(true);
  };

  const handleClearSelection = () => {
    setSelectedCells([]);
    setBingoLines([]);
    setShowBingo(false);
    localStorage.setItem(storageKey, JSON.stringify({
      gridSize: localGridSize,
      bingoGrid,
      usedMembers,
      selectedCells: [],
      isEditMode: false
    }));
  };

  useEffect(() => {
    if (!isEditMode && bingoGrid.length > 0 && storageKey) {
      localStorage.setItem(storageKey, JSON.stringify({
        gridSize: localGridSize,
        bingoGrid,
        usedMembers,
        selectedCells,
        isEditMode: false
      }));
    }
  }, [selectedCells, bingoGrid, usedMembers, localGridSize, isEditMode, storageKey]);

  const checkBingo = () => {
    const lines = [];
    const size = localGridSize;

    for (let row = 0; row < size; row++) {
      let complete = true;
      for (let col = 0; col < size; col++) {
        if (!selectedCells.includes(`${row}-${col}`) || !bingoGrid[row]?.[col]) {
          complete = false;
          break;
        }
      }
      if (complete) {
        lines.push({ type: 'row', index: row });
      }
    }

    for (let col = 0; col < size; col++) {
      let complete = true;
      for (let row = 0; row < size; row++) {
        if (!selectedCells.includes(`${row}-${col}`) || !bingoGrid[row]?.[col]) {
          complete = false;
          break;
        }
      }
      if (complete) {
        lines.push({ type: 'col', index: col });
      }
    }

    let diag1Complete = true;
    for (let i = 0; i < size; i++) {
      if (!selectedCells.includes(`${i}-${i}`) || !bingoGrid[i]?.[i]) {
        diag1Complete = false;
        break;
      }
    }
    if (diag1Complete) {
      lines.push({ type: 'diag1' });
    }

    let diag2Complete = true;
    for (let i = 0; i < size; i++) {
      if (!selectedCells.includes(`${i}-${size - 1 - i}`) || !bingoGrid[i]?.[size - 1 - i]) {
        diag2Complete = false;
        break;
      }
    }
    if (diag2Complete) {
      lines.push({ type: 'diag2' });
    }

    setBingoLines(lines);
    if (lines.length >= localTargetLines && !showBingo) {
      setShowBingo(true);
    }
  };

  const isCellInBingoLine = (row, col) => {
    for (const line of bingoLines) {
      if (line.type === 'row' && line.index === row) return true;
      if (line.type === 'col' && line.index === col) return true;
      if (line.type === 'diag1' && row === col) return true;
      if (line.type === 'diag2' && row === localGridSize - 1 - col) return true;
    }
    return false;
  };

  const availableMembers = members.filter(m => !usedMembers.includes(m.nickname || m.name));

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-light)' }}>로딩중...</div>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="빙고 게임" onBack={() => navigate('/about')} user={user} />

      <div className="page-content" style={{ paddingTop: '12px', paddingBottom: 100 }}>

        {/* ── 타이틀 히어로 카드 ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0047AB 0%, #1565c0 55%, #1976d2 100%)',
          borderRadius: 20,
          padding: '22px 20px 26px',
          marginBottom: 14,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* 주사위 SVG — 우측 하단, 크게 */}
          <svg style={{ position: 'absolute', right: -2, bottom: -6, opacity: 0.22, pointerEvents: 'none' }} width="100" height="100" viewBox="0 0 120 120" fill="none">
            <rect x="8" y="8" width="104" height="104" rx="20" stroke="white" strokeWidth="5" fill="none"/>
            <circle cx="36" cy="36" r="8" fill="white"/>
            <circle cx="84" cy="36" r="8" fill="white"/>
            <circle cx="36" cy="84" r="8" fill="white"/>
            <circle cx="84" cy="84" r="8" fill="white"/>
            <circle cx="60" cy="60" r="8" fill="white"/>
          </svg>
          {/* BINGO CHALLENGE 배지 */}
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.18)', borderRadius: 20, padding: '4px 12px', marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.92)', letterSpacing: '0.1em' }}>BINGO CHALLENGE</span>
          </div>
          <div style={{ position: 'relative', fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 10, letterSpacing: '-0.03em', lineHeight: 1.25 }}>
            빙고 대전!<br/>누가 먼저 완성할까?!
          </div>
          <div style={{ position: 'relative', fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 1.6 }}>
            참여 멤버를 선택하여 빙고판을 채우고 게임을 시작하세요.
          </div>
        </div>

        {/* ── BINGO 달성 배너 ── */}
        {showBingo && (
          <div style={{
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            padding: '20px',
            borderRadius: 16,
            textAlign: 'center',
            marginBottom: 14,
            animation: 'pulse 0.5s ease-in-out infinite alternate'
          }}>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#fff', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
              🎉 BINGO! 🎉
            </div>
            <div style={{ fontSize: '16px', color: '#fff', marginTop: '8px' }}>
              {bingoLines.length}줄 빙고 완성!
            </div>
          </div>
        )}

        {/* ── 설정 변경 알림 ── */}
        {settingsChanged && !isOperator && (
          <div style={{ background: 'rgba(255,193,7,0.12)', border: '1px solid #ffc107', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#856404' }}>
              ⚠️ 운영자가 빙고 설정을 변경했습니다
            </div>
            <div style={{ fontSize: '13px', marginBottom: '12px', color: '#856404' }}>
              새 설정: {serverGridSize}x{serverGridSize} / 목표 {serverTargetLines}줄
            </div>
            <button onClick={handleApplyNewSettings} style={{ width: '100%', padding: '10px', background: '#ffc107', color: '#212529', border: 'none', borderRadius: 8, fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              새 설정 적용하기 (빙고판 초기화)
            </button>
          </div>
        )}

        {/* ── 게임 설정 아코디언 (운영자만) ── */}
        {isOperator && (
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 14, overflow: 'hidden' }}>
            <div onClick={() => setShowOperatorSettings(prev => !prev)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer', userSelect: 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </div>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#1E293B' }}>게임 설정</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transition: 'transform 0.25s', transform: showOperatorSettings ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            <div style={{ maxHeight: showOperatorSettings ? 320 : 0, overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
              <div style={{ padding: '0 16px 16px', borderTop: '1px solid #F1F5F9' }}>
                {/* 목표 라인 */}
                <div style={{ paddingTop: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, marginBottom: 8 }}>목표 라인 설정</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { label: '3 라인', gridSize: 3, targetLines: 3 },
                      { label: '5 라인', gridSize: 5, targetLines: 5 },
                      { label: '올 빙고', gridSize: 5, targetLines: 12 },
                    ].map(({ label, gridSize, targetLines }) => {
                      const isActive = localGridSize === gridSize && localTargetLines === targetLines;
                      return (
                        <button key={label}
                          onClick={() => { handleOperatorGridSizeChange(gridSize); handleOperatorTargetLinesChange(targetLines); }}
                          style={{ flex: 1, padding: '10px 0', background: isActive ? '#0047AB' : '#F1F5F9', color: isActive ? '#fff' : '#475569', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button onClick={handleOperatorSaveSettings} disabled={isSaving}
                  style={{ width: '100%', padding: '12px', background: isSaving ? '#CBD5E1' : '#0047AB', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                  {isSaving ? '저장 중...' : '설정 저장 (모든 회원에게 알림)'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 참여 가능한 멤버 ── */}
        {isEditMode && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>참여 가능한 멤버</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, background: '#EFF6FF', color: '#0047AB', padding: '3px 10px', borderRadius: 20 }}>
                  {availableMembers.length}명 대기중
                </span>
                <button onClick={handleResetBoard}
                  style={{ padding: '5px 12px', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  초기화
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {availableMembers.map((member, idx) => {
                const nickname = member.nickname || member.name;
                const isSelected = selectedMember === nickname;
                return (
                  <div key={idx} draggable
                    onDragStart={(e) => handleDragStart(e, nickname)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleMemberSelect(nickname)}
                    style={{
                      padding: '7px 13px',
                      background: isSelected ? '#0047AB' : '#fff',
                      color: isSelected ? '#fff' : '#1E293B',
                      border: `2px solid ${isSelected ? '#0047AB' : '#E2E8F0'}`,
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                      boxShadow: isSelected ? '0 2px 8px rgba(0,71,171,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
                      transition: 'all 0.15s ease',
                    }}>
                    {isSelected && <span style={{ marginRight: 4 }}>✓</span>}
                    {nickname}
                  </div>
                );
              })}
              {availableMembers.length === 0 && (
                <div style={{ fontSize: 13, color: '#94A3B8', padding: '6px 2px' }}>모든 회원이 배치되었습니다</div>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 8 }}>
              총 {members.length}명 중 {usedMembers.length}명 배치됨
            </div>
          </div>
        )}

        {/* ── 선택된 멤버 안내 ── */}
        {isEditMode && selectedMember && (
          <div style={{ background: 'linear-gradient(90deg, #FFD700, #FFA500)', borderRadius: 12, padding: '12px 16px', marginBottom: 14, textAlign: 'center', color: '#fff', fontSize: 14, fontWeight: 700, boxShadow: '0 2px 10px rgba(255,165,0,0.35)' }}>
            ✓ "{selectedMember}" 선택됨 — 빙고판의 칸을 터치하세요!
          </div>
        )}

        {/* ── 빙고 그리드 ── */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '14px 12px 12px', marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${localGridSize}, 1fr)`, gap: '6px', marginBottom: 12 }}>
            {bingoGrid.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const cellKey = `${rowIndex}-${colIndex}`;
                const isSelected = selectedCells.includes(cellKey);
                const isInBingoLine = isCellInBingoLine(rowIndex, colIndex);
                const isDragOver = dragOverCell === cellKey;
                const canDrop = isEditMode && selectedMember;
                return (
                  <div key={cellKey}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    onDragOver={isEditMode ? (e) => handleDragOver(e, rowIndex, colIndex) : undefined}
                    onDragLeave={handleDragLeave}
                    onDrop={isEditMode ? (e) => handleDrop(e, rowIndex, colIndex) : undefined}
                    style={{
                      aspectRatio: '1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: isDragOver ? '3px solid #FFD700' : isEditMode ? (canDrop ? '2px dashed #0047AB' : '2px dashed #CBD5E1') : '1px solid #E2E8F0',
                      borderRadius: 10,
                      fontSize: localGridSize > 7 ? '11px' : localGridSize > 5 ? '12px' : '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: isDragOver ? 'rgba(255,215,0,0.25)' : isInBingoLine ? 'linear-gradient(135deg, #FFD700, #FFA500)' : isSelected ? '#0047AB' : isEditMode && canDrop ? 'rgba(0,71,171,0.06)' : '#FAFAFA',
                      color: (isSelected || isInBingoLine) ? 'white' : '#1E293B',
                      transition: 'all 0.15s ease',
                      padding: 4, textAlign: 'center', wordBreak: 'break-all', overflow: 'hidden', minHeight: 50, lineHeight: 1.2
                    }}>
                    {cell}
                  </div>
                );
              })
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0047AB' }}>현재 빙고: {bingoLines.length}줄</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>목표: {localTargetLines}줄</span>
          </div>
        </div>

        {/* ── 플레이 모드 버튼 ── */}
        {!isEditMode && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleEditMode}
              style={{ flex: 1, padding: '13px 0', background: '#475569', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              편집 모드
            </button>
            <button onClick={handleClearSelection}
              style={{ flex: 1, padding: '13px 0', background: '#94A3B8', color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              선택 초기화
            </button>
          </div>
        )}
      </div>

      {/* ── 저장 및 게임 시작 (하단 고정) ── */}
      {isEditMode && !selectedMember && (
        <div style={{ position: 'fixed', bottom: 'calc(60px + env(safe-area-inset-bottom))', left: 0, right: 0, padding: '0 16px 10px', zIndex: 100 }}>
          <button onClick={handleSaveBoard}
            style={{ width: '100%', padding: '16px 0', background: 'linear-gradient(90deg, #0047AB 0%, #1565c0 100%)', color: 'white', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,71,171,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            저장 및 게임 시작
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          from { transform: scale(1); }
          to { transform: scale(1.02); }
        }
      `}</style>
    </>
  );
}

export default BingoGame;
