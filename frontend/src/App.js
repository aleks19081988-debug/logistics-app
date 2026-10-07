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

  // Вспомогательная функция для извлечения значений из полей карточки
  const getValFromPoint = (point, possibleNames) => {
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

  // Функция сортировки точек маршрута по Коду БО
  const getSortedPoints = (pointsArray) => {
    if (!Array.isArray(pointsArray)) return [];
    
    return [...pointsArray].sort((a, b) => {
      const boA = getValFromPoint(a, ['код бо', 'кодбо', 'код б.о.', 'бо']);
      const boB = getValFromPoint(b, ['код бо', 'кодбо', 'код б.о.', 'бо']);

      if (!boA && !boB) return 0;
      if (!boA) return 1;
      if (!boB) return -1;

      return boA.localeCompare(boB, undefined, { numeric: true, sensitivity: 'base' });
    });
  };

  // Вспомогательная функция парсинга числовых значений
  const parseNum = (strVal) => {
    if (!strVal) return 0;
    const cleaned = String(strVal).replace(',', '.').replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Подсчёт итоговых показателей
  const calculateTotals = (pointsArray) => {
    if (!Array.isArray(pointsArray)) return { count: 0, weight: 0, volume: 0 };
    
    let totalWeight = 0;
    let totalVolume = 0;

    pointsArray.forEach((point) => {
      const weightStr = getValFromPoint(point, ['вага']);
      const volumeStr = getValFromPoint(point, ['об\'єм', 'обем', 'объем']);

      totalWeight += parseNum(weightStr);
      totalVolume += parseNum(volumeStr);
    });

    return {
      count: pointsArray.length,
      weight: Math.round(totalWeight * 100) / 100,
      volume: Math.round(totalVolume * 100) / 100,
    };
  };

  const renderCard = (point, idx, showVehicleBadge = false) => {
    const docNum = getValFromPoint(point, ['№ док-ту', '№ док', 'док-ту', 'номер док']);
    const city = getValFromPoint(point, ['факт.місто доставки', 'місто', 'город']);
    const street = getValFromPoint(point, ['вулиця', 'улица']);
    const house = getValFromPoint(point, ['№ будинку', 'будинок', 'дом']);
    const client = getValFromPoint(point, ['клиент', 'отримувач', 'получатель', 'замовник', 'контрагент', 'фирма']);
    const phone = getValFromPoint(point, ['телефон', 'тел', 'контакт']);
    const weight = getValFromPoint(point, ['вага']);
    const volume = getValFromPoint(point, ['об\'єм', 'обем', 'объем']);
    const warehouse = getValFromPoint(point, ['склад']);
    const driver = getValFromPoint(point, ['водій', 'водитель']);
    const boCode = getValFromPoint(point, ['код бо', 'кодбо', 'код б.о.', 'бо']);
    
    const payment = getValFromPoint(point, ['оплата']);
    const note = getValFromPoint(point, ['примітка', 'примечание', 'примитка']);

    // Строгая проверка полей
    const noteLower = String(note).toLowerCase();
    const paymentLower = String(payment).toLowerCase();

    // 1. Проверяем наличие Pick-Up
    const hasPickup = noteLower.includes('pick-up') || noteLower.includes('pickup');

    // 2. Исключаем безнал, карты и б/готівка
    const isNonCash = paymentLower.includes('б/г') || 
                      paymentLower.includes('б/готівк') || 
                      paymentLower.includes('безгот') || 
                      paymentLower.includes('картк') || 
                      paymentLower.includes('карта');

    // 3. Подтверждаем чистый наличный расчет
    const isCash = (paymentLower.includes('готівк') || paymentLower.includes('налич')) && !isNonCash;

    const isPickupCash = hasPickup && isCash;

    const addressParts = [city, street, house ? `д. ${house}` : ''].filter(Boolean);
    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Адрес не указан';

    return (
      <div 
        key={`${point._vehicle || 'v'}-${idx}-${docNum}`} 
        className={`card ${isPickupCash ? 'card-pickup-cash' : ''}`}
      >
        {isPickupCash && (
          <div className="pickup-banner">
            💵 PICK-UP (ГОТІВКОВИЙ)
          </div>
        )}

        <div className="card-header">
          {showVehicleBadge ? (
            <span className="badge-vehicle">
              🚗 {point._vehicle === 'Без номера авто' ? (
                'Без номера'
              ) : (
                <span className="license-plate">{point._vehicle}</span>
              )}
            </span>
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

        {/* Вывод строки ТОЛЬКО для подсвеченных блоков Pick-Up + Cash */}
        {isPickupCash && (
          <p>💳 <strong>Оплата:</strong> {payment} {note ? `| Примітка: ${note}` : ''}</p>
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

  const currentPoints = selectedVehicle && selectedVehicle !== 'SEARCH' ? routes[selectedVehicle] || [] : [];
  const sortedCurrentPoints = getSortedPoints(currentPoints);
  const totals = calculateTotals(currentPoints);

  return (
    <div className="container notranslate" translate="no">
      <header className="header">
        <h1>
          <img src="/logo192.png" alt="Icon" className="header-app-icon" onError={(e) => { e.target.src = '/favicon.ico'; }} />
          VEGTAM
        </h1>
      </header>

      <div className="vehicle-selector">
        {vehicles.map((v) => (
          <button
            key={v}
            className={`btn-vehicle ${selectedVehicle === v ? 'active' : ''}`}
            onClick={() => handleSelectVehicle(v)}
          >
            {v === 'Без номера авто' ? (
              <span>🚗 Без номера авто</span>
            ) : (
              <span className="license-plate">{v}</span>
            )}
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
          <div className="search-input-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder="Введите № документа, адрес, город..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button 
                className="btn-clear-search" 
                onClick={() => setSearchQuery('')}
                aria-label="Очистить поиск"
              >
                ✖
              </button>
            )}
          </div>

          <div className="points-list">
            {searchQuery.trim() !== '' && filteredPoints.length === 0 && (
              <div className="no-results">Ничего не найдено по запросу "{searchQuery}"</div>
            )}

            {filteredPoints.map((point, idx) => renderCard(point, idx, true))}
          </div>
        </div>
      )}

      {selectedVehicle && selectedVehicle !== 'SEARCH' && (
        <div className="points-list">
          2
          <h2>
            Маршрут:{' '}
            {selectedVehicle === 'Без номера авто' ? (
              'Без номера авто'
            ) : (
              <span className="license-plate">{selectedVehicle}</span>
            )}
          </h2>

          <div className="summary-card">
            <div className="summary-item">
              <span className="summary-label">📍 Точки</span>
              <span className="summary-value">{totals.count}</span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-item">
              <span className="summary-label">⚖️ Общий вес</span>
              <span className="summary-value">{totals.weight} кг</span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-item">
              <span className="summary-label">📐 Общий объём</span>
              <span className="summary-value">{totals.volume} м³</span>
            </div>
          </div>

          {sortedCurrentPoints.map((point, idx) => renderCard(point, idx, false))}
        </div>
      )}
    </div>
  );
}

export default App;