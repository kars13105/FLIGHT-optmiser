import { useState, useEffect, useRef } from 'react';
import { Plane, X } from 'lucide-react';
import { airports } from '../data/airports';

function AirportInput({ label, value, onChange, placeholder, required }) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Sync internal display value when selected code (prop) changes
  useEffect(() => {
    if (value) {
      const matched = airports.find(a => a.code === value);
      if (matched) {
        setInputValue(`${matched.city} (${matched.code})`);
      } else {
        setInputValue(value);
      }
    } else {
      setInputValue('');
    }
  }, [value]);

  // Click outside detection
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        restorePreviousValue();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputValue, value]);

  // Restore the value to the parent's actual code if user blurs without selecting
  const restorePreviousValue = () => {
    if (value) {
      const matched = airports.find(a => a.code === value);
      if (matched) {
        setInputValue(`${matched.city} (${matched.code})`);
      } else {
        setInputValue(value);
      }
    } else {
      setInputValue('');
    }
  };

  // Filter airports based on query
  const query = inputValue.trim().toLowerCase();
  
  // If the input value exactly matches the current "City (CODE)" format,
  // we filter by just the city or code to show related recommendations or nothing,
  // but to prevent showing full filter lists when simply focused on an already selected item,
  // we can check if it's an exact match.
  const isSelectedFormat = value && airports.some(a => `${a.city} (${a.code})` === inputValue);
  
  const filtered = isSelectedFormat
    ? airports.slice(0, 8) // Show top popular if it's already selected and they clicked
    : query === ''
    ? airports.slice(0, 8) // Show top popular when empty
    : airports.filter(apt => 
        apt.code.toLowerCase().includes(query) ||
        apt.city.toLowerCase().includes(query) ||
        apt.name.toLowerCase().includes(query) ||
        apt.country.toLowerCase().includes(query)
      ).slice(0, 8);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(0);
  };

  const handleFocus = (e) => {
    setIsOpen(true);
    setHighlightedIndex(0);
    // Auto-select text on focus so user can immediately type to search
    e.target.select();
  };

  const handleOptionSelect = (option) => {
    onChange(option.code);
    setInputValue(`${option.city} (${option.code})`);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setInputValue('');
    setIsOpen(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % Math.max(1, filtered.length));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered.length > 0) {
          handleOptionSelect(filtered[highlightedIndex]);
        } else {
          // If no items match, treat whatever they typed as a custom code if it's 3 letters
          const cleaned = inputValue.trim().toUpperCase();
          if (cleaned.length === 3) {
            onChange(cleaned);
            setInputValue(cleaned);
          } else {
            restorePreviousValue();
          }
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        restorePreviousValue();
        break;
      default:
        break;
    }
  };

  return (
    <div className="input-field airport-input-container" ref={containerRef}>
      <label>{label}</label>
      <div className="airport-input-wrapper">
        <div className="airport-input-icon">
          <Plane size={18} style={{ transform: 'rotate(45deg)' }} />
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          required={required}
          autoComplete="off"
        />
        {inputValue && (
          <button type="button" className="airport-clear-btn" onClick={handleClear}>
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="airport-dropdown">
          {filtered.length > 0 ? (
            filtered.map((apt, idx) => (
              <div
                key={apt.code}
                className={`airport-option ${idx === highlightedIndex ? 'active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevents blur before selection
                  handleOptionSelect(apt);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
              >
                <div className="airport-option-info">
                  <div className="airport-option-city">
                    {apt.city}, <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{apt.country}</span>
                  </div>
                  <div className="airport-option-name">{apt.name}</div>
                </div>
                <div className="airport-option-code">{apt.code}</div>
              </div>
            ))
          ) : (
            <div className="no-options">
              No matching airports.
              {inputValue.trim().length === 3 && (
                <div style={{ fontSize: '0.8rem', marginTop: '0.4rem', color: 'var(--secondary)' }}>
                  Press Enter to use "{inputValue.trim().toUpperCase()}" directly
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AirportInput;
