import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

function BingoGame() {
  const navigate = useNavigate();
  const { user, members } = useApp();
  
  const [gridSize, setGridSize] = useState(5);
  const [bingoGrid, setBingoGrid] = useState([]);
  const [selectedCells, setSelectedCells] = useState([]);
  const [isEditMode, setIsEditMode] = useState(true);
  const [bingoLines, setBingoLines] = useState([]);
  const [showBingo, setShowBingo] = useState(false);
  const [usedMembers, setUsedMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);
  const [bingoTargetLines, setBingoTargetLines] = useState(1);

  useEffect(() => {
    const savedGrid = localStorage.getItem('bingoGrid');
    const savedSize = localStorage.getItem('bingoGridSize');
    const savedUsedMembers = localStorage.getItem('bingoUsedMembers');
    const savedTargetLines = localStorage.getItem('bingoTargetLines');
    
    if (savedGrid && savedSize) {
      const size = parseInt(savedSize);
      setGridSize(size);
      setBingoGrid(JSON.parse(savedGrid));
      if (savedUsedMembers) {
        setUsedMembers(JSON.parse(savedUsedMembers));
      }
      if (savedTargetLines) {
        setBingoTargetLines(parseInt(savedTargetLines));
      } else {
        setBingoTargetLines(size);
      }
    } else {
      initializeGrid(5);
      setBingoTargetLines(5);
    }
  }, []);

  useEffect(() => {
    if (!isEditMode) {
      checkBingo();
    }
  }, [selectedCells, isEditMode]);

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

  const handleGridSizeChange = (newSize) => {
    if (newSize >= 3 && newSize <= 10) {
      setGridSize(newSize);
      setBingoTargetLines(newSize);
      initializeGrid(newSize);
    }
  };

  const handleMemberSelect = (nickname) => {
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
        if (oldValue) {
          setUsedMembers(prev => prev.filter(m => m !== oldValue));
        }
        newGrid[row][col] = selectedMember;
        setBingoGrid(newGrid);
        setUsedMembers(prev => [...prev.filter(m => m !== selectedMember), selectedMember]);
        setSelectedMember(null);
      } else if (bingoGrid[row][col]) {
        const removedMember = bingoGrid[row][col];
        const newGrid = bingoGrid.map(r => [...r]);
        newGrid[row][col] = '';
        setBingoGrid(newGrid);
        setUsedMembers(prev => prev.filter(m => m !== removedMember));
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
    setSelectedMember(nickname);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', nickname);
  };

  const handleDragEnd = () => {
    setDragOverCell(null);
  };

  const handleDragOver = (e, row, col) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCell(`${row}-${col}`);
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = (e, row, col) => {
    e.preventDefault();
    setDragOverCell(null);
    const nickname = e.dataTransfer.getData('text/plain') || selectedMember;
    
    if (nickname && isEditMode) {
      const newGrid = bingoGrid.map(r => [...r]);
      const oldValue = newGrid[row][col];
      if (oldValue) {
        setUsedMembers(prev => prev.filter(m => m !== oldValue));
      }
      newGrid[row][col] = nickname;
      setBingoGrid(newGrid);
      setUsedMembers(prev => [...prev.filter(m => m !== nickname), nickname]);
      setSelectedMember(null);
    }
  };

  const handleSave = () => {
    setIsEditMode(false);
    setSelectedMember(null);
    localStorage.setItem('bingoGrid', JSON.stringify(bingoGrid));
    localStorage.setItem('bingoGridSize', gridSize.toString());
    localStorage.setItem('bingoUsedMembers', JSON.stringify(usedMembers));
    localStorage.setItem('bingoTargetLines', bingoTargetLines.toString());
  };

  const handleReset = () => {
    initializeGrid(gridSize);
    localStorage.removeItem('bingoGrid');
    localStorage.removeItem('bingoGridSize');
    localStorage.removeItem('bingoUsedMembers');
  };

  const checkBingo = () => {
    const lines = [];
    const size = gridSize;

    for (let row = 0; row < size; row++) {
      let complete = true;
      for (let col = 0; col < size; col++) {
        if (!selectedCells.includes(`${row}-${col}`) || !bingoGrid[row][col]) {
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
        if (!selectedCells.includes(`${row}-${col}`) || !bingoGrid[row][col]) {
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
      if (!selectedCells.includes(`${i}-${i}`) || !bingoGrid[i][i]) {
        diag1Complete = false;
        break;
      }
    }
    if (diag1Complete) {
      lines.push({ type: 'diag1' });
    }

    let diag2Complete = true;
    for (let i = 0; i < size; i++) {
      if (!selectedCells.includes(`${i}-${size - 1 - i}`) || !bingoGrid[i][size - 1 - i]) {
        diag2Complete = false;
        break;
      }
    }
    if (diag2Complete) {
      lines.push({ type: 'diag2' });
    }

    setBingoLines(lines);
    if (lines.length >= bingoTargetLines && !showBingo) {
      setShowBingo(true);
    }
  };

  const isCellInBingoLine = (row, col) => {
    for (const line of bingoLines) {
      if (line.type === 'row' && line.index === row) return true;
      if (line.type === 'col' && line.index === col) return true;
      if (line.type === 'diag1' && row === col) return true;
      if (line.type === 'diag2' && row === gridSize - 1 - col) return true;
    }
    return false;
  };

  const availableMembers = members.filter(m => !usedMembers.includes(m.nickname || m.name));

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

        {['관리자', '방장', '운영진'].includes(user?.role) && (
          <div className="card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>배열:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                  <button
                    onClick={() => handleGridSizeChange(gridSize - 1)}
                    disabled={!isEditMode || gridSize <= 3}
                    style={{
                      width: '36px',
                      height: '36px',
                      background: (!isEditMode || gridSize <= 3) ? '#ccc' : 'var(--primary-green)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px 0 0 6px',
                      fontSize: '20px',
                      fontWeight: '700',
                      cursor: (!isEditMode || gridSize <= 3) ? 'not-allowed' : 'pointer',
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
                    {gridSize}
                  </div>
                  <button
                    onClick={() => handleGridSizeChange(gridSize + 1)}
                    disabled={!isEditMode || gridSize >= 10}
                    style={{
                      width: '36px',
                      height: '36px',
                      background: (!isEditMode || gridSize >= 10) ? '#ccc' : 'var(--primary-green)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0 6px 6px 0',
                      fontSize: '20px',
                      fontWeight: '700',
                      cursor: (!isEditMode || gridSize >= 10) ? 'not-allowed' : 'pointer',
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
                    onClick={() => setBingoTargetLines(prev => Math.max(1, prev - 1))}
                    disabled={!isEditMode || bingoTargetLines <= 1}
                    style={{
                      width: '36px',
                      height: '36px',
                      background: (!isEditMode || bingoTargetLines <= 1) ? '#ccc' : 'var(--primary-green)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px 0 0 6px',
                      fontSize: '20px',
                      fontWeight: '700',
                      cursor: (!isEditMode || bingoTargetLines <= 1) ? 'not-allowed' : 'pointer',
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
                    {bingoTargetLines}
                  </div>
                  <button
                    onClick={() => setBingoTargetLines(prev => prev + 1)}
                    disabled={!isEditMode}
                    style={{
                      width: '36px',
                      height: '36px',
                      background: !isEditMode ? '#ccc' : 'var(--primary-green)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0 6px 6px 0',
                      fontSize: '20px',
                      fontWeight: '700',
                      cursor: !isEditMode ? 'not-allowed' : 'pointer',
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
          </div>
        )}

        {isEditMode && (
          <div className="card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary-green)', margin: 0 }}>
                회원 목록
              </h4>
              <button
                onClick={handleReset}
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
                onClick={handleSave}
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
                onClick={() => setIsEditMode(true)}
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
                onClick={() => {
                  setSelectedCells([]);
                  setBingoLines([]);
                  setShowBingo(false);
                }}
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
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
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
                      fontSize: gridSize > 7 ? '11px' : gridSize > 5 ? '13px' : '15px',
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
                      boxShadow: isDragOver ? '0 0 10px rgba(255,215,0,0.5)' : 'none'
                    }}
                  >
                    {cell || (isEditMode ? <span style={{ opacity: 0.3, fontSize: '20px' }}>+</span> : '')}
                  </div>
                );
              })
            )}
          </div>

          <div style={{ fontSize: '12px', opacity: 0.7, textAlign: 'center' }}>
            {isEditMode ? (
              selectedMember 
                ? <span style={{ color: 'var(--primary-green)', fontWeight: '600' }}>칸을 터치하여 "{selectedMember}" 배치하세요</span>
                : <span>회원을 선택한 후 칸을 터치하세요</span>
            ) : (
              <span>선택된 칸: {selectedCells.length}개 | 완성된 빙고: {bingoLines.length}줄</span>
            )}
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
