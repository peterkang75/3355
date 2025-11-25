import React, { useState, useEffect } from 'react';
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
  const [draggedMember, setDraggedMember] = useState(null);
  const [usedMembers, setUsedMembers] = useState([]);

  useEffect(() => {
    const savedGrid = localStorage.getItem('bingoGrid');
    const savedSize = localStorage.getItem('bingoGridSize');
    const savedUsedMembers = localStorage.getItem('bingoUsedMembers');
    
    if (savedGrid && savedSize) {
      const size = parseInt(savedSize);
      setGridSize(size);
      setBingoGrid(JSON.parse(savedGrid));
      if (savedUsedMembers) {
        setUsedMembers(JSON.parse(savedUsedMembers));
      }
    } else {
      initializeGrid(5);
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
  };

  const handleGridSizeChange = (newSize) => {
    if (newSize >= 3 && newSize <= 10) {
      setGridSize(newSize);
      initializeGrid(newSize);
    }
  };

  const handleCellClick = (row, col) => {
    if (!isEditMode) {
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
    setDraggedMember(nickname);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, row, col) => {
    e.preventDefault();
    if (draggedMember && isEditMode) {
      const newGrid = bingoGrid.map(r => [...r]);
      
      const oldValue = newGrid[row][col];
      if (oldValue) {
        setUsedMembers(usedMembers.filter(m => m !== oldValue));
      }
      
      newGrid[row][col] = draggedMember;
      setBingoGrid(newGrid);
      setUsedMembers([...usedMembers.filter(m => m !== draggedMember), draggedMember]);
      setDraggedMember(null);
    }
  };

  const handleRemoveFromCell = (row, col) => {
    if (isEditMode && bingoGrid[row][col]) {
      const removedMember = bingoGrid[row][col];
      const newGrid = bingoGrid.map(r => [...r]);
      newGrid[row][col] = '';
      setBingoGrid(newGrid);
      setUsedMembers(usedMembers.filter(m => m !== removedMember));
    }
  };

  const handleSave = () => {
    setIsEditMode(false);
    localStorage.setItem('bingoGrid', JSON.stringify(bingoGrid));
    localStorage.setItem('bingoGridSize', gridSize.toString());
    localStorage.setItem('bingoUsedMembers', JSON.stringify(usedMembers));
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
    if (lines.length > 0 && !showBingo) {
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

        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>배열 크기:</span>
            <input
              type="number"
              min="3"
              max="10"
              value={gridSize}
              onChange={(e) => handleGridSizeChange(parseInt(e.target.value) || 5)}
              disabled={!isEditMode}
              style={{
                width: '60px',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                textAlign: 'center',
                fontSize: '16px'
              }}
            />
            <span style={{ fontSize: '13px', opacity: 0.7 }}>({gridSize} x {gridSize})</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {isEditMode ? (
              <button
                onClick={handleSave}
                style={{
                  padding: '10px 20px',
                  background: 'var(--primary-green)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                저장 및 게임 시작
              </button>
            ) : (
              <button
                onClick={() => setIsEditMode(true)}
                style={{
                  padding: '10px 20px',
                  background: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                편집 모드
              </button>
            )}
            <button
              onClick={handleReset}
              style={{
                padding: '10px 20px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              초기화
            </button>
            {!isEditMode && (
              <button
                onClick={() => {
                  setSelectedCells([]);
                  setBingoLines([]);
                  setShowBingo(false);
                }}
                style={{
                  padding: '10px 20px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                선택 초기화
              </button>
            )}
          </div>
        </div>

        {isEditMode && (
          <div className="card" style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--primary-green)' }}>
              회원 목록 (드래그하여 칸에 배치)
            </h4>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '8px',
              maxHeight: '150px',
              overflowY: 'auto',
              padding: '4px'
            }}>
              {availableMembers.map((member, idx) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={(e) => handleDragStart(e, member.nickname || member.name)}
                  style={{
                    padding: '8px 12px',
                    background: 'var(--primary-green)',
                    color: 'white',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'grab',
                    userSelect: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {member.nickname || member.name}
                </div>
              ))}
              {availableMembers.length === 0 && (
                <div style={{ fontSize: '13px', opacity: 0.7 }}>
                  모든 회원이 배치되었습니다
                </div>
              )}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '8px' }}>
              총 {members.length}명 중 {usedMembers.length}명 배치됨
            </div>
          </div>
        )}

        <div className="card">
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gap: '4px',
            marginBottom: '12px'
          }}>
            {bingoGrid.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const cellKey = `${rowIndex}-${colIndex}`;
                const isSelected = selectedCells.includes(cellKey);
                const isInBingoLine = isCellInBingoLine(rowIndex, colIndex);
                
                return (
                  <div
                    key={cellKey}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    onDragOver={isEditMode ? handleDragOver : undefined}
                    onDrop={isEditMode ? (e) => handleDrop(e, rowIndex, colIndex) : undefined}
                    onDoubleClick={() => handleRemoveFromCell(rowIndex, colIndex)}
                    style={{
                      aspectRatio: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: isEditMode ? '2px dashed var(--border-color)' : '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: gridSize > 6 ? '9px' : gridSize > 4 ? '11px' : '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      background: isInBingoLine 
                        ? 'linear-gradient(135deg, #FFD700, #FFA500)' 
                        : isSelected 
                          ? 'var(--primary-green)' 
                          : isEditMode 
                            ? 'rgba(0,0,0,0.02)' 
                            : 'white',
                      color: (isSelected || isInBingoLine) ? 'white' : 'inherit',
                      transition: 'all 0.2s ease',
                      padding: '2px',
                      textAlign: 'center',
                      wordBreak: 'break-all',
                      overflow: 'hidden',
                      minHeight: '40px'
                    }}
                  >
                    {cell || (isEditMode ? <span style={{ opacity: 0.3, fontSize: '16px' }}>+</span> : '')}
                  </div>
                );
              })
            )}
          </div>

          <div style={{ fontSize: '12px', opacity: 0.7, textAlign: 'center' }}>
            {isEditMode ? (
              <span>회원을 드래그하여 칸에 배치하세요 (더블클릭으로 제거)</span>
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
