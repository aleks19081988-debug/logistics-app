import React, { useState, useEffect } from 'react';

const API_URL = 'https://fluffy-spork-5vrp4qpjwx4r3v95q-8000.app.github.dev';

function App() {
  const [routes, setRoutes] = useState({});
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/routes-by-vehicle`)
      .then((res) => res.json())
      .then((data) => {
        setRoutes(data || {});
        setLoading(false);
      })
      .catch((err) => {
        console.error('Ошибка загрузки данных:', err);
        setLoading(false);
      });
  }, []);

  const openInGoogleMaps = (point) => {
    const city = point['Факт.Місто доставки'] || '';
    const street = point['Вулиця'] || '';
    const house = point['№ Будинку'] || '';

    const addressParts = [city, street, house].filter(Boolean);
    const fullAddress = addressParts.join(', ');

    if (!fullAddress.trim()) {
      alert('Адрес не найден в точке доставки');
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>⏳ Загрузка маршрутов...</h2>
      </div>
    );
  }

  const vehicleList = Object.keys(routes);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px', fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
      <header style={{ backgroundColor: '#1e293b', color: '#fff', padding: '16px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>🚚 Логистика: Экран водителя</h1>
      </header>

      {!selectedVehicle ? (
        <div>
          <h3 style={{ color: '#334155' }}>Выберите ваш автомобиль:</h3>
          {vehicleList.length === 0 ? (
            <p>Маршруты не найдены в Google Таблице.</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {vehicleList.map((vehicle) => (
                <button
                  key={vehicle}
                  onClick={() => setSelectedVehicle(vehicle)}
                  style={{
                    padding: '16px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    backgroundColor: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>🚗 {vehicle}</span>
                  <span style={{ fontSize: '14px', backgroundColor: '#0369a1', padding: '4px 8px', borderRadius: '6px' }}>
                    Точек: {routes[vehicle].length}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <button
            onClick={() => setSelectedVehicle('')}
            style={{
              padding: '8px 14px',
              backgroundColor: '#64748b',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              marginBottom: '16px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            ← Сменить авто
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: '#0f172a', margin: 0 }}>Маршрут: {selectedVehicle}</h2>
            {routes[selectedVehicle]?.[0]?.['Водій'] && (
              <span style={{ color: '#475569', fontSize: '14px', fontWeight: 'bold' }}>
                👤 {routes[selectedVehicle][0]['Водій']}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            {routes[selectedVehicle].map((point, index) => {
              const city = point['Факт.Місто доставки'];
              const street = point['Вулиця'];
              const house = point['№ Будинку'];
              const floor = point['Поверх'];
              const district = point['Район міста'] || point['Район області'];
              const orderNo = point['Тр.заявка'] || point['№ док-ту'];
              const weight = point['Вага (кг.)'];
              const volume = point['Об\'єм (м3)'];

              return (
                <div
                  key={index}
                  style={{
                    backgroundColor: '#fff',
                    padding: '16px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                    borderLeft: '6px solid #0284c7',
                  }}
                >
                  {/* Заголовок точки */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '17px', color: '#0284c7' }}>
                      Точка № {index + 1}
                    </span>
                    {orderNo && (
                      <span style={{ fontSize: '13px', backgroundColor: '#e2e8f0', color: '#334155', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                        Заявка: {orderNo}
                      </span>
                    )}
                  </div>

                  {/* Основной адрес */}
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>
                    📍 {city ? `${city}, ` : ''}{street} {house ? `д. ${house}` : ''}
                  </div>

                  {/* Доп детали по адресу и грузу */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '14px', color: '#475569', marginBottom: '12px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                    {floor && <div>🏢 <strong>Этаж:</strong> {floor}</div>}
                    {district && <div>🏙️ <strong>Район:</strong> {district}</div>}
                    {weight && <div>⚖️ <strong>Вес:</strong> {weight} кг</div>}
                    {volume && <div>📦 <strong>Объем:</strong> {volume} м³</div>}
                  </div>

                  {/* Информация о складе/документах */}
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                    {point['Склад'] && <div>🏬 Склад: {point['Склад']}</div>}
                    {point['Код БО'] && <div>🔢 Код БО: {point['Код БО']}</div>}
                  </div>

                  {/* Кнопка навигации */}
                  <button
                    onClick={() => openInGoogleMaps(point)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#16a34a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    🗺️ Открыть на Google Maps
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;