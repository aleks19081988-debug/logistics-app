import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'https://logistics-backend-3vj1.onrender.com';

function App() {
  const [routes, setRoutes] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
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
  }, []);

  if (loading) {
    return <div className="loader">Загрузка маршрутов...</div>;
  }

  const vehicles = Object.keys(routes);

  // Сбор всех точек для глобального поиска по документу
  const allPoints = [];
  Object.entries(routes).forEach(([vehicle, points]) => {
    points.forEach((point) => {
      allPoints.push({ ...point, vehicle });
    });
  });

  // Фильтрация по номеру документа / клиенту / адресу
  const filteredPoints = searchQuery.trim() === '' 
    ? [] 
    : allPoints.filter((p) => {
        const query = searchQuery.toLowerCase();
        const doc = String(p.document || p.doc || '').toLowerCase();
        const client = String(p.client || '').toLowerCase();
        const address = String(p.address || '').toLowerCase();
        return doc.includes(query) || client.includes(query) || address.includes(query);
      });

  return (
    <div className="container">
      <header className="header">
        <h1>🚚 Маршруты доставки</h1>
      </header>

      {/* Список кнопок автомобилей + кнопка поиска в конце */}
      <div className="vehicle-selector">
        {vehicles.map((v) => (
          <button
            key={v}
            className={`btn-vehicle ${selectedVehicle === v ? 'active' : ''}`}
            onClick={() => {
              setSelectedVehicle(v);
              setSearchQuery('');
            }}
          >
            🚗 {v}
          </button>
        ))}

        <button
          className={`btn-vehicle btn-search-tab ${selectedVehicle === 'SEARCH' ? 'active' : ''}`}
          onClick={() => {
            setSelectedVehicle('SEARCH');
          }}
        >
          🔍 Поиск по документу
        </button>
      </div>

      {/* РЕЖИМ ПОИСКА */}
      {selectedVehicle === 'SEARCH' && (
        <div className="search-section">
          <input
            type="text"
            className="search-input"
            placeholder="Введите № документа, клиента или адрес..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />

          <div className="points-list">
            {searchQuery.trim() !== '' && filteredPoints.length === 0 && (
              <div className="no-results">Ничего не найдено по запросу "{searchQuery}"</div>
            )}

            {filteredPoints.map((point, idx) => (
              <div key={idx} className="card">
                <div className="card-header">
                  <span className="badge-vehicle">🚗 {point.vehicle}</span>
                  {point.document && <span className="doc-num">📄 Док: {point.document}</span>}
                </div>
                <h3>{point.client || 'Клиент не указан'}</h3>
                <p>📍 <strong>Адрес:</strong> {point.address}</p>
                {point.phone && <p>📞 <strong>Тел:</strong> <a href={`tel:${point.phone}`}>{point.phone}</a></p>}
                {point.specs && <p>📦 <strong>Груз:</strong> {point.specs}</p>}
                
                {point.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(point.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-map"
                  >
                    🗺️ Открыть карту
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* РЕЖИМ ПРОСМОТРА КОНКРЕТНОЙ МАШИНЫ */}
      {selectedVehicle && selectedVehicle !== 'SEARCH' && (
        <div className="points-list">
          <h2>Маршрут: {selectedVehicle}</h2>
          {routes[selectedVehicle]?.map((point, idx) => (
            <div key={idx} className="card">
              <div className="card-header">
                <span className="point-number">#{idx + 1}</span>
                {point.document && <span className="doc-num">📄 {point.document}</span>}
              </div>
              <h3>{point.client || 'Без названия'}</h3>
              <p>📍 <strong>Адрес:</strong> {point.address}</p>
              {point.phone && <p>📞 <strong>Тел:</strong> <a href={`tel:${point.phone}`}>{point.phone}</a></p>}
              {point.specs && <p>📦 <strong>Груз:</strong> {point.specs}</p>}

              {point.address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(point.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-map"
                >
                  🗺️ Открыть карту
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;