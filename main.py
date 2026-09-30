import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'https://logistics-backend-3vj1.onrender.com';

// Функция для универсального поиска значения по нескольким вариациям ключей
const getFieldValue = (row, possibleKeys) => {
  for (const key of Object.keys(row)) {
    const cleanKey = key.trim().toLowerCase();
    if (possibleKeys.some((p) => cleanKey.includes(p))) {
      return row[key];
    }
  }
  return '';
};

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

  // Сбор всех точек для глобального поиска
  const allPoints = [];
  Object.entries(routes).forEach(([vehicle, points]) => {
    points.forEach((point) => {
      allPoints.push({ ...point, _vehicle: vehicle });
    });
  });

  // Поиск по всем полям строки
  const filteredPoints = searchQuery.trim() === '' 
    ? [] 
    : allPoints.filter((point) => {
        const query = searchQuery.toLowerCase().trim();
        // Проверяем все значения в объекте строки
        return Object.values(point).some((val) =>
          String(val).toLowerCase().includes(query)
        );
      });

  // Вспомогательная функция для отображения карточки
  const renderCard = (point, idx, showVehicleBadge = false) => {
    const client = getFieldValue(point, ['клиент', 'получатель', 'название', 'фирма', 'заказчик']) || 'Клиент не указан';
    const address = getFieldValue(point, ['адрес', 'город', 'куда', 'доставка', 'точка']) || 'Адрес не указан';
    const phone = getFieldValue(point, ['телефон', 'тел', 'контакт', 'мобильный']);
    const doc = getFieldValue(point, ['док', 'ттн', '№', 'накладная', 'номер', 'заказ']);
    const specs = getFieldValue(point, ['груз', 'вес', 'объем', 'примечание', 'комментарий', 'товар']);

    // Сбор всех остальных колонок, которые не попали в основные
    const extraEntries = Object.entries(point).filter(([k]) => {
      if (k.startsWith('_')) return false;
      const lk = k.toLowerCase();
      return !['клиент', 'получатель', 'адрес', 'город', 'телефон', 'тел', 'док', 'ттн', 'накладная', 'авто', 'машина'].some(p => lk.includes(p));
    });

    return (
      <div key={idx} className="card">
        <div className="card-header">
          {showVehicleBadge ? (
            <span className="badge-vehicle">🚗 {point._vehicle}</span>
          ) : (
            <span className="point-number">#{idx + 1}</span>
          )}
          {doc && <span className="doc-num">📄 Док: {doc}</span>}
        </div>

        <h3>{client}</h3>
        <p>📍 <strong>Адрес:</strong> {address}</p>
        
        {phone && (
          <p>📞 <strong>Тел:</strong> <a href={`tel:${phone}`}>{phone}</a></p>
        )}
        
        {specs && (
          <p>📦 <strong>Детали:</strong> {specs}</p>
        )}

        {/* Дополнительные поля из таблицы, если есть */}
        {extraEntries.length > 0 && (
          <div className="extra-info">
            {extraEntries.map(([k, v]) => v ? (
              <p key={k} className="extra-item">
                <small><strong>{k}:</strong> {String(v)}</small>
              </p>
            ) : null)}
          </div>
        )}

        {address && address !== 'Адрес не указан' && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
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

      {/* Кнопки автомобилей + поиск */}
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
            placeholder="Введите № документа, ТТН, адрес или клиента..."
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

      {/* РЕЖИМ ПРОСМОТРА МАШИНЫ */}
      {selectedVehicle && selectedVehicle !== 'SEARCH' && (
        <div className="points-list">
          <h2>Маршрут: {selectedVehicle}</h2>
          {routes[selectedVehicle]?.map((point, idx) => renderCard(point, idx, false))}
        </div>
      )}
    </div>
  );
}

export default App;