import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'https://logistics-backend-3vj1.onrender.com';

function App() {
  const [routes, setRoutes] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = () => {
    setLoading(true);
    fetch(`${API_URL}/api/routes-by-vehicle`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        setRoutes(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Ошибка загрузки:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectVehicle = (vehicle) => {
    setSearchQuery('');
    if (selectedVehicle === vehicle) {
      setSelectedVehicle(null);
    } else {
      setSelectedVehicle(null);
      setTimeout(() => {
        setSelectedVehicle(vehicle);
      }, 50);
    }
  };

  if (loading) {
    return <div className="loader">Загрузка маршрутов...</div>;
  }

  const vehicles = Object.keys(routes);

  const allPoints = [];
  Object.entries(routes).forEach(([vehicle, points]) => {
    if (Array.isArray(points)) {
      points.forEach((point) => {
        allPoints.push({ ...point, _vehicle: vehicle });
      });
    }
  });

  const filteredPoints = searchQuery.trim() === '' 
    ? [] 
    : allPoints.filter((point) => {
        const query = searchQuery.toLowerCase().trim();
        return Object.values(point).some((val) =>
          String(val).toLowerCase().includes(query)
        );
      });

  const renderCard = (point, idx, showVehicleBadge = false) => {
    const getVal = (possibleNames) => {
      const keys = Object.keys(point).filter((k) => !k.startsWith('_'));
      for (const name of possibleNames) {
        const target = name.toLowerCase();
        for (const key of keys) {
          const cleanKey = key.trim().toLowerCase();
          if (cleanKey === target || cleanKey.includes(target)) {
            const val = String(point[key]).trim();
            if (val) return val;
          }
        }
      }
      return '';
    };

    const docNum = getVal(['№ док-ту', '№ док', 'док-ту', 'номер док']);
    const city = getVal(['факт.місто доставки', 'місто', 'город']);
    const street = getVal(['вулиця', 'улица']);
    const house = getVal(['№ будинку', 'будинок', 'дом']);
    const client = getVal(['клиент', 'отримувач', 'получатель', 'замовник', 'контрагент', 'фирма']);
    const phone = getVal(['телефон', 'тел', 'контакт']);
    const weight = getVal(['вага']);
    const volume = getVal(['об\'єм', 'обем', 'объем']);
    const warehouse = getVal(['склад']);
    const driver = getVal(['водій', 'водитель']);
    const boCode = getVal(['код бо', 'кодбо', 'код б.о.', 'бо']);

    const addressParts = [city, street, house ? `д. ${house}` : ''].filter(Boolean);
    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Адрес не указан';

    return (
      <div key={`${point._vehicle || 'v'}-${idx}-${docNum}`} className="card">
        <div className="card-header">
          {showVehicleBadge ? (
            <span className="badge-vehicle">🚗 {point._vehicle}</span>
          ) : (
            <span className="point-number">#{idx + 1}</span>
          )}
          {docNum && <span className="doc-num">📄 Док: {docNum}</span>}
        </div>

        {client && <h3>{client}</h3>}

        <p>📍 <strong>Адрес:</strong> {fullAddress}</p>

        {phone && (
          <p>📞 <strong>Тел:</strong> <a href={`tel:${phone}`}>{phone}</a></p>
        )}

        {(weight || volume) && (
          <p>📦 <strong>Параметры:</strong> {weight ? `Вага: ${weight} кг` : ''} {volume ? `| Об'єм: ${volume} м³` : ''}</p>
        )}

        {(warehouse || driver) && (
          <p>ℹ️ {warehouse ? `Склад: ${warehouse}` : ''} {driver ? `| Водій: ${driver}` : ''}</p>
        )}

        {boCode && (
          <p>🏢 <strong>Код БО:</strong> {boCode}</p>
        )}

        {fullAddress !== 'Адрес не указан' && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
            target="_blank"
            rel="noreferrer"
            className="btn-map"
          >
            🗺️ Открыть карту
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="container">
      <header className="header">
        <h1>🚚 Маршруты доставки</h1>
      </header>

      <div className="vehicle-selector">
        {vehicles.map((v) => (
          <button
            key={v}
            className={`btn-vehicle ${selectedVehicle === v ? 'active' : ''}`}
            onClick={() => handleSelectVehicle(v)}
          >
            🚗 {v}
          </button>
        ))}

        <button
          className={`btn-vehicle btn-search-tab ${selectedVehicle === 'SEARCH' ? 'active' : ''}`}
          onClick={() => handleSelectVehicle('SEARCH')}
        >
          🔍 Поиск по документу
        </button>
      </div>

      {selectedVehicle === 'SEARCH' && (
        <div className="search-section">
          <input
            type="text"
            className="search-input"
            placeholder="Введите № документа, адрес, город..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />

          <div className="points-list">
            {searchQuery.trim() !== '' && filteredPoints.length === 0 && (
              <div className="no-results">Ничего не найдено по запросу "{searchQuery}"</div>
            )}

            {filteredPoints.map((point, idx) => renderCard(point, idx, true))}
          </div>
        </div>
      )}

      {selectedVehicle && selectedVehicle !== 'SEARCH' && routes[selectedVehicle] && (
        <div className="points-list">
          <h2>Маршрут: {selectedVehicle} ({routes[selectedVehicle].length} точек)</h2>
          {routes[selectedVehicle].map((point, idx) => renderCard(point, idx, false))}
        </div>
      )}
    </div>
  );
}

export default App;