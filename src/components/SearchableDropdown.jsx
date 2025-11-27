import React, { useState, useEffect, useRef } from 'react';

function SearchableDropdown({ 
  options, 
  value, 
  onChange, 
  placeholder = '선택하세요',
  displayKey = 'name',
  valueKey = 'name',
  style = {},
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const filteredOptions = options.filter(option => {
    const displayValue = typeof option === 'string' ? option : option[displayKey];
    return displayValue?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const selectedOption = options.find(option => {
    const optionValue = typeof option === 'string' ? option : option[valueKey];
    return optionValue === value;
  });

  const displayValue = selectedOption 
    ? (typeof selectedOption === 'string' ? selectedOption : selectedOption[displayKey])
    : '';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    const optionValue = typeof option === 'string' ? option : option[valueKey];
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div 
      ref={containerRef} 
      style={{ 
        position: 'relative',
        ...style 
      }}
    >
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }
        }}
        style={{
          width: '100%',
          padding: '12px 4px',
          fontSize: '16px',
          border: 'none',
          borderBottom: '1px solid var(--border-color)',
          borderRadius: '0',
          boxSizing: 'border-box',
          background: 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '48px',
          color: 'var(--text-dark)'
        }}
      >
        <span style={{ 
          color: displayValue ? 'var(--text-dark)' : 'var(--text-gray)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          opacity: displayValue ? 1 : 0.6
        }}>
          {displayValue || placeholder}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {value && (
            <span
              onClick={handleClear}
              style={{
                fontSize: '16px',
                color: '#999',
                cursor: 'pointer',
                padding: '0 4px'
              }}
            >
              ✕
            </span>
          )}
          <span style={{ 
            fontSize: '10px', 
            color: '#666',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}>
            ▼
          </span>
        </div>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          marginTop: '4px',
          zIndex: 1000,
          maxHeight: '300px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <div style={{
            padding: '8px',
            borderBottom: '1px solid var(--border-color)',
            position: 'sticky',
            top: 0,
            background: 'var(--bg-card)'
          }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                boxSizing: 'border-box',
                outline: 'none',
                background: 'var(--bg-card)'
              }}
            />
          </div>
          
          <div style={{
            maxHeight: '240px',
            overflowY: 'auto'
          }}>
            {filteredOptions.length === 0 ? (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                color: 'var(--text-gray)',
                fontSize: '14px',
                opacity: 0.7
              }}>
                검색 결과가 없습니다
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const optionValue = typeof option === 'string' ? option : option[valueKey];
                const optionDisplay = typeof option === 'string' ? option : option[displayKey];
                const isSelected = optionValue === value;
                
                return (
                  <div
                    key={index}
                    onClick={() => handleSelect(option)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--primary-green)' : 'var(--bg-card)',
                      color: isSelected ? 'var(--text-light)' : 'var(--text-dark)',
                      borderBottom: index < filteredOptions.length - 1 ? '1px solid var(--border-color)' : 'none',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.target.style.background = 'rgba(0,0,0,0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.target.style.background = 'var(--bg-card)';
                      }
                    }}
                  >
                    {optionDisplay}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableDropdown;
