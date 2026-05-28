import { useState } from 'react';
import { Plane, Search, Clock, Navigation, CheckCircle2 } from 'lucide-react';
import './App.css';
import AirportInput from './components/AirportInput';

function App() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [criteria, setCriteria] = useState('cost');
  const [loading, setLoading] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!from || !to) return;

    setLoading(true);
    setError(null);
    setRouteData(null);

    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'https://backend-phi-steel-96.vercel.app';
      const response = await fetch(`${backendUrl}/api/route?from=${from}&to=${to}&criteria=${criteria}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch routes');
      }

      setRouteData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDuration = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>SkyRoute</h1>
        <p>Find the optimal path for your next journey.</p>
      </div>

      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <form className="search-form" onSubmit={handleSearch}>
          <div className="input-group">
            <AirportInput 
              label="From (Origin)"
              value={from}
              onChange={setFrom}
              placeholder="e.g. Delhi or DEL"
              required
            />
            
            <AirportInput 
              label="To (Destination)"
              value={to}
              onChange={setTo}
              placeholder="e.g. Mumbai or BOM"
              required
            />
          </div>

          <div className="input-field">
            <label>Optimize For</label>
            <select value={criteria} onChange={(e) => setCriteria(e.target.value)}>
              <option value="cost">Minimum Cost</option>
              <option value="duration">Minimum Duration</option>
            </select>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <div className="animate-spin"><Plane size={24} /></div>
            ) : (
              <><Search size={20} /> Find Optimal Route</>
            )}
          </button>
        </form>
      </div>

      {error && (
        <div className="error-msg">
          <p>{error}</p>
        </div>
      )}

      {routeData && (
        <div className="glass-panel route-result">
          <div className="route-header">
            <div>
              <h3>Optimal Route Found</h3>
              <div className="duration-tag">
                <Clock size={18} />
                <span>{formatDuration(routeData.total_duration)}</span>
              </div>
            </div>
            <div className="price-tag">
              {formatCurrency(routeData.total_cost, routeData.currency || 'INR')}
            </div>
          </div>

          <div className="flight-path">
            <div className="flight-line">
              <div className="flight-line-active"></div>
            </div>
            
            {routeData.airports.map((apt, index) => (
              <div 
                key={index} 
                className={index === 0 || index === routeData.airports.length - 1 ? "airport-node" : "layover-node"}
                title={index === 0 ? "Origin" : index === routeData.airports.length - 1 ? "Destination" : "Layover"}
              >
                {apt}
              </div>
            ))}
          </div>

          <div className="airline-info">
            {routeData.airlines.map((airline, idx) => (
              <span key={idx} className="airline-badge">
                <Plane size={14} /> {airline} ({routeData.airports[idx]} → {routeData.airports[idx+1]})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
