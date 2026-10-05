import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'https://logistics-backend-3vj1.onrender.com';

function App() {
  const [routes, setRoutes] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = () => {
    setLoading(true);
    fetch(`${API_URL}/api/routes-by-vehicle`)
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

  // Функция переключения авто с гарантированным ререндером
  const handleSelectVehicle = (vehicle) => {
    setSearchQuery('');
    if (selectedVehicle === vehicle) {
      setSelectedVehicle('');
    } else {
      setSelectedVehicle(vehicle);
    }
  };

  if (loading) {
    return <div className="loader">Загрузка маршрутов...</div>;
  }

  const vehicles = Object.keys(routes);

  // Все точки для поиска
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
      for (const key of Object.keys(point)) {
        if (key.startsWith('_')) continue;
        const cleanKey = key.trim().toLowerCase();
        if (possibleNames.some((p) => cleanKey.includes(p.toLowerCase()))) {
          return String(point[key]).trim();
        }
      }
      return '';
    };

    const docNum = getVal(['№ док-ту', 'док-ту', 'док', 'заявка', 'тр.заявка']);
    const city = getVal(['факт.місто доставки', 'місто', 'город']);
    const street = getVal(['вулиця', 'улица']);
    const house = getVal(['№ будинку', 'будинок', 'дом']);
    const client = getVal(['клиент', 'отримувач', 'получатель', 'замовник', 'контрагент', 'фирма']);
    const phone = getVal(['телефон', 'тел', 'контакт']);
    const weight = getVal(['вага']);
    const volume = getVal(['об\'єм', 'обем', 'объем']);
    const warehouse = getVal(['склад']);
    const driver = getVal(['водій', 'водитель']);

    const addressParts = [city, street, house ? `д. ${house}` : ''].filter(Boolean);
    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Адрес не указан';

    return (
      <div key={`${point._vehicle || 'p'}-${idx}`} className="card">
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
        <button className="btn-refresh" onClick={fetchData}>🔄 Обновить</button>
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