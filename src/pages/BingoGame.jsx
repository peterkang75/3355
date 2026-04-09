import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { io } from 'socket.io-client';
import { checkIsOperator } from '../utils';

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
      
      if (gridChanged) {
        setSettingsChanged(true);
      } else if (targetChanged) {
        setLocalTargetLines(serverTargetLines);
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
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)' }}>
      <div className="header">
        <button
          onClick={() => navigate('/about')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0',
            color: 'var(--text-light)',
            minWidth: '24px'
          }}
        >
          ‹
        </button>
        <h1 style={{ flex: 1, marginLeft: '12px' }}>빙고 게임</h1>
      </div>

      <div className="content" style={{ paddingBottom: '20px' }}>
        {showBingo && (
          <div style={{
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            marginBottom: '16px',
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

        {settingsChanged && (
          <div className="card" style={{ marginBottom: '16px', background: 'rgba(255, 193, 7, 0.15)', border: '1px solid #ffc107' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#856404' }}>
              ⚠️ 운영자가 빙고 설정을 변경했습니다
            </div>
            <div style={{ fontSize: '13px', marginBottom: '12px', color: '#856404' }}>
              새 설정: {serverGridSize}x{serverGridSize} / 목표 {serverTargetLines}줄
            </div>
            <button
              onClick={handleApplyNewSettings}
              style={{
                width: '100%',
                padding: '10px',
                background: '#ffc107',
                color: '#212529',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              새 설정 적용하기 (빙고판 초기화)
            </button>
          </div>
        )}

        {isOperator && (
          <div className="card" style={{ marginBottom: '16px', background: 'rgba(0,128,0,0.05)', border: '1px solid var(--primary-green)' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--primary-green)' }}>
              📋 운영자 설정 (모든 회원에게 적용)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>배열:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                  <button
                    onClick={() => handleOperatorGridSizeChange(localGridSize - 1)}
                    disabled={localGridSize <= 3}
                    style={{
                      width: '36px',
                      height: '36px',
                      background: localGridSize <= 3 ? '#ccc' : 'var(--primary-green)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px 0 0 6px',
                      fontSize: '20px',
                      fontWeight: '700',
                      cursor: localGridSize <= 3 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    −
                  </button>
                  <div style={{
                    width: '40px',
                    height: '36px',
                    background: 'white',
                    border: '2px solid var(--border-color)',
                    borderLeft: 'none',
                    borderRight: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: '700'
                  }}>
                    {localGridSize}
                  </div>
                  <button
                    onClick={() => handleOperatorGridSizeChange(localGridSize + 1)}
                    disabled={localGridSize >= 10}
                    style={{
                      width: '36px',
                      height: '36px',
                      background: localGridSize >= 10 ? '#ccc' : 'var(--primary-green)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0 6px 6px 0',
                      fontSize: '20px',
                      fontWeight: '700',
                      cursor: localGridSize >= 10 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>빙고 줄수:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                  <button
                    onClick={() => handleOperatorTargetLinesChange(Math.max(1, localTargetLines - 1))}
                    disabled={localTargetLines <= 1}
                    style={{
                      width: '36px',
                      height: '36px',
                      background: localTargetLines <= 1 ? '#ccc' : 'var(--primary-green)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px 0 0 6px',
                      fontSize: '20px',
                      fontWeight: '700',
                      cursor: localTargetLines <= 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    −
                  </button>
                  <div style={{
                    width: '40px',
                    height: '36px',
                    background: 'white',
                    border: '2px solid var(--border-color)',
                    borderLeft: 'none',
                    borderRight: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: '700'
                  }}>
                    {localTargetLines}
                  </div>
                  <button
                    onClick={() => handleOperatorTargetLinesChange(localTargetLines + 1)}
                    style={{
                      width: '36px',
                      height: '36px',
                      background: 'var(--primary-green)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0 6px 6px 0',
                      fontSize: '20px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={handleOperatorSaveSettings}
              disabled={isSaving}
              style={{
                width: '100%',
                padding: '10px',
                background: isSaving ? '#ccc' : 'var(--primary-green)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isSaving ? 'not-allowed' : 'pointer'
              }}
            >
              {isSaving ? '저장 중...' : '설정 저장 (모든 회원에게 알림)'}
            </button>
          </div>
        )}

        <div className="card" style={{ marginBottom: '16px', padding: '12px', background: 'rgba(0,128,0,0.1)' }}>
          <div style={{ fontSize: '13px', color: 'var(--primary-green)', fontWeight: '600', textAlign: 'center' }}>
            🎮 {localGridSize}x{localGridSize} 빙고 / 목표: {localTargetLines}줄
          </div>
        </div>

        {isEditMode && (
          <div className="card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)', margin: 0 }}>
                회원 목록
              </h4>
              <button
                onClick={handleResetBoard}
                style={{
                  padding: '6px 12px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                초기화
              </button>
            </div>
            <div style={{ 
              fontSize: '12px', 
              opacity: 0.7, 
              marginBottom: '12px',
              padding: '8px',
              background: 'rgba(0,128,0,0.1)',
              borderRadius: '6px',
              lineHeight: '1.5'
            }}>
              📌 <strong>사용법:</strong> 회원 이름을 터치/클릭하여 선택 → 빙고판의 원하는 칸을 터치/클릭하여 배치<br/>
              💡 칸을 다시 터치하면 이름이 제거됩니다
            </div>
            
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '6px',
              padding: '6px',
              background: 'rgba(0,0,0,0.02)',
              borderRadius: '8px'
            }}>
              {availableMembers.map((member, idx) => {
                const nickname = member.nickname || member.name;
                const isSelected = selectedMember === nickname;
                return (
                  <div
                    key={idx}
                    draggable
                    onDragStart={(e) => handleDragStart(e, nickname)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleMemberSelect(nickname)}
                    style={{
                      padding: '8px 11px',
                      background: isSelected 
                        ? 'linear-gradient(135deg, #FFD700, #FFA500)' 
                        : 'var(--primary-green)',
                      color: 'white',
                      borderRadius: '18px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                      boxShadow: isSelected 
                        ? '0 3px 10px rgba(255,165,0,0.5)' 
                        : '0 1px 3px rgba(0,0,0,0.2)',
                      transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 0.2s ease',
                      border: isSelected ? '2px solid #fff' : '2px solid transparent'
                    }}
                  >
                    {nickname}
                  </div>
                );
              })}
              {availableMembers.length === 0 && (
                <div style={{ fontSize: '11px', opacity: 0.7, padding: '8px' }}>
                  모든 회원이 배치되었습니다
                </div>
              )}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '10px', textAlign: 'center' }}>
              총 {members.length}명 중 {usedMembers.length}명 배치됨
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {isEditMode ? (
            selectedMember ? (
              <div
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '700',
                  textAlign: 'center',
                  boxShadow: '0 2px 10px rgba(255,165,0,0.4)'
                }}
              >
                ✓ "{selectedMember}" 선택됨 - 칸을 터치하세요!
              </div>
            ) : (
              <button
                onClick={handleSaveBoard}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  background: 'var(--primary-green)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,128,0,0.3)'
                }}
              >
                저장 및 게임 시작
              </button>
            )
          ) : (
            <>
              <button
                onClick={handleEditMode}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  background: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                편집 모드
              </button>
              <button
                onClick={handleClearSelection}
                style={{
                  padding: '14px 20px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                선택 초기화
              </button>
            </>
          )}
        </div>

        <div className="card">
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${localGridSize}, 1fr)`,
            gap: '6px',
            marginBottom: '12px'
          }}>
            {bingoGrid.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const cellKey = `${rowIndex}-${colIndex}`;
                const isSelected = selectedCells.includes(cellKey);
                const isInBingoLine = isCellInBingoLine(rowIndex, colIndex);
                const isDragOver = dragOverCell === cellKey;
                const canDrop = isEditMode && selectedMember;
                
                return (
                  <div
                    key={cellKey}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    onDragOver={isEditMode ? (e) => handleDragOver(e, rowIndex, colIndex) : undefined}
                    onDragLeave={handleDragLeave}
                    onDrop={isEditMode ? (e) => handleDrop(e, rowIndex, colIndex) : undefined}
                    style={{
                      aspectRatio: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: isDragOver 
                        ? '3px solid #FFD700' 
                        : isEditMode 
                          ? canDrop 
                            ? '2px dashed var(--primary-green)' 
                            : '2px dashed var(--border-color)' 
                          : '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: localGridSize > 7 ? '11px' : localGridSize > 5 ? '13px' : '15px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      background: isDragOver
                        ? 'rgba(255, 215, 0, 0.3)'
                        : isInBingoLine 
                          ? 'linear-gradient(135deg, #FFD700, #FFA500)' 
                          : isSelected 
                            ? 'var(--primary-green)' 
                            : isEditMode && canDrop
                              ? 'rgba(0, 128, 0, 0.1)'
                              : isEditMode 
                                ? 'rgba(0,0,0,0.02)' 
                                : 'white',
                      color: (isSelected || isInBingoLine) ? 'white' : 'inherit',
                      transition: 'all 0.15s ease',
                      padding: '4px',
                      textAlign: 'center',
                      wordBreak: 'break-all',
                      overflow: 'hidden',
                      minHeight: '50px',
                      lineHeight: '1.2'
                    }}
                  >
                    {cell}
                  </div>
                );
              })
            )}
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            paddingTop: '8px',
            borderTop: '1px solid var(--border-color)'
          }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)' }}>
              현재 빙고: {bingoLines.length}줄
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#666' }}>
              목표: {localTargetLines}줄
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          from { transform: scale(1); }
          to { transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}

export default BingoGame;
