import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import logoImage from '../assets/logo.jpeg';

function About() {
  const navigate = useNavigate();
  const { user, members } = useApp();
  
  const [gridSize, setGridSize] = useState(5);
  const [bingoGrid, setBingoGrid] = useState([]);
  const [selectedCells, setSelectedCells] = useState([]);
  const [isEditMode, setIsEditMode] = useState(true);
  const [currentInputCell, setCurrentInputCell] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [bingoLines, setBingoLines] = useState([]);
  const [showBingo, setShowBingo] = useState(false);

  useEffect(() => {
    initializeGrid(gridSize);
  }, [gridSize]);

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
  };

  const handleCellClick = (row, col) => {
    if (isEditMode) {
      setCurrentInputCell({ row, col });
      setInputValue(bingoGrid[row][col]);
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

  const handleInputConfirm = () => {
    if (currentInputCell) {
      const newGrid = [...bingoGrid];
      newGrid[currentInputCell.row][currentInputCell.col] = inputValue;
      setBingoGrid(newGrid);
      setCurrentInputCell(null);
      setInputValue('');
    }
  };

  const handleSave = () => {
    setIsEditMode(false);
    setCurrentInputCell(null);
    localStorage.setItem('bingoGrid', JSON.stringify(bingoGrid));
    localStorage.setItem('bingoGridSize', gridSize.toString());
  };

  const handleReset = () => {
    initializeGrid(gridSize);
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

  useEffect(() => {
    const savedGrid = localStorage.getItem('bingoGrid');
    const savedSize = localStorage.getItem('bingoGridSize');
    if (savedGrid && savedSize) {
      const size = parseInt(savedSize);
      setGridSize(size);
      setBingoGrid(JSON.parse(savedGrid));
    }
  }, []);
  
  const handleContact = () => {
    window.open('https://open.kakao.com/o/sBvflSoh', '_blank');
  };

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div className="header">
        <button
          onClick={() => navigate(-1)}
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
        <h1 style={{ flex: 1, marginLeft: '12px' }}>About</h1>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            cursor: 'pointer'
          }}
          onClick={() => navigate('/mypage')}
        >
          <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-light)' }}>
            환영합니다 {user.nickname || user.name}님
          </div>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'var(--primary-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '600',
            fontSize: '14px',
            border: '2px solid var(--border-color)'
          }}>
            {user.photo ? (
              <img 
                src={user.photo} 
                alt="프로필" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover' 
                }} 
              />
            ) : (
              <span>{(user.nickname || user.name).charAt(0)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="content">
        <div className="card" style={{ textAlign: 'center', padding: '30px 20px' }}>
          <img 
            src={logoImage} 
            alt="3355 골프 클럽 로고" 
            style={{ 
              width: '100px', 
              height: '100px', 
              marginBottom: '16px',
              objectFit: 'cover',
              borderRadius: '50%'
            }} 
          />
          <h2 style={{ 
            fontSize: '22px', 
            color: 'var(--primary-green)',
            marginBottom: '8px',
            fontWeight: '700'
          }}>
            3355 골프모임
          </h2>
          <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '4px' }}>
            Version 1.0.0
          </div>
          <div style={{ fontSize: '14px', opacity: 0.7 }}>
            Build {__BUILD_NUMBER__}
          </div>
        </div>

        <div style={{ 
          height: '2px', 
          background: 'linear-gradient(to right, transparent, var(--primary-green), transparent)',
          margin: '20px 0'
        }} />

        {/* 빙고 게임 섹션 */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '700', 
            marginBottom: '16px',
            color: 'var(--primary-green)',
            textAlign: 'center'
          }}>
            🎯 빙고 게임
          </h3>

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

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>배열 크기:</span>
              <input
                type="number"
                min="3"
                max="10"
                value={gridSize}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 5;
                  if (val >= 3 && val <= 10) {
                    setGridSize(val);
                  }
                }}
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

          {currentInputCell && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                width: '90%',
                maxWidth: '300px'
              }}>
                <h4 style={{ marginBottom: '12px', fontSize: '16px' }}>
                  칸 [{currentInputCell.row + 1}, {currentInputCell.col + 1}] 입력
                </h4>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="회원 대화명 입력"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '16px',
                    marginBottom: '12px',
                    boxSizing: 'border-box'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInputConfirm();
                    if (e.key === 'Escape') setCurrentInputCell(null);
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleInputConfirm}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'var(--primary-green)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    확인
                  </button>
                  <button
                    onClick={() => setCurrentInputCell(null)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          )}

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
                    style={{
                      aspectRatio: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: isEditMode ? '2px dashed var(--border-color)' : '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: gridSize > 6 ? '10px' : '12px',
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
                      padding: '4px',
                      textAlign: 'center',
                      wordBreak: 'break-all',
                      overflow: 'hidden'
                    }}
                  >
                    {cell || (isEditMode ? '+' : '')}
                  </div>
                );
              })
            )}
          </div>

          <div style={{ fontSize: '12px', opacity: 0.7, textAlign: 'center' }}>
            {isEditMode ? (
              '칸을 클릭하여 회원 대화명을 입력하세요'
            ) : (
              `선택된 칸: ${selectedCells.length}개 | 완성된 빙고: ${bingoLines.length}줄`
            )}
          </div>
        </div>

        <div className="card">
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '700', 
            marginBottom: '12px',
            color: 'var(--primary-green)'
          }}>
            주요 기능
          </h3>
          <div style={{ fontSize: '14px', lineHeight: '1.8', opacity: 0.9, marginBottom: '20px' }}>
            • 회원관리<br/>
            • 라운딩 관리<br/>
            <div style={{ paddingLeft: '16px', marginTop: '4px' }}>
              - 라운딩 생성 (정기모임, 스트라컴)<br/>
              - 참가신청, 번호대여(스트라컴)<br/>
              - 조편성<br/>
              - 스코어 입력, 리더보드<br/>
              - 순위집계<br/>
              - 하우스 핸디 자동 생성
            </div>
          </div>

          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '700', 
            marginBottom: '12px',
            marginTop: '24px',
            color: 'var(--primary-green)'
          }}>
            예정된 업데이트
          </h3>
          <div style={{ fontSize: '14px', lineHeight: '1.8', opacity: 0.9, marginBottom: '24px' }}>
            • 회비관리<br/>
            • 실시간 스코어 입력 (Miscore 와 동일 UI)
          </div>

          <button
            onClick={handleContact}
            className="btn-primary"
            style={{ 
              width: '100%',
              marginBottom: '24px',
              background: 'var(--primary-green)',
              borderBottom: '3px solid var(--primary-dark)'
            }}
          >
            💬 피드백, 버그신고, 동백님 찬양하기
          </button>

          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '700', 
            marginBottom: '12px',
            color: 'var(--primary-green)'
          }}>
            개발자 정보
          </h3>
          <div style={{ fontSize: '14px', lineHeight: '1.8', opacity: 0.9, marginBottom: '24px' }}>
            멋짐, 매력, 잘생김 뿜뿜 동백님
          </div>

          <div style={{ fontSize: '14px', lineHeight: '1.8', opacity: 0.7, paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>개인정보 처리방침</strong><br/>
              그딴거 없음
            </div>
            <div>
              <strong>이용약관</strong><br/>
              그런것도 없음
            </div>
          </div>

          <div style={{ 
            textAlign: 'center', 
            fontSize: '12px', 
            opacity: 0.5,
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(0,0,0,0.05)'
          }}>
            Made with ❤️ by 동백
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;
