import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = "https://your-backend-url.onrender.com"; 

function App() {
  const [routes, setRoutes] = useState({});
  const [loading, setLoading] = useState(true);
  const [authRole, setAuthRole] = useState(localStorage.getItem('vegtam_role') || null);
  
  // Модальные окна
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docDetails, setDocDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleData, setScheduleData] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [contactsData, setContactsData] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

  // Статистика доставок
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = () => {
    setLoading(true);
    fetch(`${API_URL}/api/routes-by-vehicle`)
      .then(res => res.json())
      .then(data => {
        setRoutes(data || {});
        setLoading(false);
      })
      .catch(err => {
        console.error("Ошибка загрузки маршрутов:", err);
        setLoading(false);
      });
  };

  const handleLogin = () => {
    const pass = prompt("Введіть пароль адміністратора:");
    if (pass === "1234") {
      setAuthRole('ADMIN');
      localStorage.setItem('vegtam_role', 'ADMIN');
      alert("Авторизовано як Адміністратор!");
    } else if (pass !== null) {
      alert("Невірний пароль!");
    }
  };

  const handleLogout = () => {
    setAuthRole(null);
    localStorage.removeItem('vegtam_role');
  };

  const openDocDetails = (docId) => {
    setSelectedDoc(docId);
    setDetailsLoading(true);
    fetch(`${API_URL}/api/delivery-details/${docId}`)
      .then(res => res.json())
      .then(data => {
        setDocDetails(data.items || []);
        setDetailsLoading(false);
      })
      .catch(err => {
        console.error("Ошибка загрузки деталей:", err);
        setDetailsLoading(false);
      });
  };

  const fetchSchedule = () => {
    setScheduleLoading(true);
    setIsScheduleOpen(true);
    fetch(`${API_URL}/api/month-schedule`)
      .then(res => res.json())
      .then(data => {
        setScheduleData(data);
        setScheduleLoading(false);
      })
      .catch(err => {
        console.error("Ошибка загрузки графика:", err);
        setScheduleLoading(false);
      });
  };

  const fetchContacts = () => {
    setContactsLoading(true);
    setIsContactsOpen(true);
    fetch(`${API_URL}/api/tt-contacts`)
      .then(res => res.json())
      .then(data => {
        setContactsData(data.contacts || []);
        setContactsLoading(false);
      })
      .catch(err => {
        console.error("Ошибка загрузки контактов:", err);
        setContactsLoading(false);
      });
  };

  const fetchStatistics = () => {
    setStatsLoading(true);
    setIsStatsOpen(true);
    fetch(`${API_URL}/api/statistics/deliveries-by-vehicle`)
      .then(res => res.json())
      .then(data => {
        setStatsData(data.stats || {});
        setStatsLoading(false);
      })
      .catch(err => {
        console.error("Ошибка загрузки статистики:", err);
        setStatsLoading(false);
      });
  };

  const filteredContacts = contactsData.filter(c => 
    (c.ttName && c.ttName.toLowerCase().includes(contactSearch.toLowerCase())) ||
    (c.address && c.address.toLowerCase().includes(contactSearch.toLowerCase())) ||
    (c.phone && c.phone.includes(contactSearch))
  );

  return (
    <div className="App" style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', paddingBottom: '40px' }}>
      
      {/* Шапка приложения */}
      <header style={{ backgroundColor: '#1e293b', color: '#fff', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>🚚 VEGTAM LOGISTICS</h2>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={fetchSchedule}
            style={{ backgroundColor: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            📅 Графік роботи
          </button>

          <button 
            onClick={fetchContacts}
            style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            📇 Контакти ТТ
          </button>

          {authRole === 'ADMIN' && (
            <button 
              onClick={fetchStatistics}
              style={{ backgroundColor: '#fd7e14', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              📊 Статистика
            </button>
          )}

          {authRole === 'ADMIN' ? (
            <button 
              onClick={handleLogout}
              style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Вийти (Адмін)
            </button>
          ) : (
            <button 
              onClick={handleLogin}
              style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              🔒 Увійти
            </button>
          )}
        </div>
      </header>

      {/* Основной контент */}
      <main style={{ maxWidth: '1200px', margin: '20px auto', padding: '0 15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#334155' }}>Маршрути за автомобілями</h3>
          <button onClick={fetchRoutes} style={{ padding: '6px 14px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            🔄 Оновити
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Завантаження маршрутів...</div>
        ) : Object.keys(routes).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Актуальних маршрутів не знайдено.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {Object.entries(routes).map(([vehicle, rows]) => (
              <div key={vehicle} style={{ backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '15px', borderTop: '4px solid #3b82f6' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>🚗 {vehicle}</span>
                  <span style={{ fontSize: '12px', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '10px' }}>{rows.length} точок</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {rows.map((row, idx) => (
                    <div key={idx} style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong>Док: 
                          <span 
                            onClick={() => openDocDetails(row['№ док-ту'] || row['№ док'])} 
                            style={{ color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', marginLeft: '4px' }}
                          >
                            {row['№ док-ту'] || row['№ док'] || '—'}
                          </span>
                        </strong>
                        <span style={{ color: '#64748b' }}>{row['Звідки'] || row['Склад'] || ''}</span>
                      </div>
                      <div style={{ color: '#334155' }}>
                        📍 <strong>Куди:</strong> {[row['Факт.місто доставки'], row['Вулиця'], row['№ будинку']].filter(Boolean).join(', ') || '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Модальное окно: Детали документа */}
      {selectedDoc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '10px', width: '100%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>Деталі документа № {selectedDoc}</h3>
              <button onClick={() => setSelectedDoc(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✖</button>
            </div>

            {detailsLoading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Завантаження товару...</div>
            ) : docDetails.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '8px', borderBottom: '1px solid #cbd5e1' }}>Найменування</th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #cbd5e1' }}>К-сть</th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #cbd5e1' }}>Сума</th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #cbd5e1' }}>Отримувач</th>
                  </tr>
                </thead>
                <tbody>
                  {docDetails.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px' }}>{item.name}</td>
                      <td style={{ padding: '8px' }}>{item.quantity}</td>
                      <td style={{ padding: '8px' }}>{item.price} грн</td>
                      <td style={{ padding: '8px' }}>{item.recipient}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Товари не знайдено для цього документа.</div>
            )}

            <button onClick={() => setSelectedDoc(null)} style={{ width: '100%', marginTop: '20px', padding: '10px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              Закрити
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно: График работы */}
      {isScheduleOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '10px', width: '100%', maxWidth: '550px', maxHeight: '85vh', overflowY: 'auto', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>📅 Графік роботи на завтра ({scheduleData?.date || ''})</h3>
              <button onClick={() => setIsScheduleOpen(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✖</button>
            </div>

            {scheduleLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Читання графіку з таблиці...</div>
            ) : scheduleData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <h4 style={{ color: '#0369a1', margin: '0 0 8px 0' }}>🚗 Водії ({scheduleData.drivers?.length || 0})</h4>
                  {scheduleData.drivers?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {scheduleData.drivers.map((d, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px' }}>
                          <span>👤 {d.fio}</span>
                          <strong style={{ color: '#2563eb' }}>{d.auto || 'Без авто'}</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '13px' }}>Немає працюючих водіїв на завтра.</div>
                  )}
                </div>

                <div>
                  <h4 style={{ color: '#047857', margin: '0 0 8px 0' }}>📦 Експедитори ({scheduleData.expeditors?.length || 0})</h4>
                  {scheduleData.expeditors?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {scheduleData.expeditors.map((e, idx) => (
                        <div key={idx} style={{ backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px' }}>
                          <span>👤 {e.fio}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '13px' }}>Немає працюючих експедиторів на завтра.</div>
                  )}
                </div>
              </div>
            ) : null}

            <button onClick={() => setIsScheduleOpen(false)} style={{ width: '100%', marginTop: '20px', padding: '10px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              Закрити
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно: Контакты ТТ */}
      {isContactsOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '10px', width: '100%', maxWidth: '700px', maxHeight: '85vh', overflowY: 'auto', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>📇 Довідник контактів ТТ</h3>
              <button onClick={() => setIsContactsOpen(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✖</button>
            </div>

            <input 
              type="text" 
              placeholder="🔍 Пошук за назвою ТТ, адресою або телефоном..." 
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '14px' }}
            />

            {contactsLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Завантаження контактів...</div>
            ) : filteredContacts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '50vh', overflowY: 'auto' }}>
                {filteredContacts.map((c, i) => (
                  <div key={i} style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                    <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '14px', marginBottom: '4px' }}>{c.ttName || 'Без назви ТТ'}</div>
                    <div style={{ color: '#475569', marginBottom: '2px' }}>📍 <strong>Адреса:</strong> {c.address || '—'}</div>
                    <div style={{ color: '#475569', marginBottom: '2px' }}>👤 <strong>Контакт:</strong> {c.name || '—'} {c.position ? `(${c.position})` : ''}</div>
                    <div style={{ color: '#2563eb' }}>📞 <strong>Тел:</strong> <a href={`tel:${c.phone}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{c.phone || '—'}</a></div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Контактів не знайдено.</div>
            )}

            <button onClick={() => setIsContactsOpen(false)} style={{ width: '100%', marginTop: '20px', padding: '10px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              Закрити
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно: Статистика доставок */}
      {isStatsOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '10px', width: '100%', maxWidth: '650px', maxHeight: '85vh', overflowY: 'auto', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>📊 Статистика доставок по авто</h3>
              <button onClick={() => setIsStatsOpen(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✖</button>
            </div>

            {statsLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Розрахунок статистики з архіву...</div>
            ) : statsData && Object.keys(statsData).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '55vh', overflowY: 'auto' }}>
                {Object.entries(statsData).map(([vehicle, months]) => (
                  <div key={vehicle} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', backgroundColor: '#f8fafc' }}>
                    <div style={{ fontWeight: 'bold', color: '#2563eb', fontSize: '15px', marginBottom: '8px' }}>
                      🚗 {vehicle}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {Object.entries(months).map(([month, count]) => (
                        <div key={month} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                          <span style={{ color: '#475569' }}>📅 Місяць ({month}):</span>
                          <strong style={{ color: '#16a34a' }}>{count} доставок</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>В архіві поки немає даних для статистики.</div>
            )}

            <button onClick={() => setIsStatsOpen(false)} style={{ width: '100%', marginTop: '20px', padding: '10px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              Закрити
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;